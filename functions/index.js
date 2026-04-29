const admin = require('firebase-admin');
const crypto = require('crypto');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { enforceRateLimit } = require('./utils/rateLimiter');

admin.initializeApp();

const db = getFirestore();

const ROLE_ADMIN = 'admin';
const ROLE_SELLER = 'vendedor';
const ROLE_CLIENT = 'cliente';

const LOTTERY_STATUS_OPEN = 'aberto';
const LOTTERY_STATUS_FINISHED = 'finalizado';
const LOTTERY_STATUS_DRAFT = 'rascunho';
const LOTTERY_STATUS_PAUSED = 'pausado';
const LOTTERY_STATUS_DRAWING = 'emSorteio';
const LOTTERY_STATUS_CANCELED = 'cancelado';

const PAYMENT_PENDING = 'pendente';
const PAYMENT_PAID = 'pago';
const PAYMENT_CANCELED = 'cancelado';
const PAYMENT_REFUNDED = 'estornado';

const SALE_STATUSES = [PAYMENT_PENDING, PAYMENT_PAID, PAYMENT_CANCELED, PAYMENT_REFUNDED];
const DEFAULT_PENDING_EXPIRATION_MINUTES = 15;
const CURRENT_SCHEMA_VERSION = 3;
const IS_FUNCTIONS_EMULATOR = process.env.FUNCTIONS_EMULATOR === 'true';
const ALLOW_EXTERNAL_SERVICES = process.env.ALLOW_EXTERNAL_SERVICES === 'true';
const DEV_BOOTSTRAP_SECRET = process.env.DEV_BOOTSTRAP_SECRET || 'estilo-local-bootstrap';

function nowTimestamps() {
  const serverNow = FieldValue.serverTimestamp();
  return {
    criadoEm: serverNow,
    atualizadoEm: serverNow,
    createdAt: serverNow,
    updatedAt: serverNow
  };
}

function touchTimestamp() {
  const serverNow = FieldValue.serverTimestamp();
  return {
    atualizadoEm: serverNow,
    updatedAt: serverNow
  };
}

function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function validateEmail(email) {
  const value = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeName(name = '') {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 120);
}

function sanitizePhone(phone = '') {
  return String(phone || '').trim().slice(0, 20);
}

function generateSecureTemporaryPassword(length = 12) {
  const min = Math.max(10, Number(length || 12));
  const bytes = crypto.randomBytes(min + 8).toString('base64url');
  return bytes.slice(0, min);
}

function isAbortedFirestoreError(error) {
  const code = String(error?.code || '').toLowerCase();
  const grpcCode = Number(error?.details?.grpcStatusCode ?? error?.status ?? -1);
  return code.includes('aborted') || grpcCode === 10;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTransactionWithRetry(handler, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 5));
  const baseDelayMs = Math.max(50, Number(options.baseDelayMs || 100));

  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await db.runTransaction(handler);
    } catch (error) {
      attempt += 1;
      if (attempt >= maxAttempts || !isAbortedFirestoreError(error)) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 60);
      const delay = baseDelayMs * (2 ** (attempt - 1)) + jitter;
      // eslint-disable-next-line no-await-in-loop
      await wait(delay);
    }
  }

  throw new HttpsError('aborted', 'Falha de concorrencia. Tente novamente.');
}

async function consumeRateLimit(request, uid, action, { limit = 20, windowSeconds = 60 } = {}) {
  const ip = request.rawRequest?.ip
    || request.rawRequest?.headers?.['x-forwarded-for']
    || '';
  await enforceRateLimit(db, { action, uid, ip, limit, windowSeconds });
}

function validateCpf(cpf) {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(digits[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(digits[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(digits[10]);
}

async function getProfile(uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'Faca login novamente.');
  const snapshot = await db.doc(`usuarios/${uid}`).get();
  if (!snapshot.exists) throw new HttpsError('permission-denied', 'Perfil nao encontrado.');
  return { id: snapshot.id, ...snapshot.data() };
}

async function assertRole(uid, allowedRoles) {
  const profile = await getProfile(uid);
  if (!allowedRoles.includes(profile.tipo)) {
    throw new HttpsError('permission-denied', 'Voce nao tem permissao para esta acao.');
  }
  return profile;
}

function moneyNumber(value) {
  const parsed = Number(value || 0);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return Number(parsed.toFixed(2));
}

function parseBrazilianDateToTimestamp(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return Timestamp.fromDate(date);
}

function upsertAuthUserByEmail(email, password, displayName) {
  return admin.auth().getUserByEmail(email).catch(async () => {
    return admin.auth().createUser({
      email,
      password,
      displayName
    });
  });
}

async function sendInitialPasswordEmail(email, nome, senhaInicial) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !senhaInicial) return;

  // Compatível com Firebase Trigger Email extension.
  await db.collection('mail').add({
    to: [cleanEmail],
    message: {
      subject: 'Sua conta foi criada no Estilo da Sorte',
      text: `Ola ${nome || ''}, sua senha inicial e: ${senhaInicial}. Troque no primeiro login.`,
      html: `<p>Ola ${nome || ''},</p><p>Sua senha inicial e: <strong>${senhaInicial}</strong></p><p>Troque no primeiro login.</p>`
    },
    createdAt: FieldValue.serverTimestamp()
  });
}

function normalizeLotteryStatus(status) {
  if (status === 'ativo') return LOTTERY_STATUS_OPEN;
  if (status === 'inativo') return 'cancelado';
  return status;
}

function normalizeSaleStatus(status) {
  if (status === 'confirmada') return PAYMENT_PAID;
  if (status === 'recusado') return PAYMENT_CANCELED;
  if (status === 'estornada') return PAYMENT_REFUNDED;
  if (!SALE_STATUSES.includes(status)) return PAYMENT_PENDING;
  return status;
}

function getSaleStatus(data = {}) {
  return normalizeSaleStatus(data.status || data.statusPagamento || data.statusVenda);
}

function saleStatusPayload(status) {
  const normalized = normalizeSaleStatus(status);
  const legacySaleStatus = normalized === PAYMENT_PAID ? 'confirmada' : normalized;
  return {
    status: normalized,
    statusPagamento: normalized,
    statusVenda: legacySaleStatus
  };
}

function lotteryStatusPayload(status) {
  const normalized = normalizeLotteryStatus(status);
  return {
    status: normalized,
    statusLegado: normalized === LOTTERY_STATUS_OPEN ? 'ativo' : normalized
  };
}

function tokenDocId(token = '') {
  return crypto.createHash('sha256').update(String(token)).digest('hex').slice(0, 40);
}

async function getUserPushTokens(uid) {
  const snapshot = await db.collection(`usuarios/${uid}/pushTokens`).where('ativo', '==', true).get();
  return snapshot.docs.map((doc) => doc.data().token).filter(Boolean);
}

async function disableInvalidTokens(uid, tokens, responses) {
  const invalidCodes = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];
  const batch = db.batch();

  responses.forEach((item, index) => {
    if (!item.success && invalidCodes.includes(item.error?.code)) {
      const token = tokens[index];
      if (!token) return;
      const ref = db.doc(`usuarios/${uid}/pushTokens/${tokenDocId(token)}`);
      batch.set(ref, { ativo: false, invalidadoEm: FieldValue.serverTimestamp(), ...touchTimestamp() }, { merge: true });
    }
  });

  await batch.commit();
}

async function sendNotificationToUsers(userIds, payload) {
  if (IS_FUNCTIONS_EMULATOR && !ALLOW_EXTERNAL_SERVICES) {
    console.log('Push suprimido no emulador (ALLOW_EXTERNAL_SERVICES=false).');
    return 0;
  }

  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  let totalSent = 0;

  for (const uid of uniqueIds) {
    const tokens = await getUserPushTokens(uid);
    if (!tokens.length) continue;

    try {
      const result = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: payload.notification,
        data: payload.data || {}
      });

      totalSent += result.successCount;
      await disableInvalidTokens(uid, tokens, result.responses);
    } catch (error) {
      console.log('Falha no envio de push para uid', uid, error?.message);
    }
  }

  return totalSent;
}

