const admin = require('firebase-admin');

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'estilo-da-sorte-5f684';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8180';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9199';

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const users = [
  { email: 'admin@dev.local', password: '123456', nome: 'Administrador Dev', tipo: 'admin' },
  { email: 'vendedor@dev.local', password: '123456', nome: 'Iris Vendedora', tipo: 'vendedor' },
  { email: 'cliente@dev.local', password: '123456', nome: 'Alan Gesso', tipo: 'cliente', cpf: '00000012345', telefone: '(00) 90000-0000' }
];

function nowStamp() {
  const serverNow = FieldValue.serverTimestamp();
  return {
    criadoEm: serverNow,
    atualizadoEm: serverNow,
    createdAt: serverNow,
    updatedAt: serverNow
  };
}

async function upsertAuthUser(user) {
  try {
    return await admin.auth().getUserByEmail(user.email);
  } catch (_) {
    return admin.auth().createUser({ email: user.email, password: user.password, displayName: user.nome });
  }
}

function brDate(day, month, year) {
  return admin.firestore.Timestamp.fromDate(new Date(year, month - 1, day, 12, 0, 0));
}

async function seedUsers() {
  const ids = {};

  for (const user of users) {
    const authUser = await upsertAuthUser(user);
    ids[user.tipo] = authUser.uid;

    await db.doc(`usuarios/${authUser.uid}`).set({
      nome: user.nome,
      email: user.email,
      tipo: user.tipo,
      status: 'ativo',
      telefone: user.telefone || '',
      totalVendas: 0,
      avatarUrl: '',
      ...nowStamp()
    }, { merge: true });

    if (user.cpf) {
      await db.doc(`usuarios/${authUser.uid}/dadosPrivados/perfil`).set({
        cpf: user.cpf,
        cpfMascarado: '000.000.123-45',
        telefone: user.telefone || '',
        ...nowStamp()
      }, { merge: true });
    }
  }

  return ids;
}

