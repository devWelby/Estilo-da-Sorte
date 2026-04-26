const admin = require('firebase-admin');

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'estilo-da-sorte-5f684';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8180';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9199';

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const users = [
  { email: 'admin@dev.local', password: '123456', nome: 'Administrador Dev', tipo: 'admin' },
  { email: 'vendedor@dev.local', password: '123456', nome: 'Iris Vendedora', tipo: 'vendedor', codigo: 'L020 (100)', totalRecebido: 300, totalVendido: 0 },
  { email: 'cliente@dev.local', password: '123456', nome: 'Alan Gesso', tipo: 'cliente', cpf: '00000012345', telefone: '(00) 90000-0000' }
];

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
      cpf: user.cpf || '',
      telefone: user.telefone || '',
      codigo: user.codigo || '',
      totalRecebido: user.totalRecebido || 0,
      totalVendido: user.totalVendido || 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }
  return ids;
}

async function seedLottery(id, payload, totalNumbers = 300) {
  const ref = db.doc(`sorteios/${id}`);
  await ref.set({
    ...payload,
    metricas: payload.metricas || {
      distribuidos: totalNumbers,
      vendidos: 0,
      pagos: 0,
      pendentes: 0,
      valorPago: 0,
      valorPendente: 0
    },
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  }, { merge: true });

  let batch = db.batch();
  let count = 0;
  for (let i = 1; i <= totalNumbers; i += 1) {
    const numero = String(i).padStart(6, '0');
    batch.set(ref.collection('numeros').doc(numero), {
      status: 'disponivel',
      sorteioId: id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    count += 1;
    if (count % 400 === 0) {
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
    status: 'vendido',
    clienteId: ids.cliente,
    vendedorId: ids.vendedor,
    sorteioId: 'sorteio-2026-04-16',
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  await lotteryRef.set({
    resultado: {
      numero: '763587',
      ganhadorNome: 'Alan Gesso',
      vendedorNome: 'Iris',
      createdAt: FieldValue.serverTimestamp()
    }
  }, { merge: true });
}

async function main() {
  const ids = await seedUsers();

  await seedLottery('sorteio-2026-04-18', {
    dataSorteio: brDate(18, 4, 2026),
    dataSorteioText: '18/04/2026',
    premioPrincipal: 'Pop 2022',
    premioDinheiro: 10000,
    valorBilhete: 2,
    chances: 20,
    status: 'ativo',
    vendasAtivas: true,
    metricas: {
      distribuidos: 25000,
      vendidos: 18456,
      pagos: 18456,
      pendentes: 0,
      valorPago: 36912,
      valorPendente: 0
    }
  }, 500);

  await seedLottery('sorteio-2026-04-16', {
    dataSorteio: brDate(16, 4, 2026),
    dataSorteioText: '16/04/2026',
    premioPrincipal: '',
    premioDinheiro: 2500,
    valorBilhete: 2,
    chances: 20,
    status: 'finalizado',
    vendasAtivas: false,
    metricas: { distribuidos: 25000, vendidos: 18456, pagos: 18456, pendentes: 0, valorPago: 36912, valorPendente: 0 }
  }, 50);

  await seedLottery('sorteio-2026-04-14', {
    dataSorteio: brDate(14, 4, 2026),
    dataSorteioText: '14/04/2026',
    premioPrincipal: '',
    premioDinheiro: 3000,
    valorBilhete: 2,
    chances: 20,
    status: 'finalizado',
    vendasAtivas: false,
    resultado: { numero: '967932', ganhadorNome: 'Cliente Exemplo', vendedorNome: 'Iris' },
    metricas: { distribuidos: 25000, vendidos: 10000, pagos: 10000, pendentes: 0, valorPago: 20000, valorPendente: 0 }
  }, 50);

  await seedLottery('sorteio-2026-04-11', {
    dataSorteio: brDate(11, 4, 2026),
    dataSorteioText: '11/04/2026',
    premioPrincipal: 'Honda Bros 2022',
    premioDinheiro: 0,
    valorBilhete: 2,
    chances: 20,
    status: 'inativo',
    vendasAtivas: false
  }, 50);

  await seedResults(ids);

  console.log('Seed concluído.');
  console.log('Admin: admin@dev.local / 123456');
  console.log('Vendedor: vendedor@dev.local / 123456');
  console.log('Cliente: cliente@dev.local / 123456');
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