function assertSaleTransition(before, after) {
  const prev = normalizeSaleStatus(before);
  const next = normalizeSaleStatus(after);
  const isValid = (prev === PAYMENT_PENDING && (next === PAYMENT_PAID || next === PAYMENT_CANCELED))
    || (prev === PAYMENT_PAID && next === PAYMENT_REFUNDED);
  if (!isValid) {
    throw new HttpsError('failed-precondition', 'Transicao de status da venda invalida.');
  }
}

function hashAuditPayload(payload = {}, previousHash = '') {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ previousHash, ...payload }))
    .digest('hex');
}

function audit(tx, payload, options = {}) {
  const latestRef = db.doc('_auditoria_chain/latest');
  const previousHash = String(options.previousHash || '');
  const hash = hashAuditPayload(payload, previousHash);

  const ref = db.collection('auditoria').doc();
  tx.set(ref, {
    ...payload,
    previousHash,
    hash,
    timestamp: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  });
  tx.set(latestRef, {
    hash,
    ref: ref.path,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

async function appendAudit(payload) {
  await db.runTransaction(async (tx) => {
    const latestRef = db.doc('_auditoria_chain/latest');
    const latestSnap = await tx.get(latestRef);
    const previousHash = latestSnap.exists ? String(latestSnap.data().hash || '') : '';
    audit(tx, payload, { previousHash });
  });
}

async function updateLotteryMetrics(tx, { sorteioId, pendentes = 0, pagos = 0, vendidos = 0, valorPendente = 0, valorPago = 0 }) {
  const lotteryRef = db.doc(`sorteios/${sorteioId}`);
  tx.set(lotteryRef, {
    metrics: {
      pendentes: FieldValue.increment(pendentes),
      pagos: FieldValue.increment(pagos),
      vendidos: FieldValue.increment(vendidos),
      valorPendente: FieldValue.increment(valorPendente),
      valorPago: FieldValue.increment(valorPago)
    },
    metricas: {
      pendentes: FieldValue.increment(pendentes),
      pagos: FieldValue.increment(pagos),
      vendidos: FieldValue.increment(vendidos),
      valorPendente: FieldValue.increment(valorPendente),
      valorPago: FieldValue.increment(valorPago)
    },
    ...touchTimestamp()
  }, { merge: true });
}

exports.criarCliente = onCall(async (request) => {
  const caller = await assertRole(request.auth?.uid, [ROLE_ADMIN, ROLE_SELLER]);
  await consumeRateLimit(request, caller.id, 'criarCliente', { limit: 10, windowSeconds: 60 });
  const { nome, email, cpf, telefone } = request.data || {};

  const cleanName = sanitizeName(nome);
  const cleanEmail = normalizeEmail(email);
  const cpfDigits = onlyDigits(cpf);
  const cleanPhone = sanitizePhone(telefone);

  if (!cleanName || !validateEmail(cleanEmail) || !validateCpf(cpfDigits)) {
    throw new HttpsError('invalid-argument', 'Nome, email e CPF valido sao obrigatorios.');
  }

  const senhaInicial = crypto.randomBytes(4).toString('hex');

  try {
    const user = await admin.auth().createUser({
      email: cleanEmail,
      password: senhaInicial,
      displayName: cleanName
    });
    const userRef = db.doc(`usuarios/${user.uid}`);
    const privateRef = db.doc(`usuarios/${user.uid}/dadosPrivados/perfil`);

    const base = {
      nome: cleanName,
      email: cleanEmail,
      tipo: ROLE_CLIENT,
      uid: user.uid,
      forcePasswordChange: true,
      criadoPor: caller.id,
      ...nowTimestamps()
    };

    await userRef.set(base, { merge: true });
    await privateRef.set({
      cpf: cpfDigits,
      cpfMascarado: `${cpfDigits.slice(0, 3)}.${cpfDigits.slice(3, 6)}.${cpfDigits.slice(6, 9)}-${cpfDigits.slice(9)}`,
      telefone: cleanPhone,
      ...nowTimestamps()
    }, { merge: true });
    await sendInitialPasswordEmail(cleanEmail, cleanName, senhaInicial);

    await appendAudit({
      acao: 'cliente_criado',
      detalhes: 'Cadastro de cliente por callable criarCliente',
      userId: caller.id,
      dadosRelevantes: { clienteId: user.uid, email: cleanEmail },
      timestamp: FieldValue.serverTimestamp()
    });

    return { uid: user.uid, senhaEnviada: true };
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Este email ja esta cadastrado.');
    }
    throw new HttpsError('internal', 'Nao foi possivel criar cliente no momento.');
  }
});

exports.criarVendedor = onCall(async (request) => {
  const caller = await assertRole(request.auth?.uid, [ROLE_ADMIN]);
  await consumeRateLimit(request, caller.id, 'criarVendedor', { limit: 10, windowSeconds: 60 });
  const {
    nome,
    email,
    cpf = '',
    telefone = '',
    emailRecuperacao = '',
    avatarUrl = '',
    comissao = 0
  } = request.data || {};

  const cleanName = sanitizeName(nome);
  const cleanEmail = normalizeEmail(email);
  const cpfDigits = onlyDigits(cpf);
  const cleanPhone = sanitizePhone(telefone);
  const recoveryEmail = normalizeEmail(emailRecuperacao || '');
  const cleanAvatar = String(avatarUrl || '').trim();
  const commission = Number(comissao || 0);

  if (!cleanName || !validateEmail(cleanEmail)) {
    throw new HttpsError('invalid-argument', 'Nome e email sao obrigatorios.');
  }
  if (cpfDigits && !validateCpf(cpfDigits)) {
    throw new HttpsError('invalid-argument', 'CPF invalido.');
  }
  if (Number.isNaN(commission) || commission < 0 || commission > 100) {
    throw new HttpsError('invalid-argument', 'Comissao deve estar entre 0 e 100.');
  }

  const senhaInicial = generateSecureTemporaryPassword(12);

  try {
    const user = await admin.auth().createUser({
      email: cleanEmail,
      password: senhaInicial,
      displayName: cleanName
    });
    await admin.auth().setCustomUserClaims(user.uid, { forcePasswordChange: true });

    const userRef = db.doc(`usuarios/${user.uid}`);
    const privateRef = db.doc(`usuarios/${user.uid}/dadosPrivados/perfil`);

    await userRef.set({
      nome: cleanName,
      email: cleanEmail,
      tipo: ROLE_SELLER,
      status: 'ativo',
      uid: user.uid,
      emailRecuperacao: recoveryEmail,
      avatarUrl: cleanAvatar,
      totalVendas: 0,
      comissao: commission,
      forcePasswordChange: true,
      criadoPor: caller.id,
      ...nowTimestamps()
    }, { merge: true });

    if (cpfDigits) {
      await privateRef.set({
        cpf: cpfDigits,
        cpfMascarado: `${cpfDigits.slice(0, 3)}.${cpfDigits.slice(3, 6)}.${cpfDigits.slice(6, 9)}-${cpfDigits.slice(9)}`,
        telefone: cleanPhone,
        ...nowTimestamps()
      }, { merge: true });
    }

    await appendAudit({
      acao: 'vendedor_criado',
      detalhes: 'Cadastro de vendedor por callable criarVendedor',
      userId: caller.id,
      dadosRelevantes: { vendedorId: user.uid, email: cleanEmail, comissao: commission },
      timestamp: FieldValue.serverTimestamp()
    });

    return { uid: user.uid, senhaInicial };
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Este email ja esta cadastrado.');
    }
    throw new HttpsError('internal', 'Nao foi possivel criar vendedor no momento.');
  }
});

exports.atualizarVendedor = onCall(async (request) => {
  const caller = await assertRole(request.auth?.uid, [ROLE_ADMIN]);
  const {
    vendedorId,
    nome,
    email,
    telefone = '',
    cpf = '',
    emailRecuperacao = '',
    avatarUrl = '',
    comissao
  } = request.data || {};

  const uid = String(vendedorId || '').trim();
  if (!uid) throw new HttpsError('invalid-argument', 'vendedorId obrigatorio.');

  const userRef = db.doc(`usuarios/${uid}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError('not-found', 'Vendedor nao encontrado.');

  const user = userSnap.data();
  if (user.tipo !== ROLE_SELLER) {
    throw new HttpsError('failed-precondition', 'O usuario informado nao e vendedor.');
  }

  const payload = {
    atualizadoEm: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  if (nome !== undefined) payload.nome = String(nome || '').trim();
  if (telefone !== undefined) payload.telefone = String(telefone || '').trim();
  if (emailRecuperacao !== undefined) payload.emailRecuperacao = normalizeEmail(emailRecuperacao || '');
  if (avatarUrl !== undefined) payload.avatarUrl = String(avatarUrl || '').trim();
  if (comissao !== undefined) {
    const commission = Number(comissao);
    if (Number.isNaN(commission) || commission < 0 || commission > 100) {
      throw new HttpsError('invalid-argument', 'Comissao deve estar entre 0 e 100.');
    }
    payload.comissao = commission;
  }

  if (!payload.nome && !user.nome) {
    throw new HttpsError('invalid-argument', 'Nome obrigatorio.');
  }

  const nextEmail = email !== undefined ? normalizeEmail(email) : user.email;
  if (!nextEmail) throw new HttpsError('invalid-argument', 'Email obrigatorio.');

  try {
    if (nextEmail !== user.email) {
      await admin.auth().updateUser(uid, { email: nextEmail });
      payload.email = nextEmail;
    }

    if (payload.nome && payload.nome !== user.nome) {
      await admin.auth().updateUser(uid, { displayName: payload.nome });
    }

    await userRef.set(payload, { merge: true });

    const cpfDigits = onlyDigits(cpf);
    if (cpf !== undefined && cpfDigits) {
      if (!validateCpf(cpfDigits)) throw new HttpsError('invalid-argument', 'CPF invalido.');
      await db.doc(`usuarios/${uid}/dadosPrivados/perfil`).set({
        cpf: cpfDigits,
        cpfMascarado: `${cpfDigits.slice(0, 3)}.${cpfDigits.slice(3, 6)}.${cpfDigits.slice(6, 9)}-${cpfDigits.slice(9)}`,
        telefone: String(telefone || user.telefone || '').trim(),
        ...touchTimestamp()
      }, { merge: true });
    }

    await appendAudit({
      acao: 'vendedor_atualizado',
      detalhes: 'Atualizacao de vendedor por callable atualizarVendedor',
      userId: caller.id,
      dadosRelevantes: { vendedorId: uid, campos: Object.keys(payload) },
      timestamp: FieldValue.serverTimestamp()
    });

    return { ok: true };
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Este email ja esta cadastrado.');
    }
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Nao foi possivel atualizar vendedor.');
  }
});

exports.definirStatusVendedor = onCall(async (request) => {
  const caller = await assertRole(request.auth?.uid, [ROLE_ADMIN]);
  const { vendedorId, status } = request.data || {};

  const uid = String(vendedorId || '').trim();
  const nextStatus = String(status || '').trim().toLowerCase();

  if (!uid) throw new HttpsError('invalid-argument', 'vendedorId obrigatorio.');
  if (!['ativo', 'inativo'].includes(nextStatus)) {
    throw new HttpsError('invalid-argument', 'Status invalido. Use ativo ou inativo.');
  }

  const userRef = db.doc(`usuarios/${uid}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError('not-found', 'Vendedor nao encontrado.');

  const user = userSnap.data();
  if (user.tipo !== ROLE_SELLER) {
    throw new HttpsError('failed-precondition', 'O usuario informado nao e vendedor.');
  }

  await Promise.all([
    userRef.set({
      status: nextStatus,
      ...touchTimestamp()
    }, { merge: true }),
    admin.auth().updateUser(uid, { disabled: nextStatus === 'inativo' })
  ]);

  await appendAudit({
    acao: 'vendedor_status_alterado',
    detalhes: `Status alterado para ${nextStatus}`,
    userId: caller.id,
    dadosRelevantes: { vendedorId: uid, status: nextStatus },
    timestamp: FieldValue.serverTimestamp()
  });

  return { ok: true, status: nextStatus };
});

exports.salvarSorteioAdmin = onCall(async (request) => {
  const adminProfile = await assertRole(request.auth?.uid, [ROLE_ADMIN]);
  const {
    sorteioId = '',
    titulo = '',
    descricao = '',
    premioPrincipal = '',
    premioDinheiro = 0,
    valorBilhete = 2,
    dataSorteioText = '',
    status = LOTTERY_STATUS_OPEN,
    quantidadeGanhadores = 1,
    numeroInicial = 1,
    quantidadeNumeros = 1000,
    codigoSorteio = '',
    imagemUrl = '',
    especial = false,
    permiteVendaAutomatica = false
  } = request.data || {};

  const cleanTitle = String(titulo || '').trim();
  const cleanDescription = String(descricao || '').trim();
  const cleanPrize = String(premioPrincipal || '').trim();
  const cleanDateText = String(dataSorteioText || '').trim();
  const cleanCode = String(codigoSorteio || '').trim();
  const cleanImage = String(imagemUrl || '').trim();
  const startNumber = Math.max(1, Number(numeroInicial || 1));
  const totalNumbers = Math.max(1, Number(quantidadeNumeros || 1));
  const winners = Math.max(1, Number(quantidadeGanhadores || 1));
  const endNumber = startNumber + totalNumbers - 1;
  const drawDate = parseBrazilianDateToTimestamp(cleanDateText);

  if (!cleanTitle) throw new HttpsError('invalid-argument', 'Titulo do sorteio obrigatorio.');
  if (!drawDate) throw new HttpsError('invalid-argument', 'Data do sorteio invalida. Use dd/mm/aaaa.');
  if (totalNumbers > 60000) {
    throw new HttpsError('invalid-argument', 'Quantidade de numeros muito alta (maximo 60000).');
  }
  if (winners > totalNumbers) {
    throw new HttpsError('invalid-argument', 'Quantidade de ganhadores nao pode ser maior que os numeros.');
  }

  const normalizedStatus = normalizeLotteryStatus(status || LOTTERY_STATUS_OPEN);
  const lotteryRef = sorteioId
    ? db.doc(`sorteios/${String(sorteioId).trim()}`)
    : db.collection('sorteios').doc();
  const lotterySnapshot = await lotteryRef.get();
  const isNewLottery = !lotterySnapshot.exists;
  const drawYear = drawDate.toDate().getFullYear();

  await lotteryRef.set({
    titulo: cleanTitle,
    descricao: cleanDescription,
    premioPrincipal: cleanPrize,
    premioDinheiro: moneyNumber(premioDinheiro),
    valorBilhete: moneyNumber(valorBilhete),
    chances: Math.max(1, Number(request.data?.chances || 20)),
    dataSorteio: drawDate,
    dataSorteioText: cleanDateText,
    quantidadeGanhadores: winners,
    numeroInicial: startNumber,
    numeroFinal: endNumber,
    quantidadeNumeros: totalNumbers,
    imagemUrl: cleanImage,
    especial: Boolean(especial),
    permiteVendaAutomatica: Boolean(permiteVendaAutomatica),
    codigoSorteio: cleanCode || `SS-${drawYear}-${lotteryRef.id.slice(-4).toUpperCase()}`,
    criadoPor: lotterySnapshot.data()?.criadoPor || adminProfile.id,
    ...lotteryStatusPayload(normalizedStatus),
    ...(isNewLottery ? nowTimestamps() : touchTimestamp())
  }, { merge: true });

  const existingNumbers = new Set();
  const numbersSnapshot = await lotteryRef.collection('numeros').select().get();
  numbersSnapshot.docs.forEach((docSnap) => {
    existingNumbers.add(docSnap.id);
  });

  let createdNumbers = 0;
  let batch = db.batch();
  let pendingWrites = 0;

  for (let current = startNumber; current <= endNumber; current += 1) {
    const numberId = String(current).padStart(6, '0');
    if (existingNumbers.has(numberId)) continue;

    batch.set(lotteryRef.collection('numeros').doc(numberId), {
      numero: current,
      numeroFormatado: numberId,
      sorteioId: lotteryRef.id,
      status: 'disponivel',
      ...nowTimestamps()
    }, { merge: true });
    pendingWrites += 1;
    createdNumbers += 1;

    if (pendingWrites >= 450) {
      await batch.commit();
      batch = db.batch();
      pendingWrites = 0;
    }
  }

  if (pendingWrites) {
    await batch.commit();
  }

  await appendAudit({
    acao: isNewLottery ? 'sorteio_criado' : 'sorteio_atualizado',
    detalhes: 'Salvar sorteio via callable salvarSorteioAdmin',
    userId: adminProfile.id,
    dadosRelevantes: {
      sorteioId: lotteryRef.id,
      createdNumbers,
      totalNumbers,
      numeroInicial: startNumber,
      numeroFinal: endNumber
    },
    timestamp: FieldValue.serverTimestamp()
  });

  return {
    ok: true,
    sorteioId: lotteryRef.id,
    createdNumbers,
    totalNumbers
  };
});

exports.listarClientes = onCall(async (request) => {
  await assertRole(request.auth?.uid, [ROLE_ADMIN, ROLE_SELLER]);

  const snapshot = await db.collection('usuarios')
    .where('tipo', '==', ROLE_CLIENT)
    .orderBy('nome', 'asc')
    .limit(300)
    .get();

  const clientes = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      nome: data.nome || '',
      email: data.email || '',
      telefone: data.telefone || ''
    };
  });

  return { clientes };
});