async function seedLottery(id, payload, totalNumbers = 300) {
  const ref = db.doc(`sorteios/${id}`);
  await ref.set({
    ...payload,
    codigoSorteio: payload.codigoSorteio || `SS-2026-${String(id).slice(-3).toUpperCase()}`,
    statusLegado: payload.status === 'aberto' ? 'ativo' : payload.status,
    totalNumeros: payload.totalNumeros || totalNumbers,
    precoPorNumero: payload.precoPorNumero || payload.valorBilhete || 2,
    metrics: payload.metrics || {
      distribuidos: totalNumbers,
      vendidos: 0,
      pagos: 0,
      pendentes: 0,
      valorPago: 0,
      valorPendente: 0,
      disponiveis: totalNumbers
    },
    metricas: payload.metricas || payload.metrics || {
      distribuidos: totalNumbers,
      vendidos: 0,
      pagos: 0,
      pendentes: 0,
      valorPago: 0,
      valorPendente: 0,
      disponiveis: totalNumbers
    },
    ...nowStamp()
  }, { merge: true });

  let batch = db.batch();
  for (let i = 1; i <= totalNumbers; i += 1) {
    const numero = String(i).padStart(6, '0');
    batch.set(ref.collection('numeros').doc(numero), {
      numero,
      status: 'disponivel',
      sorteioId: id,
      ...nowStamp()
    }, { merge: true });

    if (i % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
}

async function seedResults(ids) {
  const lotteryRef = db.doc('sorteios/sorteio-2026-04-16');
  const numberRef = lotteryRef.collection('numeros').doc('763587');

  await numberRef.set({
    numero: '763587',
    status: 'vendido',
    clienteId: ids.cliente,
    vendedorId: ids.vendedor,
    sorteioId: 'sorteio-2026-04-16',
    ...nowStamp()
  }, { merge: true });

  await lotteryRef.set({
    status: 'finalizado',
    ganhadorId: ids.cliente,
    numeroSorteado: '763587',
    resultado: {
      numero: '763587',
      ganhadorNome: 'Alan Gesso',
      vendedorNome: 'Iris Vendedora',
      timestamp: FieldValue.serverTimestamp()
    }
  }, { merge: true });
}

async function seedSamplePaidSale(ids) {
  const vendaRef = db.doc('vendas/venda-paga-001');
  await vendaRef.set({
    sorteioId: 'sorteio-2026-04-18',
    numero: '000123',
    clienteId: ids.cliente,
    clienteNome: 'Alan Gesso',
    vendedorId: ids.vendedor,
    vendedorNome: 'Iris Vendedora',
    valor: 2,
    quantidade: 1,
    valorUnitario: 2,
    valorTotal: 2,
    status: 'pago',
    statusPagamento: 'pago',
    statusVenda: 'confirmada',
    formaPagamento: 'pix',
    confirmadoEm: FieldValue.serverTimestamp(),
    ...nowStamp()
  }, { merge: true });
}

async function main() {
  const ids = await seedUsers();

  await db.doc('configuracoes/app').set({
    nome: 'Estilo da Sorte',
    ambiente: 'dev',
    ...nowStamp()
  }, { merge: true });
  await db.doc('configuracoes/sorteio_atual').set({
    sorteioId: 'sorteio-2026-04-18',
    ...nowStamp()
  }, { merge: true });
  await db.doc('configuracoes/versao_app').set({
    versaoAtual: '1.0.0',
    urlAtualizacao: '',
    forcarAtualizacao: false,
    ...nowStamp()
  }, { merge: true });
  await db.doc('configuracoes/limites').set({
    expiracaoPendenciaMinutos: 15,
    percentualComissaoPadrao: 0,
    ...nowStamp()
  }, { merge: true });
  await db.doc('configuracoes/versao_banco').set({
    schemaVersion: 2,
    ...nowStamp()
  }, { merge: true });

  await seedLottery('sorteio-2026-04-18', {
    titulo: 'Sorteio 18/04/2026',
    dataSorteio: brDate(18, 4, 2026),
    dataSorteioText: '18/04/2026',
    premioPrincipal: 'Pop 2022',
    premioDinheiro: 10000,
    valorBilhete: 2,
    chances: 20,
    status: 'aberto',
    vendasAtivas: true,
    adminId: ids.admin,
    metrics: {
      distribuidos: 500,
      vendidos: 1,
      pagos: 1,
      pendentes: 0,
      valorPago: 2,
      valorPendente: 0,
      disponiveis: 499
    }
  }, 500);

  await seedLottery('sorteio-2026-04-16', {
    titulo: 'Sorteio 16/04/2026',
    dataSorteio: brDate(16, 4, 2026),
    dataSorteioText: '16/04/2026',
    premioPrincipal: '',
    premioDinheiro: 2500,
    valorBilhete: 2,
    chances: 20,
    status: 'finalizado',
    vendasAtivas: false,
    adminId: ids.admin
  }, 50);

  await seedLottery('sorteio-2026-04-14', {
    titulo: 'Sorteio 14/04/2026',
    dataSorteio: brDate(14, 4, 2026),
    dataSorteioText: '14/04/2026',
    premioPrincipal: '',
    premioDinheiro: 3000,
    valorBilhete: 2,
    chances: 20,
    status: 'finalizado',
    vendasAtivas: false,
    adminId: ids.admin,
    resultado: { numero: '967932', ganhadorNome: 'Cliente Exemplo', vendedorNome: 'Iris Vendedora' }
  }, 50);

  await seedLottery('sorteio-2026-04-11', {
    titulo: 'Sorteio 11/04/2026',
    dataSorteio: brDate(11, 4, 2026),
    dataSorteioText: '11/04/2026',
    premioPrincipal: 'Honda Bros 2022',
    premioDinheiro: 0,
    valorBilhete: 2,
    chances: 20,
    status: 'cancelado',
    vendasAtivas: false,
    adminId: ids.admin
  }, 50);

  await seedResults(ids);
  await seedSamplePaidSale(ids);

  console.log('Seed concluido.');
  console.log('Admin: admin@dev.local / 123456');
  console.log('Vendedor: vendedor@dev.local / 123456');
  console.log('Cliente: cliente@dev.local / 123456');
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
