const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');

function normalizeKeyPart(value, fallback = 'anon') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text.replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 120) || fallback;
}

async function enforceRateLimit(db, {
  action,
  uid,
  ip,
  limit = 20,
  windowSeconds = 60
} = {}) {
  const safeAction = normalizeKeyPart(action, 'action');
  const principal = uid ? `uid:${normalizeKeyPart(uid)}` : `ip:${normalizeKeyPart(ip)}`;

  const now = Date.now();
  const windowMs = Math.max(10, Number(windowSeconds || 60)) * 1000;
  const bucket = Math.floor(now / windowMs);
  const ref = db.doc(`_rate_limits/${principal}_${safeAction}_${bucket}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.data().count || 0) : 0;
    if (current >= limit) {
      throw new HttpsError('resource-exhausted', 'Muitas tentativas. Aguarde alguns segundos e tente novamente.');
    }

    tx.set(ref, {
      action: safeAction,
      principal,
      uid: uid || null,
      ip: ip || null,
      bucket,
      count: current + 1,
      expiresAt: Timestamp.fromMillis((bucket + 1) * windowMs + 60 * 1000),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

module.exports = {
  enforceRateLimit
};