exports.registrarTokenPush = onCall(async (request) => {
  const profile = await getProfile(request.auth?.uid);
  if (![ROLE_ADMIN, ROLE_SELLER, ROLE_CLIENT].includes(profile.tipo)) {
    throw new HttpsError('permission-denied', 'Perfil sem permissao para registrar push.');
  }

  const { token, platform = 'unknown' } = request.data || {};
  const cleanToken = String(token || '').trim();

  if (cleanToken.length < 20) {
    throw new HttpsError('invalid-argument', 'Token push invalido.');
  }

  const ref = db.doc(`usuarios/${profile.id}/pushTokens/${tokenDocId(cleanToken)}`);
  await ref.set({
    token: cleanToken,
    platform: String(platform || 'unknown'),
    ativo: true,
    ...nowTimestamps()
  }, { merge: true });

  return { ok: true };
});

exports.removerTokenPush = onCall(async (request) => {
  const profile = await getProfile(request.auth?.uid);
  const { token } = request.data || {};
  const cleanToken = String(token || '').trim();
  if (!cleanToken) throw new HttpsError('invalid-argument', 'Token obrigatorio.');

  await db.doc(`usuarios/${profile.id}/pushTokens/${tokenDocId(cleanToken)}`).set({
    ativo: false,
    removidoEm: FieldValue.serverTimestamp(),
    ...touchTimestamp()
  }, { merge: true });

  return { ok: true };
});

