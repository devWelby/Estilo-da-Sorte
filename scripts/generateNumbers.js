/**
 * Gera documentos de números para um sorteio no emulador/Firestore.
 * Uso:
 *   node scripts/generateNumbers.js sorteio-2026-04-18 25000
 */
const admin = require('firebase-admin');

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'estilo-da-sorte-dev';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function main() {
  const sorteioId = process.argv[2];
  const total = Number(process.argv[3] || 1000);
  if (!sorteioId) throw new Error('Informe o sorteioId.');

  let batch = db.batch();
  for (let i = 1; i <= total; i += 1) {
    const numero = String(i).padStart(6, '0');
    batch.set(db.doc(`sorteios/${sorteioId}/numeros/${numero}`), {
      status: 'disponivel',
      sorteioId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    if (i % 400 === 0) {
      await batch.commit();
      console.log(`Gerados ${i}/${total}`);
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`Concluído: ${total} números gerados.`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
