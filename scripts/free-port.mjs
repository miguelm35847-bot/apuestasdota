#!/usr/bin/env node
/**
 * Libera un puerto local ocupado por un servidor de Next.js.
 *
 *   node scripts/free-port.mjs 3000
 *
 * Solo detiene procesos cuya línea de comando contenga "next" (o "npm run
 * start/dev" de este proyecto). Si el puerto lo ocupa otro programa, avisa
 * y no lo mata.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const puerto = Number(process.argv[2] ?? 3000);
if (!Number.isInteger(puerto) || puerto <= 0) {
  console.error('Uso: node scripts/free-port.mjs <puerto>');
  process.exit(2);
}

function netstat() {
  return new Promise((resolve) => {
    execFile('netstat', ['-ano'], { windowsHide: true }, (error, stdout) => {
      resolve(error ? '' : stdout);
    });
  });
}

async function lineaComando(pid) {
  try {
    const { stdout } = await run(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}").CommandLine`,
      ],
      { windowsHide: true }
    );
    return stdout.trim();
  } catch {
    return '';
  }
}

async function detener(pid) {
  await new Promise((resolve) => {
    execFile('taskkill', ['/PID', String(pid), '/F'], { windowsHide: true }, () => resolve());
  });
}

const salida = await netstat();
const patron = new RegExp(`^\\s*TCP\\s+\\S+:${puerto}\\s+\\S+\\s+LISTENING\\s+(\\d+)\\s*$`, 'gim');
const pids = [...salida.matchAll(patron)].map((m) => Number(m[1]));
const unicos = [...new Set(pids)];

if (unicos.length === 0) {
  console.log(`[ok] El puerto ${puerto} ya está libre.`);
  process.exit(0);
}

for (const pid of unicos) {
  const cmd = await lineaComando(pid);
  const esNext = /next/i.test(cmd) || /next/i.test(cmd);

  if (!esNext) {
    console.log(`[aviso] El puerto ${puerto} lo usa el PID ${pid}, pero no parece de Next.js:`);
    console.log(`        ${cmd || '(sin línea de comando)'}`);
    continue;
  }

  console.log(`[info] Deteniendo PID ${pid} en el puerto ${puerto}: ${cmd || '(next)'}`);
  await detener(pid);
  console.log(`[ok] Puerto ${puerto} liberado.`);
}