exports.enviarNotificacaoTeste = onCall(async (request) => {
  await assertRole(request.auth?.uid, [ROLE_ADMIN]);
  const { userId, title = 'Estilo da Sorte', body = 'Notificacao de teste', data = {} } = request.data || {};
  if (!userId) throw new HttpsError('invalid-argument', 'userId obrigatorio.');

  const sent = await sendNotificationToUsers([userId], {
    notification: {
      title: String(title),
      body: String(body)
    },
    data: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [String(k), String(v)]))
  });

  return { ok: true, sent };
});

exports.criarVenda = onCall(async (request) => {
  const vendedor = await assertRole(request.auth?.uid, [ROLE_ADMIN, ROLE_SELLER]);
  await consumeRateLimit(request, vendedor.id, 'criarVenda', { limit: 20, windowSeconds: 60 });
  const { sorteioId, numero, clienteId, valor, formaPagamento = 'pendente' } = request.data || {};

  if (!sorteioId || !numero || !clienteId) {
    throw new HttpsError('invalid-argument', 'Sorteio, numero e cliente sao obrigatorios.');
  }

  const numeroNormalizado = String(numero).trim().padStart(6, '0');
  const saleRef = db.collection('vendas').doc();
  const lotteryRef = db.doc(`sorteios/${sorteioId}`);
  const numberRef = db.doc(`sorteios/${sorteioId}/numeros/${numeroNormalizado}`);
  const participantRef = db.doc(`sorteios/${sorteioId}/participantes/${clienteId}`);
  const clientRef = db.doc(`usuarios/${clienteId}`);

  try {
    await runTransactionWithRetry(async (tx) => {
      const [lotterySnap, numberSnap, clientSnap] = await Promise.all([
        tx.get(lotteryRef),
        tx.get(numberRef),
        tx.get(clientRef)
      ]);

      if (!lotterySnap.exists) {
        throw new HttpsError('not-found', 'Sorteio nao encontrado.');
      }

      const lotteryData = lotterySnap.data();
      const status = normalizeLotteryStatus(lotteryData.status);
      if (status !== LOTTERY_STATUS_OPEN) {
        throw new HttpsError('failed-precondition', 'Sorteio nao esta aberto para vendas.');
      }

      const sellerRef = db.doc(`sorteios/${sorteioId}/vendedores/${vendedor.id}`);
      const sellerSnap = await tx.get(sellerRef);
      if (!sellerSnap.exists) {
        throw new HttpsError('permission-denied', 'Vendedor nao autorizado neste sorteio.');
      }

      if (!clientSnap.exists || clientSnap.data().tipo !== ROLE_CLIENT) {
        throw new HttpsError('failed-precondition', 'Cliente invalido.');
      }

      if (!numberSnap.exists || numberSnap.data().status !== 'disponivel') {
        throw new HttpsError('already-exists', 'Numero ja vendido ou reservado.');
      }

      const saleValue = moneyNumber(valor || lotteryData.precoPorNumero || lotteryData.valorBilhete || 0);
      const expirationMinutes = Number(lotteryData?.limites?.expiracaoPendenciaMinutos
        || lotteryData?.expiracaoPendenciaMinutos
        || DEFAULT_PENDING_EXPIRATION_MINUTES);
      const expirationDate = new Date(Date.now() + expirationMinutes * 60 * 1000);
      const comissaoAplicada = Number(vendedor.comissao || 0);

      tx.set(saleRef, {
        sorteioId,
        codigoSorteio: lotteryData.codigoSorteio || null,
        numero: numeroNormalizado,
        numeros: [numeroNormalizado],
        clienteId,
        clienteNome: clientSnap.data().nome || '',
        vendedorId: vendedor.id,
        vendedorNome: vendedor.nome || '',
        quantidade: 1,
        valorUnitario: saleValue,
        valorTotal: saleValue,
        valor: saleValue,
        comissaoAplicada,
        ...saleStatusPayload(PAYMENT_PENDING),
        formaPagamento,
        codigoTransacao: null,
        canceladoPor: null,
        motivoCancelamento: null,
        expiresAt: Timestamp.fromDate(expirationDate),
        ...nowTimestamps()
      });

      tx.set(numberRef, {
        numero: numeroNormalizado,
        sorteioId,
        status: 'reservado',
        clienteId,
        nomeCliente: clientSnap.data().nome || '',
        vendedorId: vendedor.id,
        vendaId: saleRef.id,
        reservadoEm: FieldValue.serverTimestamp(),
        expiracaoReserva: Timestamp.fromDate(expirationDate),
        ...touchTimestamp()
      }, { merge: true });

      tx.set(participantRef, {
        clienteId,
        sorteioId,
        nomeCliente: clientSnap.data().nome || '',
        quantidadeNumeros: FieldValue.increment(1),
        valorTotal: FieldValue.increment(saleValue),
        vendasIds: FieldValue.arrayUnion(saleRef.id),
        ultimaCompraEm: FieldValue.serverTimestamp(),
        ...touchTimestamp()
      }, { merge: true });

      await updateLotteryMetrics(tx, {
        sorteioId,
        pendentes: 1,
        valorPendente: saleValue
      });

      await audit(tx, {
        acao: 'venda_criada',
        detalhes: 'Reserva criada com status pendente',
        userId: vendedor.id,
        dadosRelevantes: { vendaId: saleRef.id, sorteioId, numero: numeroNormalizado, clienteId }
      });
    }, { maxAttempts: 5, baseDelayMs: 100 });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (isAbortedFirestoreError(error)) {
      throw new HttpsError('aborted', 'Conflito de concorrencia ao reservar numero. Tente novamente.');
    }
    throw new HttpsError('internal', 'Nao foi possivel concluir a venda no momento.');
  }

  return { vendaId: saleRef.id };
});

