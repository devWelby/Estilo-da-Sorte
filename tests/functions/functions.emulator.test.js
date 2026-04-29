const { expect } = require('chai');
const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');

const projectId = process.env.GCLOUD_PROJECT || 'estilo-da-sorte-5f684';
const appConfig = {
  apiKey: 'test-api-key',
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  appId: '1:000000000000:web:test'
};

function parseHostPort(value, fallbackHost, fallbackPort) {
  if (!value) return { host: fallbackHost, port: fallbackPort };
  const [host, port] = value.split(':');
  return { host: host || fallbackHost, port: Number(port || fallbackPort) };
}

const authHost = parseHostPort(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1', 9399);
const functionsHost = parseHostPort(process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST, '127.0.0.1', 5301);

function getClient() {
  const app = initializeApp(appConfig, `tests-${Date.now()}-${Math.random()}`);
  const auth = getAuth(app);
  const functions = getFunctions(app, 'us-central1');

  connectAuthEmulator(auth, `http://${authHost.host}:${authHost.port}`, { disableWarnings: true });
  connectFunctionsEmulator(functions, functionsHost.host, functionsHost.port);

  return { auth, functions };
}

async function signInSellerAndGetFunctions() {
  const { auth, functions } = getClient();
  await signInWithEmailAndPassword(auth, 'seller.tests@dev.local', '123456');
  return { auth, functions };
}

async function signInAdminAndGetFunctions() {
  const { auth, functions } = getClient();
  await signInWithEmailAndPassword(auth, 'admin.tests@dev.local', '123456');
  return { auth, functions };
}

async function getFirstClientId(functions) {
  const listarClientes = httpsCallable(functions, 'listarClientes');
  const result = await listarClientes();
  const list = result.data?.clientes || [];
  expect(list.length).to.be.greaterThan(0);
  return list[0].id;
}

describe('Cloud Functions (Emulator)', function () {
  this.timeout(30000);

  it('criarCliente cria cliente sem derrubar sessao do vendedor', async () => {
    const { functions } = await signInSellerAndGetFunctions();

    const criarCliente = httpsCallable(functions, 'criarCliente');
    const result = await criarCliente({
      nome: 'Cliente Func Test',
      email: `cliente.func.${Date.now()}@dev.local`,
      cpf: '39053344705',
      telefone: '85999999999'
    });

    expect(result.data).to.have.property('uid');
    expect(result.data).to.have.property('senhaEnviada', true);
    expect(result.data).to.not.have.property('senhaInicial');
  });

  it('aplica rate limit em criarCliente', async () => {
    const { functions } = await signInSellerAndGetFunctions();
    const criarCliente = httpsCallable(functions, 'criarCliente');

    let throttled = false;
    for (let i = 0; i < 15; i += 1) {
      try {
        await criarCliente({
          nome: `Cliente RL ${Date.now()}-${i}`,
          email: `cliente.rl.${Date.now()}.${i}@dev.local`,
          cpf: '39053344705',
          telefone: '85999999999'
        });
      } catch (error) {
        const code = String(error?.code || '');
        const message = String(error?.message || '');
        if (code.includes('resource-exhausted') || message.includes('resource-exhausted')) {
          throttled = true;
          break;
        }
      }
    }

    expect(throttled).to.equal(true);
  });

  it('bloqueia corrida de duas vendas no mesmo numero', async () => {
    const { functions } = await signInSellerAndGetFunctions();
    const clienteId = await getFirstClientId(functions);

    const criarVenda = httpsCallable(functions, 'criarVenda');

    const payload = {
      sorteioId: 'sorteio-testes',
      numero: '000001',
      clienteId,
      valor: 2
    };

    const run1 = criarVenda(payload);
    const run2 = criarVenda(payload);

    const results = await Promise.allSettled([run1, run2]);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    expect(ok).to.equal(1);
    expect(failed).to.equal(1);
  });

  it('nao permite transicao invalida de pagamento', async () => {
    const { functions } = await signInSellerAndGetFunctions();
    const clienteId = await getFirstClientId(functions);

    const criarVenda = httpsCallable(functions, 'criarVenda');
    const confirmarPagamento = httpsCallable(functions, 'confirmarPagamento');
    const cancelarVenda = httpsCallable(functions, 'cancelarVenda');

    const created = await criarVenda({
      sorteioId: 'sorteio-testes',
      numero: '000002',
      clienteId,
      valor: 2
    });

    await confirmarPagamento({ vendaId: created.data.vendaId });

    let failed = false;
    try {
      await cancelarVenda({ vendaId: created.data.vendaId });
    } catch (_) {
      failed = true;
    }

    expect(failed).to.equal(true);
  });

  it('confirmarPagamento e idempotente em chamadas repetidas', async () => {
    const { functions } = await signInSellerAndGetFunctions();
    const clienteId = await getFirstClientId(functions);
    const criarVenda = httpsCallable(functions, 'criarVenda');
    const confirmarPagamento = httpsCallable(functions, 'confirmarPagamento');

    const created = await criarVenda({
      sorteioId: 'sorteio-testes',
      numero: '000003',
      clienteId,
      valor: 2
    });

    await confirmarPagamento({ vendaId: created.data.vendaId });
    await confirmarPagamento({ vendaId: created.data.vendaId });
  });

  it('cancelarVenda e idempotente em chamadas repetidas', async () => {
    const { functions } = await signInSellerAndGetFunctions();
    const clienteId = await getFirstClientId(functions);
    const criarVenda = httpsCallable(functions, 'criarVenda');
    const cancelarVenda = httpsCallable(functions, 'cancelarVenda');

    const created = await criarVenda({
      sorteioId: 'sorteio-testes',
      numero: '000004',
      clienteId,
      valor: 2
    });

    await cancelarVenda({ vendaId: created.data.vendaId, motivo: ' teste  cancelamento  ' });
    await cancelarVenda({ vendaId: created.data.vendaId, motivo: ' cancelamento repetido ' });
  });

  it('realizarSorteio bloqueia execucao antes da data sem override', async () => {
    const { functions: sellerFunctions } = await signInSellerAndGetFunctions();
    const clienteId = await getFirstClientId(sellerFunctions);
    const criarVenda = httpsCallable(sellerFunctions, 'criarVenda');
    const confirmarPagamento = httpsCallable(sellerFunctions, 'confirmarPagamento');

    const created = await criarVenda({
      sorteioId: 'sorteio-testes',
      numero: '000005',
      clienteId,
      valor: 2
    });
    await confirmarPagamento({ vendaId: created.data.vendaId });

    const { functions: adminFunctions } = await signInAdminAndGetFunctions();
    const realizarSorteio = httpsCallable(adminFunctions, 'realizarSorteio');

    let blocked = false;
    try {
      await realizarSorteio({ sorteioId: 'sorteio-testes' });
    } catch (error) {
      const message = String(error?.message || '');
      blocked = message.includes('Data do sorteio ainda nao foi atingida');
    }

    expect(blocked).to.equal(true);
  });
});
