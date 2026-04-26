const admin = require('firebase-admin');
const crypto = require('crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

async function getProfile(uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login novamente.');
  const snapshot = await db.doc(`usuarios/${uid}`).get();
  if (!snapshot.exists) throw new HttpsError('permission-denied', 'Perfil não encontrado.');
  return { id: snapshot.id, ...snapshot.data() };
}

async function assertRole(uid, roles) {
  const profile = await getProfile(uid);
  if (!roles.includes(profile.tipo)) {
    throw new HttpsError('permission-denied', 'Você não tem permissão para esta ação.');
  }
  return profile;
}

function audit(tx, payload) {
  const ref = db.collection('auditoria').doc();
  tx.set(ref, {
    ...payload,
    createdAt: FieldValue.serverTimestamp()
  });
}

exports.criarCliente = onCall(async (request) => {
  const caller = await assertRole(request.auth?.uid, ['admin', 'vendedor']);
  const { nome, email, cpf, telefone } = request.data || {};
  const cpfDigits = onlyDigits(cpf);

  if (!nome || !email || cpfDigits.length !== 11) {
    throw new HttpsError('invalid-argument', 'Nome, e-mail e CPF válido são obrigatórios.');
  }

  const senhaInicial = cpfDigits.slice(-6);

  try {
    const user = await admin.auth().createUser({
      email: String(email).trim().toLowerCase(),
      password: senhaInicial,
      displayName: nome
    });

    await db.doc(`usuarios/${user.uid}`).set({
      nome,
      email: String(email).trim().toLowerCase(),
      cpf: cpfDigits,
      telefone: telefone || '',
      tipo: 'cliente',
      criadoPor: caller.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    await db.collection('auditoria').add({
      tipo: 'cliente_criado',
      clienteId: user.uid,
      atorId: caller.id,
      createdAt: FieldValue.serverTimestamp()
    });

    return { uid: user.uid, senhaInicial };
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Este e-mail já está cadastrado.');
    }
    throw new HttpsError('internal', error.message || 'Não foi possível criar cliente.');
  }
});

exports.criarVenda = onCall(async (request) => {
  const vendedor = await assertRole(request.auth?.uid, ['admin', 'vendedor']);
  const { sorteioId, numero, clienteId, valor } = request.data || {};

  if (!sorteioId || !numero || !clienteId) {
    throw new HttpsError('invalid-argument', 'Sorteio, número e cliente são obrigatórios.');
  }

  const saleRef = db.collection('vendas').doc();
  const numberRef = db.doc(`sorteios/${sorteioId}/numeros/${numero}`);
  const lotteryRef = db.doc(`sorteios/${sorteioId}`);
  const participantRef = db.doc(`sorteios/${sorteioId}/participantes/${clienteId}`);
  const clientRef = db.doc(`usuarios/${clienteId}`);

  await db.runTransaction(async (tx) => {
    const [lotterySnap, numberSnap, clientSnap] = await Promise.all([
      tx.get(lotteryRef),
      tx.get(numberRef),
      tx.get(clientRef)
    ]);

    if (!lotterySnap.exists || lotterySnap.data().status !== 'ativo') {
      throw new HttpsError('failed-precondition', 'Sorteio não está ativo.');
    }
    if (!clientSnap.exists || clientSnap.data().tipo !== 'cliente') {
      throw new HttpsError('failed-precondition', 'Cliente inválido.');
    }
    if (!numberSnap.exists || numberSnap.data().status !== 'disponivel') {
      throw new HttpsError('already-exists', 'Número já foi vendido ou reservado.');
    }

    const money = Number(valor || lotterySnap.data().valorBilhete || 0);

    tx.set(saleRef, {
      sorteioId,
      numero,
      clienteId,
      clienteNome: clientSnap.data().nome || '',
      vendedorId: vendedor.id,
      vendedorNome: vendedor.nome || '',
      valor: money,
      statusPagamento: 'pendente',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000))
    });

    tx.update(numberRef, {
      status: 'reservado',
      clienteId,
      vendedorId: vendedor.id,
      vendaId: saleRef.id,
      updatedAt: FieldValue.serverTimestamp()
    });

    tx.set(participantRef, {
      clienteId,
      nome: clientSnap.data().nome || '',
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    tx.set(lotteryRef, {
      metricas: {
        pendentes: FieldValue.increment(1),
        valorPendente: FieldValue.increment(money)
      },
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    audit(tx, {
      tipo: 'venda_criada',
      vendaId: saleRef.id,
      sorteioId,
      numero,
      clienteId,
      atorId: vendedor.id
    });
  });

  return { vendaId: saleRef.id };
});

exports.confirmarPagamento = onCall(async (request) => {
  const caller = await assertRole(request.auth?.uid, ['admin', 'vendedor']);
  const { vendaId } = request.data || {};
  if (!vendaId) throw new HttpsError('invalid-argument', 'Venda obrigatória.');

  const saleRef = db.doc(`vendas/${vendaId}`);

  await db.runTransaction(async (tx) => {
    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists) throw new HttpsError('not-found', 'Venda não encontrada.');
    const sale = saleSnap.data();
    if (caller.tipo !== 'admin' && sale.vendedorId !== caller.id) {
      throw new HttpsError('permission-denied', 'A venda pertence a outro vendedor.');
    }
    if (sale.statusPagamento !== 'pendente') {
      throw new HttpsError('failed-precondition', 'A venda não está pendente.');
    }

    const numberRef = db.doc(`sorteios/${sale.sorteioId}/numeros/${sale.numero}`);
    const lotteryRef = db.doc(`sorteios/${sale.sorteioId}`);

    tx.update(saleRef, {
      statusPagamento: 'pago',
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    tx.update(numberRef, {
      status: 'vendido',
      updatedAt: FieldValue.serverTimestamp()
    });

    tx.set(lotteryRef, {
      metricas: {
        pendentes: FieldValue.increment(-1),
        pagos: FieldValue.increment(1),
        vendidos: FieldValue.increment(1),
        valorPendente: FieldValue.increment(-Number(sale.valor || 0)),
        valorPago: FieldValue.increment(Number(sale.valor || 0))
      },
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    audit(tx, {
      tipo: 'pagamento_confirmado',
      vendaId,
      sorteioId: sale.sorteioId,
      numero: sale.numero,
      atorId: caller.id
    });
  });

  return { ok: true };
});

exports.cancelarVenda = onCall(async (request) => {
  const caller = await assertRole(request.auth?.uid, ['admin', 'vendedor']);
  const { vendaId, motivo = 'cancelamento_manual' } = request.data || {};
  if (!vendaId) throw new HttpsError('invalid-argument', 'Venda obrigatória.');

  const saleRef = db.doc(`vendas/${vendaId}`);

  await db.runTransaction(async (tx) => {
    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists) throw new HttpsError('not-found', 'Venda não encontrada.');
    const sale = saleSnap.data();
    if (caller.tipo !== 'admin' && sale.vendedorId !== caller.id) {
      throw new HttpsError('permission-denied', 'A venda pertence a outro vendedor.');
    }
    if (sale.statusPagamento !== 'pendente') {
      throw new HttpsError('failed-precondition', 'A venda não está pendente.');
    }

    const numberRef = db.doc(`sorteios/${sale.sorteioId}/numeros/${sale.numero}`);
    const lotteryRef = db.doc(`sorteios/${sale.sorteioId}`);

    tx.update(saleRef, {
      statusPagamento: 'cancelada',
      cancelReason: motivo,
      canceledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    tx.update(numberRef, {
      status: 'disponivel',
      clienteId: FieldValue.delete(),
      vendedorId: FieldValue.delete(),
      vendaId: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    });

    tx.set(lotteryRef, {
      metricas: {
        pendentes: FieldValue.increment(-1),
        valorPendente: FieldValue.increment(-Number(sale.valor || 0))
      },
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    audit(tx, {
      tipo: 'venda_cancelada',
      vendaId,
      sorteioId: sale.sorteioId,
      numero: sale.numero,
      motivo,
      atorId: caller.id
    });
  });

  return { ok: true };
});

async function expirePendingSalesBatch() {
  const limitDate = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 15 * 60 * 1000));
  const snapshot = await db.collection('vendas')
    .where('statusPagamento', '==', 'pendente')
    .where('createdAt', '<', limitDate)
    .limit(200)
    .get();

  let expired = 0;
  for (const doc of snapshot.docs) {
    await db.runTransaction(async (tx) => {
      const saleSnap = await tx.get(doc.ref);
      if (!saleSnap.exists || saleSnap.data().statusPagamento !== 'pendente') return;
      const sale = saleSnap.data();
      const numberRef = db.doc(`sorteios/${sale.sorteioId}/numeros/${sale.numero}`);
      const lotteryRef = db.doc(`sorteios/${sale.sorteioId}`);

      tx.update(doc.ref, {
        statusPagamento: 'cancelada',
        cancelReason: 'expirada',
        canceledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      tx.update(numberRef, {
        status: 'disponivel',
        clienteId: FieldValue.delete(),
        vendedorId: FieldValue.delete(),
        vendaId: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
      });
      tx.set(lotteryRef, {
        metricas: {
          pendentes: FieldValue.increment(-1),
          valorPendente: FieldValue.increment(-Number(sale.valor || 0))
        },
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      audit(tx, {
        tipo: 'venda_expirada',
        vendaId: doc.id,
        sorteioId: sale.sorteioId,
        numero: sale.numero,
        atorId: 'system'
      });
      expired += 1;
    });
  }
  return expired;
}

exports.expirarPendencias = onSchedule('every 5 minutes', async () => {
  const expired = await expirePendingSalesBatch();
  console.log(`Pendências expiradas: ${expired}`);
});

exports.realizarSorteio = onCall(async (request) => {
  const adminProfile = await assertRole(request.auth?.uid, ['admin']);
  const { sorteioId } = request.data || {};
  if (!sorteioId) throw new HttpsError('invalid-argument', 'Sorteio obrigatório.');

  const lotteryRef = db.doc(`sorteios/${sorteioId}`);
  const soldSnapshot = await lotteryRef.collection('numeros').where('status', '==', 'vendido').get();

  if (soldSnapshot.empty) {
    throw new HttpsError('failed-precondition', 'Não há números vendidos para sortear.');
  }

  const docs = soldSnapshot.docs;
  const randomIndex = crypto.randomInt(0, docs.length);
  const winnerDoc = docs[randomIndex];
  const winner = winnerDoc.data();
  const algorithm = 'crypto.randomInt(0, totalVendidos)';

  await db.runTransaction(async (tx) => {
    const lotterySnap = await tx.get(lotteryRef);
    if (!lotterySnap.exists || lotterySnap.data().status === 'finalizado') {
      throw new HttpsError('failed-precondition', 'Sorteio inexistente ou já finalizado.');
    }

    const clientSnap = winner.clienteId ? await tx.get(db.doc(`usuarios/${winner.clienteId}`)) : null;
    const sellerSnap = winner.vendedorId ? await tx.get(db.doc(`usuarios/${winner.vendedorId}`)) : null;

    const resultado = {
      numero: winnerDoc.id,
      clienteId: winner.clienteId || null,
      ganhadorNome: clientSnap?.exists ? clientSnap.data().nome : '',
      vendedorId: winner.vendedorId || null,
      vendedorNome: sellerSnap?.exists ? sellerSnap.data().nome : '',
      totalVendidos: docs.length,
      randomIndex,
      algorithm,
      sorteadoPor: adminProfile.id,
      createdAt: FieldValue.serverTimestamp()
    };

    tx.update(lotteryRef, {
      status: 'finalizado',
      resultado,
      updatedAt: FieldValue.serverTimestamp()
    });

    audit(tx, {
      tipo: 'sorteio_realizado',
      sorteioId,
      numero: winnerDoc.id,
      algoritmo: algorithm,
      randomIndex,
      atorId: adminProfile.id
    });
  });

  return { numero: winnerDoc.id, algorithm, randomIndex };
});

exports.exportarVendasCsv = onCall(async (request) => {
  await assertRole(request.auth?.uid, ['admin']);
  const { sorteioId } = request.data || {};
  if (!sorteioId) throw new HttpsError('invalid-argument', 'Sorteio obrigatório.');

  const snapshot = await db.collection('vendas')
    .where('sorteioId', '==', sorteioId)
    .where('statusPagamento', '==', 'pago')
    .orderBy('createdAt', 'desc')
    .get();

  const header = 'vendaId,numero,clienteNome,vendedorNome,valor,statusPagamento\n';
  const rows = snapshot.docs.map((doc) => {
    const sale = doc.data();
    return [doc.id, sale.numero, sale.clienteNome, sale.vendedorNome, sale.valor, sale.statusPagamento]
      .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
      .join(',');
  });

  return { filename: `vendas-${sorteioId}.csv`, csv: header + rows.join('\n') };
});

exports.reativarTodasVendas = onCall(async (request) => {
  const adminProfile = await assertRole(request.auth?.uid, ['admin']);
  const { sorteioId } = request.data || {};
  if (!sorteioId) throw new HttpsError('invalid-argument', 'Sorteio obrigatório.');

  await db.runTransaction(async (tx) => {
    const lotteryRef = db.doc(`sorteios/${sorteioId}`);
    const snap = await tx.get(lotteryRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Sorteio não encontrado.');
    tx.update(lotteryRef, {
      status: 'ativo',
      vendasAtivas: true,
      updatedAt: FieldValue.serverTimestamp()
    });
    audit(tx, {
      tipo: 'vendas_reativadas',
      sorteioId,
      atorId: adminProfile.id
    });
  });

  return { ok: true };
});