exports.confirmarPagamento = onCall(async (request) => {
  const caller = await assertRole(request.auth?.uid, [ROLE_ADMIN, ROLE_SELLER]);
  await consumeRateLimit(request, caller.id, 'confirmarPagamento', { limit: 20, windowSeconds: 60 });
  const { vendaId } = request.data || {};
  if (!vendaId) throw new HttpsError('invalid-argument', 'Venda obrigatoria.');

  const saleRef = db.doc(`vendas/${vendaId}`);

  await runTransactionWithRetry(async (tx) => {
    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists) throw new HttpsError('not-found', 'Venda nao encontrada.');

    const sale = saleSnap.data();
    if (caller.tipo !== ROLE_ADMIN && sale.vendedorId !== caller.id) {
      throw new HttpsError('permission-denied', 'A venda pertence a outro vendedor.');
    }

    const currentStatus = getSaleStatus(sale);
    if (currentStatus === PAYMENT_PAID) return;
    assertSaleTransition(currentStatus, PAYMENT_PAID);

    const numberRef = db.doc(`sorteios/${sale.sorteioId}/numeros/${sale.numero}`);
    const numberSnap = await tx.get(numberRef);
    const numberStatus = numberSnap.exists ? numberSnap.data().status : null;
    if (numberStatus !== 'reservado' && numberStatus !== 'vendido') {
      throw new HttpsError('failed-precondition', 'Numero nao esta reservado para confirmar pagamento.');
    }

    tx.update(saleRef, {
      ...saleStatusPayload(PAYMENT_PAID),
      confirmadoEm: FieldValue.serverTimestamp(),
      canceladoPor: FieldValue.delete(),
      motivoCancelamento: FieldValue.delete(),
      ...touchTimestamp()
    });

    tx.update(numberRef, {
      status: 'vendido',
      vendidoEm: FieldValue.serverTimestamp(),
      ...touchTimestamp()
    });

    await updateLotteryMetrics(tx, {
      sorteioId: sale.sorteioId,
      pendentes: -1,
      pagos: 1,
      vendidos: 1,
      valorPendente: -moneyNumber(sale.valor),
      valorPago: moneyNumber(sale.valor)
    });

    await audit(tx, {
      acao: 'pagamento_confirmado',
      detalhes: 'Venda marcada como paga',
      userId: caller.id,
      dadosRelevantes: { vendaId, sorteioId: sale.sorteioId, numero: sale.numero }
    });
  }, { maxAttempts: 3, baseDelayMs: 80 });

  return { ok: true };
});

exports.cancelarVenda = onCall(async (request) => {
  const caller = await assertRole(request.auth?.uid, [ROLE_ADMIN, ROLE_SELLER]);
  await consumeRateLimit(request, caller.id, 'cancelarVenda', { limit: 50, windowSeconds: 60 });
  const { vendaId, motivo = 'cancelamento_manual' } = request.data || {};
  if (!vendaId) throw new HttpsError('invalid-argument', 'Venda obrigatoria.');
  const cleanReason = String(motivo || 'cancelamento_manual').trim().slice(0, 160) || 'cancelamento_manual';

  const saleRef = db.doc(`vendas/${vendaId}`);

  await runTransactionWithRetry(async (tx) => {
    const saleSnap = await tx.get(saleRef);
    if (!saleSnap.exists) throw new HttpsError('not-found', 'Venda nao encontrada.');

    const sale = saleSnap.data();
    if (caller.tipo !== ROLE_ADMIN && sale.vendedorId !== caller.id) {
      throw new HttpsError('permission-denied', 'A venda pertence a outro vendedor.');
    }

    const currentStatus = getSaleStatus(sale);
    if (currentStatus === PAYMENT_CANCELED) return;
    assertSaleTransition(currentStatus, PAYMENT_CANCELED);

    const numberRef = db.doc(`sorteios/${sale.sorteioId}/numeros/${sale.numero}`);

    tx.update(saleRef, {
      ...saleStatusPayload(PAYMENT_CANCELED),
      canceladoEm: FieldValue.serverTimestamp(),
      cancelReason: cleanReason,
      canceladoPor: caller.id,
      motivoCancelamento: cleanReason,
      ...touchTimestamp()
    });

    tx.update(numberRef, {
      status: 'disponivel',
      clienteId: FieldValue.delete(),
      nomeCliente: FieldValue.delete(),
      vendedorId: FieldValue.delete(),
      vendaId: FieldValue.delete(),
      reservadoEm: FieldValue.delete(),
      expiracaoReserva: FieldValue.delete(),
      ...touchTimestamp()
    });

    await updateLotteryMetrics(tx, {
      sorteioId: sale.sorteioId,
      pendentes: -1,
      valorPendente: -moneyNumber(sale.valor)
    });

    await audit(tx, {
      acao: 'venda_cancelada',
      detalhes: cleanReason,
      userId: caller.id,
      dadosRelevantes: { vendaId, sorteioId: sale.sorteioId, numero: sale.numero }
    });
  }, { maxAttempts: 3, baseDelayMs: 80 });

  return { ok: true };
});

exports.notificarMudancaVenda = onDocumentUpdated('vendas/{vendaId}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;
  const beforeStatus = getSaleStatus(before);
  const afterStatus = getSaleStatus(after);
  if (beforeStatus === afterStatus) return;
  if (![PAYMENT_PAID, PAYMENT_CANCELED].includes(afterStatus)) return;

  const title = afterStatus === PAYMENT_PAID ? 'Pagamento confirmado' : 'Venda cancelada';
  const body = afterStatus === PAYMENT_PAID
    ? `Numero ${after.numero} confirmado com sucesso.`
    : `Numero ${after.numero} foi liberado.`;

  await sendNotificationToUsers([after.clienteId, after.vendedorId], {
    notification: { title, body },
    data: {
      vendaId: event.params.vendaId,
      sorteioId: String(after.sorteioId || ''),
      status: String(afterStatus || ''),
      statusPagamento: String(afterStatus || '')
    }
  });
});

