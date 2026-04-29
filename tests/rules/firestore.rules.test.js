const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} = require('@firebase/rules-unit-testing');
const {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collectionGroup,
  query,
  where,
  getDocs
} = require('firebase/firestore');

function parseHostPort(value, fallbackHost, fallbackPort) {
  if (!value) return { host: fallbackHost, port: fallbackPort };
  const [host, port] = value.split(':');
  return { host: host || fallbackHost, port: Number(port || fallbackPort) };
}

describe('Firestore Rules', function () {
  this.timeout(20000);

  const projectId = process.env.GCLOUD_PROJECT || 'estilo-da-sorte-5f684';
  let testEnv;

  before(async () => {
    const rules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8');
    const firestoreHost = parseHostPort(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1', 8388);

    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: firestoreHost.host,
        port: firestoreHost.port,
        rules
      }
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      await setDoc(doc(db, 'usuarios/admin-1'), { nome: 'Admin', tipo: 'admin', email: 'admin@test.local', status: 'ativo' });
      await setDoc(doc(db, 'usuarios/seller-1'), { nome: 'Seller', tipo: 'vendedor', email: 'seller@test.local', status: 'ativo' });
      await setDoc(doc(db, 'usuarios/client-1'), { nome: 'Client', tipo: 'cliente', email: 'client@test.local', status: 'ativo' });
      await setDoc(doc(db, 'usuarios/client-2'), { nome: 'Client 2', tipo: 'cliente', email: 'client2@test.local', status: 'ativo' });

      await setDoc(doc(db, 'usuarios/client-1/dadosPrivados/perfil'), { cpf: '12345678909' });

      await setDoc(doc(db, 'sorteios/s1'), { status: 'aberto' });
      await setDoc(doc(db, 'sorteios/s1/numeros/000001'), { numero: '000001', status: 'vendido', clienteId: 'client-1' });
      await setDoc(doc(db, 'sorteios/s1/numeros/000002'), { numero: '000002', status: 'disponivel' });

      await setDoc(doc(db, 'vendas/v1'), {
        sorteioId: 's1',
        numero: '000001',
        clienteId: 'client-1',
        vendedorId: 'seller-1',
        valor: 2,
        status: 'pendente',
        statusPagamento: 'pendente'
      });

      await setDoc(doc(db, 'vendas/v2'), {
        sorteioId: 's1',
        numero: '000002',
        clienteId: 'client-1',
        vendedorId: 'seller-1',
        valor: 2,
        status: 'pago',
        statusPagamento: 'pago'
      });
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it('permite usuario ler o proprio perfil', async () => {
    const db = testEnv.authenticatedContext('client-1').firestore();
    await assertSucceeds(getDoc(doc(db, 'usuarios/client-1')));
  });

  it('bloqueia vendedor de ler dados privados de cliente', async () => {
    const db = testEnv.authenticatedContext('seller-1').firestore();
    await assertFails(getDoc(doc(db, 'usuarios/client-1/dadosPrivados/perfil')));
  });

  it('permite admin ler dados privados', async () => {
    const db = testEnv.authenticatedContext('admin-1').firestore();
    await assertSucceeds(getDoc(doc(db, 'usuarios/client-1/dadosPrivados/perfil')));
  });

  it('permite cliente consultar apenas seus numeros em collectionGroup', async () => {
    const db = testEnv.authenticatedContext('client-1').firestore();
    const q = query(collectionGroup(db, 'numeros'), where('clienteId', '==', 'client-1'));
    const result = await assertSucceeds(getDocs(q));
    expect(result.size).to.equal(1);
  });

  it('permite vendedor ler disponibilidade ampla de numeros', async () => {
    const db = testEnv.authenticatedContext('seller-1').firestore();
    await assertSucceeds(getDoc(doc(db, 'sorteios/s1/numeros/000002')));
  });

  it('permite transicao pendente -> pago para vendedor dono da venda', async () => {
    const db = testEnv.authenticatedContext('seller-1').firestore();
    await assertFails(updateDoc(doc(db, 'vendas/v1'), { status: 'pago', statusPagamento: 'pago', statusVenda: 'confirmada' }));
  });

  it('bloqueia alteracao direta de campos financeiros em venda', async () => {
    const db = testEnv.authenticatedContext('seller-1').firestore();
    await assertFails(updateDoc(doc(db, 'vendas/v2'), { valor: 9999, valorTotal: 9999 }));
  });

  it('bloqueia criacao direta de venda pelo cliente SDK', async () => {
    const db = testEnv.authenticatedContext('seller-1').firestore();
    await assertFails(setDoc(doc(db, 'vendas/v3'), {
      sorteioId: 's1',
      numero: '000003',
      clienteId: 'client-1',
      vendedorId: 'seller-1',
      valor: 2,
      status: 'pendente',
      statusPagamento: 'pendente'
    }));
  });
});
