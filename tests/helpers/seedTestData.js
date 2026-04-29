const admin = require('firebase-admin');

const projectId = process.env.GCLOUD_PROJECT || 'estilo-da-sorte-5f684';

process.env.GCLOUD_PROJECT = projectId;
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8388';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9399';

admin.initializeApp({ projectId });

const db = admin.firestore();

async function upsertUser({ email, password, nome, tipo }) {
  let authUser;

  try {
    authUser = await admin.auth().getUserByEmail(email);
  } catch (_) {
    authUser = await admin.auth().createUser({ email, password, displayName: nome });
  }

  await db.doc(`usuarios/${authUser.uid}`).set({
    nome,
    email,
    tipo,
    status: 'ativo',
    telefone: '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return authUser.uid;
}

async function seed() {
  const adminId = await upsertUser({ email: 'admin.tests@dev.local', password: '123456', nome: 'Admin Testes', tipo: 'admin' });
  const sellerId = await upsertUser({ email: 'seller.tests@dev.local', password: '123456', nome: 'Seller Testes', tipo: 'vendedor' });
  const clientId = await upsertUser({ email: 'client.tests@dev.local', password: '123456', nome: 'Client Testes', tipo: 'cliente' });
  const client2Id = await upsertUser({ email: 'client2.tests@dev.local', password: '123456', nome: 'Client Dois', tipo: 'cliente' });

  await db.doc('usuarios/' + clientId + '/dadosPrivados/perfil').set({ cpf: '12345678909', cpfMascarado: '123.456.789-09' }, { merge: true });

  await db.doc('sorteios/sorteio-testes').set({
    titulo: 'Sorteio de Testes',
    status: 'aberto',
    statusLegado: 'ativo',
    codigoSorteio: 'SS-2026-TST',
    dataSorteio: admin.firestore.Timestamp.fromDate(new Date('2026-12-01T12:00:00Z')),
    precoPorNumero: 2,
    totalNumeros: 10,
    adminId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await db.doc(`sorteios/sorteio-testes/vendedores/${sellerId}`).set({
    vendedorId: sellerId,
    status: 'ativo',
    nome: 'Seller Testes',
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  for (let i = 1; i <= 10; i += 1) {
    const numero = String(i).padStart(6, '0');
    await db.doc(`sorteios/sorteio-testes/numeros/${numero}`).set({
      numero,
      status: 'disponivel',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  await db.doc('vendas/venda-rules-1').set({
    sorteioId: 'sorteio-testes',
    numero: '000010',
    clienteId: clientId,
    vendedorId: sellerId,
    valor: 2,
    status: 'pendente',
    statusPagamento: 'pendente',
    statusVenda: 'pendente',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await db.doc('sorteios/sorteio-testes/numeros/000010').set({
    numero: '000010',
    status: 'reservado',
    clienteId: clientId,
    vendaId: 'venda-rules-1',
    vendedorId: sellerId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await db.doc('meta/tests').set({
    ready: true,
    adminId,
    sellerId,
    clientId,
    client2Id,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  console.log('Seed de testes pronto.');
}

seed().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