async function expirePendingSalesBatch() {
  const limitDate = Timestamp.fromDate(new Date(Date.now() - DEFAULT_PENDING_EXPIRATION_MINUTES * 60 * 1000));

  const [statusSnapshot, legacySnapshot] = await Promise.all([
    db.collection('vendas')
      .where('status', '==', PAYMENT_PENDING)
      .where('criadoEm', '<=', limitDate)
      .limit(200)
      .get(),
    db.collection('vendas')
      .where('statusPagamento', '==', PAYMENT_PENDING)
      .where('criadoEm', '<=', limitDate)
      .limit(200)
      .get()
  ]);

  const map = new Map();
  [...statusSnapshot.docs, ...legacySnapshot.docs].forEach((doc) => map.set(doc.id, doc));
  const docs = Array.from(map.values());

  let expired = 0;

  for (const saleDoc of docs) {
    await runTransactionWithRetry(async (tx) => {
      const saleSnap = await tx.get(saleDoc.ref);
      if (!saleSnap.exists) return;

      const sale = saleSnap.data();
      if (getSaleStatus(sale) !== PAYMENT_PENDING) return;

      const numberRef = db.doc(`sorteios/${sale.sorteioId}/numeros/${sale.numero}`);

      tx.update(saleDoc.ref, {
        ...saleStatusPayload(PAYMENT_CANCELED),
        canceladoEm: FieldValue.serverTimestamp(),
        cancelReason: 'expirada',
        canceladoPor: 'system',
        motivoCancelamento: 'expirada',
        ...touchTimestamp()
      });

      tx.update(numberRef, {
        status: 'disponivel',
        clienteId: FieldValue.delete(),
        nomeCliente: FieldValue.delete(),
        vendedorId: FieldValue.delete(),
        vendaId: FieldValue.delete(),
        reservadoEm: FieldValue.delete(),
        expiracaoReserva: FieldValue.delete(),
        ...touchTimestamp()
      });

      await updateLotteryMetrics(tx, {
        sorteioId: sale.sorteioId,
        pendentes: -1,
        valorPendente: -moneyNumber(sale.valor)
      });

      await audit(tx, {
        acao: 'venda_expirada',
        detalhes: 'Cancelada por timeout de 15 minutos',
        userId: 'system',
        dadosRelevantes: { vendaId: saleDoc.id, sorteioId: sale.sorteioId, numero: sale.numero }
      });

      expired += 1;
    }, { maxAttempts: 3, baseDelayMs: 60 });
  }

  return expired;
}

exports.expirarPendencias = onSchedule('every 5 minutes', async () => {
  const maxRounds = 20;
  let totalExpired = 0;
  for (let round = 0; round < maxRounds; round += 1) {
    // eslint-disable-next-line no-await-in-loop
    const expired = await expirePendingSalesBatch();
    totalExpired += expired;
    if (expired === 0) break;
  }
  console.log(`Pendencias expiradas: ${totalExpired}`);
});

exports.realizarSorteio = onCall(async (request) => {
  const adminProfile = await assertRole(request.auth?.uid, [ROLE_ADMIN]);
  await consumeRateLimit(request, adminProfile.id, 'realizarSorteio', { limit: 3, windowSeconds: 60 });
  const { sorteioId } = request.data || {};
  if (!sorteioId) throw new HttpsError('invalid-argument', 'Sorteio obrigatorio.');
  const allowEarlyDraw = Boolean(request.data?.allowEarlyDraw || false);

  const lotteryRef = db.doc(`sorteios/${sorteioId}`);
  const soldSnapshot = await lotteryRef.collection('numeros').where('status', '==', 'vendido').get();

  if (soldSnapshot.empty) {
    throw new HttpsError('failed-precondition', 'Nao ha numeros vendidos para sortear.');
  }

  const soldDocs = soldSnapshot.docs;
  const randomIndex = crypto.randomInt(0, soldDocs.length);
  const winnerDoc = soldDocs[randomIndex];
  const winner = winnerDoc.data();

  await runTransactionWithRetry(async (tx) => {
    const lotterySnap = await tx.get(lotteryRef);
    if (!lotterySnap.exists) throw new HttpsError('not-found', 'Sorteio nao encontrado.');

    const lottery = lotterySnap.data();
    const currentStatus = normalizeLotteryStatus(lottery.status);

    if (![LOTTERY_STATUS_OPEN, LOTTERY_STATUS_DRAWING].includes(currentStatus)) {
      throw new HttpsError('failed-precondition', 'Sorteio nao esta em estado valido para sorteio.');
    }
    if (currentStatus === LOTTERY_STATUS_FINISHED || lottery.numeroSorteado) {
      throw new HttpsError('failed-precondition', 'Sorteio ja finalizado.');
    }
    if (!allowEarlyDraw && lottery.dataSorteio?.toDate && lottery.dataSorteio.toDate().getTime() > Date.now()) {
      throw new HttpsError('failed-precondition', 'Data do sorteio ainda nao foi atingida.');
    }

    const winnerRef = db.doc(`sorteios/${sorteioId}/numeros/${winnerDoc.id}`);
    const winnerSnap = await tx.get(winnerRef);
    if (!winnerSnap.exists || winnerSnap.data().status !== 'vendido') {
      throw new HttpsError('aborted', 'Numero sorteado perdeu elegibilidade durante a transacao. Tente novamente.');
    }

    tx.update(lotteryRef, {
      ...lotteryStatusPayload(LOTTERY_STATUS_FINISHED),
      ganhadorId: winner.clienteId || null,
      numeroSorteado: winnerDoc.id,
      resultado: {
        numero: winnerDoc.id,
        clienteId: winner.clienteId || null,
        vendedorId: winner.vendedorId || null,
        randomIndex,
        algoritmo: 'crypto.randomInt',
        sorteadoPor: adminProfile.id,
        timestamp: FieldValue.serverTimestamp()
      },
      ...touchTimestamp()
    });

    await audit(tx, {
      acao: 'sorteio_realizado',
      detalhes: 'Sorteio oficial concluido',
      userId: adminProfile.id,
      dadosRelevantes: { sorteioId, numeroSorteado: winnerDoc.id, randomIndex, totalVendidos: soldDocs.length }
    });
  }, { maxAttempts: 3, baseDelayMs: 100 });

  const lotteryAfter = await lotteryRef.get();
  return {
    sorteioId,
    numero: lotteryAfter.data().numeroSorteado,
    ganhadorId: lotteryAfter.data().ganhadorId || null
  };
});

exports.exportarVendasCSV = onCall(async (request) => {
  const caller = await assertRole(request.auth?.uid, [ROLE_ADMIN]);
  await consumeRateLimit(request, caller.id, 'exportarVendasCSV', { limit: 6, windowSeconds: 60 });
  const { sorteioId } = request.data || {};
  if (!sorteioId) throw new HttpsError('invalid-argument', 'Sorteio obrigatorio.');

  const [statusSnapshot, legacySnapshot] = await Promise.all([
    db.collection('vendas')
      .where('sorteioId', '==', sorteioId)
      .where('status', '==', PAYMENT_PAID)
      .orderBy('criadoEm', 'desc')
      .get(),
    db.collection('vendas')
      .where('sorteioId', '==', sorteioId)
      .where('statusPagamento', '==', PAYMENT_PAID)
      .orderBy('criadoEm', 'desc')
      .get()
  ]);

  const merged = new Map();
  [...statusSnapshot.docs, ...legacySnapshot.docs].forEach((doc) => {
    merged.set(doc.id, doc);
  });
  const sales = Array.from(merged.values());

  const lines = [
    'vendaId,numero,clienteId,clienteNome,vendedorId,vendedorNome,valor,status,formaPagamento,criadoEm'
  ];

  sales.forEach((doc) => {
    const item = doc.data();
    const row = [
      doc.id,
      item.numero,
      item.clienteId,
      item.clienteNome,
      item.vendedorId,
      item.vendedorNome,
      moneyNumber(item.valor).toFixed(2),
      getSaleStatus(item),
      item.formaPagamento || '',
      item.criadoEm?.toDate?.().toISOString?.() || ''
    ]
      .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
      .join(',');

    lines.push(row);
  });

  const csvContent = lines.join('\n');

  if (IS_FUNCTIONS_EMULATOR && !ALLOW_EXTERNAL_SERVICES) {
    return {
      filePath: `emulator://exports/sorteios/${sorteioId}/vendas.csv`,
      filename: `vendas-${sorteioId}.csv`,
      totalVendas: sales.length,
      downloadUrl: null,
      csvBase64: Buffer.from(csvContent, 'utf8').toString('base64')
    };
  }

  const bucket = admin.storage().bucket();
  const filePath = `exports/sorteios/${sorteioId}/vendas-${Date.now()}.csv`;

  await bucket.file(filePath).save(csvContent, {
    contentType: 'text/csv; charset=utf-8',
    resumable: false,
    metadata: {
      cacheControl: 'private, max-age=60'
    }
  });

  const [downloadUrl] = await bucket.file(filePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000
  });

  return {
    filePath,
    filename: `vendas-${sorteioId}.csv`,
    totalVendas: sales.length,
    downloadUrl
  };
});

