const { execSync } = require('child_process');

const ports = [8180, 8388, 9199, 9399, 5101, 5301];

function listPidsByPort(port) {
  try {
    const output = execSync(`netstat -ano -p tcp | findstr :${port}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return Array.from(new Set(output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => /\sLISTENING\s/i.test(line))
      .map((line) => {
        const cols = line.split(/\s+/);
        return Number(cols[cols.length - 1]);
      })
      .filter((pid) => Number.isFinite(pid) && pid > 0)));
  } catch (_) {
    return [];
  }
}

for (const port of ports) {
  const pids = listPidsByPort(port);
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: ['ignore', 'ignore', 'ignore'] });
    } catch (_) {
      // ignora processo sem permissao ou ja encerrado
    }
  }
}

console.log('Portas de emulador limpas (quando necessario).');
