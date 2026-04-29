const { execSync } = require('child_process');

function parseMajor(output) {
  const match = String(output).match(/version\s+"(\d+)(?:\.\d+)?/i);
  if (!match) return null;
  return Number(match[1]);
}

try {
  const out = execSync('java -version 2>&1', { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  const major = parseMajor(out);
  if (!major) {
    console.warn('[java-check] Nao foi possivel detectar a versao do Java.');
    process.exit(0);
  }

  // Emuladores Firebase sao mais estaveis em LTS (17/21).
  if (major >= 25) {
    console.error(
      `[java-check] Java ${major} detectado. Use JDK 17 ou 21 para rodar Firestore Emulator com estabilidade.`
    );
    process.exit(1);
  }

  console.log(`[java-check] Java ${major} OK para testes de emulador.`);
  process.exit(0);
} catch (error) {
  console.error('[java-check] Java nao encontrado no PATH.');
  process.exit(1);
}