exports.recalcularMetricasSorteio = onCall(async (request) => {
  await assertRole(request.auth?.uid, [ROLE_ADMIN]);
  const { sorteioId } = request.data || {};
  if (!sorteioId) throw new HttpsError('invalid-argument', 'Sorteio obrigatorio.');

  const [salesSnapshot, soldSnapshot, availableSnapshot] = await Promise.all([
    db.collection('vendas').where('sorteioId', '==', sorteioId).get(),
    db.collection(`sorteios/${sorteioId}/numeros`).where('status', '==', 'vendido').get(),
    db.collection(`sorteios/${sorteioId}/numeros`).where('status', '==', 'disponivel').get()
  ]);

  const paidSales = [];
  const pendingSales = [];
  salesSnapshot.docs.forEach((doc) => {
    const sale = doc.data();
    const status = getSaleStatus(sale);
    if (status === PAYMENT_PAID) paidSales.push(sale);
    if (status === PAYMENT_PENDING) pendingSales.push(sale);
  });

  const valorPago = paidSales.reduce((sum, sale) => sum + moneyNumber(sale.valor), 0);
  const valorPendente = pendingSales.reduce((sum, sale) => sum + moneyNumber(sale.valor), 0);

  const metrics = {
    pagos: paidSales.length,
    pendentes: pendingSales.length,
    vendidos: soldSnapshot.size,
    disponiveis: availableSnapshot.size,
    valorPago,
    valorPendente,
    atualizadoEm: FieldValue.serverTimestamp()
  };

  await db.doc(`sorteios/${sorteioId}/metrics/current`).set(metrics, { merge: true });
  await db.doc(`sorteios/${sorteioId}`).set({ metrics, metricas: metrics, ...touchTimestamp() }, { merge: true });

  return { sorteioId, metrics: { ...metrics, atualizadoEm: undefined } };
});

exports.reativarTodasVendas = onCall(async (request) => {
  const adminProfile = await assertRole(request.auth?.uid, [ROLE_ADMIN]);
  await consumeRateLimit(request, adminProfile.id, 'reativarTodasVendas', { limit: 10, windowSeconds: 60 });
  const { sorteioId } = request.data || {};
  if (!sorteioId) throw new HttpsError('invalid-argument', 'Sorteio obrigatorio.');

  await db.runTransaction(async (tx) => {
    const lotteryRef = db.doc(`sorteios/${sorteioId}`);
    const snap = await tx.get(lotteryRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Sorteio nao encontrado.');

    tx.update(lotteryRef, {
      ...lotteryStatusPayload(LOTTERY_STATUS_OPEN),
      vendasAtivas: true,
      ...touchTimestamp()
    });

    await audit(tx, {
      acao: 'vendas_reativadas',
      detalhes: 'Admin reabriu vendas do sorteio',
      userId: adminProfile.id,
      dadosRelevantes: { sorteioId }
    });
  });

  return { ok: true };
});

exports.bootstrapDevData = onCall(async (request) => {
  if (!IS_FUNCTIONS_EMULATOR) {
    throw new HttpsError('permission-denied', 'Bootstrap permitido apenas no emulador.');
  }

  const secret = String(request.data?.secret || '');
  if (secret !== DEV_BOOTSTRAP_SECRET) {
    throw new HttpsError('permission-denied', 'Chave de bootstrap invalida.');
  }

  const devUsers = [
    { role: ROLE_ADMIN, email: 'admin@dev.local', password: '123456', nome: 'Administrador Dev' },
    { role: ROLE_SELLER, email: 'vendedor@dev.local', password: '123456', nome: 'Iris Vendedora' },
    { role: ROLE_CLIENT, email: 'cliente@dev.local', password: '123456', nome: 'Alan Gesso' }
  ];

  const ids = {};
  for (const user of devUsers) {
    const authUser = await upsertAuthUserByEmail(user.email, user.password, user.nome);
    ids[user.role] = authUser.uid;

    await db.doc(`usuarios/${authUser.uid}`).set({
      nome: user.nome,
      email: user.email,
      tipo: user.role,
      status: 'ativo',
      telefone: '',
      ...touchTimestamp()
    }, { merge: true });
  }

  await db.doc('configuracoes/app').set({
    nome: 'Estilo da Sorte',
    ambiente: 'dev',
    ...touchTimestamp()
  }, { merge: true });

  const lotteryRef = db.doc('sorteios/sorteio-dev-001');
  await lotteryRef.set({
    titulo: 'Sorteio Dev 001',
    descricao: 'Lote base para desenvolvimento',
    dataSorteioText: '30/04/2026',
    dataSorteio: parseBrazilianDateToTimestamp('30/04/2026'),
    premioDinheiro: 2500,
    valorBilhete: 2,
    chances: 20,
    quantidadeNumeros: 300,
    numeroInicial: 1,
    numeroFinal: 300,
    criadoPor: ids[ROLE_ADMIN] || '',
    ...lotteryStatusPayload(LOTTERY_STATUS_OPEN),
    ...touchTimestamp()
  }, { merge: true });

  const numbersSnap = await lotteryRef.collection('numeros').limit(1).get();
  if (numbersSnap.empty) {
    let batch = db.batch();
    let pending = 0;
    for (let i = 1; i <= 300; i += 1) {
      const numberId = String(i).padStart(6, '0');
      batch.set(lotteryRef.collection('numeros').doc(numberId), {
        numero: i,
        numeroFormatado: numberId,
        sorteioId: lotteryRef.id,
        status: 'disponivel',
        ...touchTimestamp()
      }, { merge: true });
      pending += 1;

      if (pending >= 450) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
    if (pending > 0) await batch.commit();
  }

  await db.doc('configuracoes/sorteio_atual').set({
    sorteioId: lotteryRef.id,
    ...touchTimestamp()
  }, { merge: true });

  await appendAudit({
    acao: 'bootstrap_dev_data',
    detalhes: 'Reconstrucao automatica de dados base no emulador',
    userId: 'system-dev',
    dadosRelevantes: { lotteryId: lotteryRef.id },
    timestamp: FieldValue.serverTimestamp()
  });

  return {
    ok: true,
    users: {
      admin: 'admin@dev.local',
      vendedor: 'vendedor@dev.local',
      cliente: 'cliente@dev.local'
    },
    lotteryId: lotteryRef.id
  };
});

exports.migrarSchemaFirestore = onCall(async (request) => {
  const adminProfile = await assertRole(request.auth?.uid, [ROLE_ADMIN]);
  const batchSize = Math.min(Math.max(Number(request.data?.batchSize || 120), 20), 200);
  const cursor = request.data?.cursor || {};
  const removePublicPii = request.data?.removePublicPii !== false;
  const enrichAuditMetadata = request.data?.enrichAuditMetadata !== false;

  let batch = db.batch();
  let writes = 0;
  let totalWrites = 0;

  async function queueSet(ref, payload) {
    batch.set(ref, payload, { merge: true });
    writes += 1;
    totalWrites += 1;

    if (writes >= 380) {
      await batch.commit();
      batch = db.batch();
      writes = 0;
    }
  }

  async function flushBatch() {
    if (!writes) return;
    await batch.commit();
    writes = 0;
    batch = db.batch();
  }

  await queueSet(db.doc('configuracoes/versao_banco'), {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    atualizadoEm: FieldValue.serverTimestamp(),
    atualizadoPor: adminProfile.id
  });
  await queueSet(db.doc('configuracoes/versao_app'), {
    versaoAtual: '1.0.0',
    urlAtualizacao: '',
    forcarAtualizacao: false,
    atualizadoEm: FieldValue.serverTimestamp()
  });
  await queueSet(db.doc('configuracoes/limites'), {
    expiracaoPendenciaMinutos: DEFAULT_PENDING_EXPIRATION_MINUTES,
    percentualComissaoPadrao: 0,
    atualizadoEm: FieldValue.serverTimestamp()
  });

  const nextCursor = {};
  const progress = {};

  const usersQuery = db.collection('usuarios').orderBy('__name__').limit(batchSize);
  const usersSnap = cursor.usuarios
    ? await usersQuery.startAfter(cursor.usuarios).get()
    : await usersQuery.get();
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    await queueSet(userDoc.ref, {
      criadoEm: data.criadoEm || data.createdAt || FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
      createdAt: data.createdAt || data.criadoEm || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      status: data.status || 'ativo'
    });
  }
  progress.usuarios = usersSnap.size;
  if (usersSnap.docs.length) nextCursor.usuarios = usersSnap.docs[usersSnap.docs.length - 1].id;

  const lotteriesQuery = db.collection('sorteios').orderBy('__name__').limit(batchSize);
  const lotteriesSnap = cursor.sorteios
    ? await lotteriesQuery.startAfter(cursor.sorteios).get()
    : await lotteriesQuery.get();
  for (const lotteryDoc of lotteriesSnap.docs) {
    const data = lotteryDoc.data();
    const normalizedStatus = normalizeLotteryStatus(data.status || LOTTERY_STATUS_DRAFT);
    const year = data.dataSorteio?.toDate?.().getFullYear?.() || new Date().getFullYear();
    await queueSet(lotteryDoc.ref, {
      ...lotteryStatusPayload(normalizedStatus),
      codigoSorteio: data.codigoSorteio || `SS-${year}-${lotteryDoc.id.slice(-4).toUpperCase()}`,
      metaArrecadacao: data.metaArrecadacao ?? null,
      permiteVendaAutomatica: Boolean(data.permiteVendaAutomatica || false),
      termosCondicoes: data.termosCondicoes || '',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      atualizadoEm: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  progress.sorteios = lotteriesSnap.size;
  if (lotteriesSnap.docs.length) nextCursor.sorteios = lotteriesSnap.docs[lotteriesSnap.docs.length - 1].id;

  const salesQuery = db.collection('vendas').orderBy('__name__').limit(batchSize);
  const salesSnap = cursor.vendas
    ? await salesQuery.startAfter(cursor.vendas).get()
    : await salesQuery.get();
  for (const saleDoc of salesSnap.docs) {
    const sale = saleDoc.data();
    const status = getSaleStatus(sale);
    const quantity = Number(sale.quantidade || (Array.isArray(sale.numeros) ? sale.numeros.length : 1));
    const total = moneyNumber(sale.valorTotal || sale.valor || 0);
    const unit = quantity > 0 ? moneyNumber(sale.valorUnitario || (total / quantity)) : moneyNumber(sale.valorUnitario || 0);
    await queueSet(saleDoc.ref, {
      ...saleStatusPayload(status),
      quantidade: quantity,
      numeros: sale.numeros || [sale.numero].filter(Boolean),
      valorUnitario: unit,
      valorTotal: total,
      comissaoAplicada: Number(sale.comissaoAplicada ?? 0),
      canceladoPor: sale.canceladoPor || null,
      motivoCancelamento: sale.motivoCancelamento || sale.cancelReason || null,
      atualizadoEm: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  progress.vendas = salesSnap.size;
  if (salesSnap.docs.length) nextCursor.vendas = salesSnap.docs[salesSnap.docs.length - 1].id;

  const numbersQuery = db.collectionGroup('numeros').orderBy('__name__').limit(batchSize);
  const numbersSnap = cursor.numeros
    ? await numbersQuery.startAfter(cursor.numeros).get()
    : await numbersQuery.get();
  for (const numberDoc of numbersSnap.docs) {
    const data = numberDoc.data();
    const pathParts = numberDoc.ref.path.split('/');
    const sorteioId = pathParts[1] || data.sorteioId || null;
    const expirationDate = data.reservadoEm?.toDate?.()
      ? new Date(data.reservadoEm.toDate().getTime() + DEFAULT_PENDING_EXPIRATION_MINUTES * 60 * 1000)
      : null;

    const basePayload = {
      sorteioId,
      reservadoEm: data.reservadoEm || null,
      expiracaoReserva: data.expiracaoReserva || (expirationDate ? Timestamp.fromDate(expirationDate) : null),
      atualizadoEm: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    if (removePublicPii) {
      basePayload.cpfCliente = FieldValue.delete();
      basePayload.telefoneCliente = FieldValue.delete();
    }

    await queueSet(numberDoc.ref, basePayload);
  }
  progress.numeros = numbersSnap.size;
  if (numbersSnap.docs.length) nextCursor.numeros = numbersSnap.docs[numbersSnap.docs.length - 1].ref.path;

  const participantsQuery = db.collectionGroup('participantes').orderBy('__name__').limit(batchSize);
  const participantsSnap = cursor.participantes
    ? await participantsQuery.startAfter(cursor.participantes).get()
    : await participantsQuery.get();
  for (const participantDoc of participantsSnap.docs) {
    const data = participantDoc.data();
    const pathParts = participantDoc.ref.path.split('/');
    const sorteioId = pathParts[1] || data.sorteioId || null;
    const participantPayload = {
      sorteioId,
      vendasIds: Array.isArray(data.vendasIds) ? data.vendasIds : [],
      nomeCliente: data.nomeCliente || data.nome || '',
      ultimaCompraEm: data.ultimaCompraEm || data.updatedAt || data.atualizadoEm || null,
      atualizadoEm: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    if (removePublicPii) {
      participantPayload.cpf = FieldValue.delete();
      participantPayload.telefone = FieldValue.delete();
    }

    await queueSet(participantDoc.ref, participantPayload);
  }
  progress.participantes = participantsSnap.size;
  if (participantsSnap.docs.length) nextCursor.participantes = participantsSnap.docs[participantsSnap.docs.length - 1].ref.path;

  if (enrichAuditMetadata) {
    const auditQuery = db.collection('auditoria').orderBy('__name__').limit(batchSize);
    const auditSnap = cursor.auditoria
      ? await auditQuery.startAfter(cursor.auditoria).get()
      : await auditQuery.get();

    for (const logDoc of auditSnap.docs) {
      const data = logDoc.data();
      const action = String(data.acao || '').toLowerCase();
      let entidadeTipo = data.entidadeTipo || 'sistema';
      let entidadeId = data.entidadeId || '';

      if (action.includes('venda')) {
        entidadeTipo = 'venda';
        entidadeId = entidadeId || String(data.dadosRelevantes?.vendaId || data.vendaId || '');
      } else if (action.includes('sorteio')) {
        entidadeTipo = 'sorteio';
        entidadeId = entidadeId || String(data.dadosRelevantes?.sorteioId || '');
      } else if (action.includes('vendedor') || action.includes('cliente') || action.includes('usuario')) {
        entidadeTipo = 'usuario';
        entidadeId = entidadeId || String(data.dadosRelevantes?.vendedorId || data.dadosRelevantes?.clienteId || data.usuarioId || data.userId || '');
      }

      await queueSet(logDoc.ref, {
        entidadeTipo,
        entidadeId,
        source: data.source || 'callable',
        timestamp: data.timestamp || FieldValue.serverTimestamp(),
        createdAt: data.createdAt || data.timestamp || FieldValue.serverTimestamp()
      });
    }

    progress.auditoria = auditSnap.size;
    if (auditSnap.docs.length) nextCursor.auditoria = auditSnap.docs[auditSnap.docs.length - 1].id;
  }

  await flushBatch();

  await appendAudit({
    acao: 'migracao_schema_firestore',
    detalhes: 'Migracao incremental de schema executada por callable',
    userId: adminProfile.id,
    dadosRelevantes: { batchSize, progress, nextCursor, schemaVersion: CURRENT_SCHEMA_VERSION, totalWrites },
    timestamp: FieldValue.serverTimestamp()
  });

  const hasMore = Object.values(progress).some((count) => count === batchSize);
  return {
    ok: true,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    totalWrites,
    progress,
    nextCursor,
    hasMore
  };
});
exports.exportarVendasCsv = exports.exportarVendasCSV;



