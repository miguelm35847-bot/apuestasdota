#!/usr/bin/env node
/**
 * Crea (o reutiliza) las cuentas QA en Supabase y les asigna saldo de prueba.
 *
 *   npm run qa:seed
 *   npm run qa:cleanup
 *
 * Las cuentas usan el mismo QA_PASSWORD de .env.local. Si no existe, se
 * genera uno y se agrega al archivo (que está en .gitignore). Todos los nicks
 * empiezan con "qa-" y la limpieza solo toca esos perfiles y las salas "QA ".
 */

import { appendFile, readFile } from 'node:fs/promises';
import {
  ADMIN_EMAIL,
  ADMIN_NICK,
  PLAYER_EMAIL,
  PLAYER_NICK,
  actualizarPerfil,
  assert,
  crearUsuarioAuth,
  limpiarDatosQa,
  login,
  movimientosDe,
  passwordQa,
  perfilPorNick,
  rpc,
} from './lib.mjs';

const SALDO_INICIAL = 10000;
const STEAM_QA_BASE = 76561198000000000n;
const ROLES = [
  ['carry'],
  ['mid'],
  ['off'],
  ['roamer'],
  ['support'],
  ['carry', 'mid'],
  ['off', 'roamer'],
  ['support', 'mid'],
  ['carry', 'support'],
  ['off', 'support'],
];

async function asegurarPassword() {
  const password = passwordQa();
  const texto = await readFile('.env.local', 'utf8').catch(() => '');
  if (!/^QA_PASSWORD=/m.test(texto)) {
    await appendFile('.env.local', `\nQA_PASSWORD=${password}\n`, 'utf8');
    console.log('[ok] QA_PASSWORD generado y guardado en .env.local');
  }
  return password;
}

async function asegurarSaldo(userId, nick, actorToken, adminToken) {
  const movimientos = await movimientosDe(userId);
  const saldo = movimientos.reduce((total, m) => total + Number(m.monto), 0);
  if (saldo >= SALDO_INICIAL) {
    console.log(`[ok] ${nick} — saldo S/ ${(saldo / 100).toFixed(2)}`);
    return;
  }

  // El service_role no puede insertar movimientos: usamos el flujo real de
  // recarga (jugador solicita, admin aprueba) para acreditar saldo.
  const monto = SALDO_INICIAL - saldo;
  const operacion = `QA-${nick}-${Date.now().toString(36)}`;
  const recargaId = await rpc(actorToken, 'crear_recarga', {
    p_monto: monto,
    p_numero_operacion: operacion,
    p_captura_path: 'qa/seed.png',
  });
  assert(typeof recargaId === 'string' && recargaId, `no se creó la recarga de ${nick}`);
  await rpc(adminToken, 'aprobar_recarga', { p_recarga: recargaId });

  const luego = (await movimientosDe(userId)).reduce((total, m) => total + Number(m.monto), 0);
  assert(luego >= SALDO_INICIAL, `saldo de ${nick} quedó en ${luego}`);
  console.log(`[ok] ${nick} — saldo S/ ${(luego / 100).toFixed(2)}`);
}

async function sembrarCuenta({ email, nick, rol, roles = [], indice }) {
  let perfil = await perfilPorNick(nick);
  const steamId = String(STEAM_QA_BASE + BigInt(indice));

  if (!perfil) {
    const usuario = await crearUsuarioAuth(email, process.env.QA_PASSWORD);
    assert(usuario?.id, `No se pudo crear la cuenta ${email}`);
    await actualizarPerfil(usuario.id, {
      nick,
      rol,
      mmr: 4500,
      roles_preferidos: roles,
      steam_id: steamId,
    });
    perfil = await perfilPorNick(nick);
    assert(perfil, `No se creó el perfil de ${nick}`);
  }

  const cambios = { nick, rol, roles_preferidos: roles, steam_id: steamId };
  if (perfil.mmr == null) cambios.mmr = 4500;
  await actualizarPerfil(perfil.id, cambios);
  return perfil.id;
}

async function sembrar() {
  const password = await asegurarPassword();

  const adminId = await sembrarCuenta({
    email: ADMIN_EMAIL,
    nick: ADMIN_NICK,
    rol: 'admin',
    indice: 100,
  });
  const admin = await login(ADMIN_EMAIL, password);
  console.log(`[ok] ${ADMIN_NICK} — administrador QA`);

  const jugadores = [];
  for (let n = 1; n <= 10; n++) {
    const email = PLAYER_EMAIL(n);
    const nick = PLAYER_NICK(n);
    const id = await sembrarCuenta({
      email,
      nick,
      rol: 'jugador',
      roles: ROLES[n - 1],
      indice: n,
    });
    const sesion = await login(email, password);
    await asegurarSaldo(id, nick, sesion.access_token, admin.access_token);
    jugadores.push({ n, id });
  }

  console.log(`\nCuentas listas: ${ADMIN_NICK} (admin) y ${jugadores.length} jugadores.`);
  console.log('Siguiente: npm run qa:probes y npm run qa:flows');
  console.log('Al terminar: npm run qa:cleanup');
  return { adminId, jugadores };
}

async function limpiar() {
  const { perfiles, salas } = await limpiarDatosQa();
  console.log(`[ok] ${perfiles} perfiles QA y ${salas} salas QA eliminados.`);
}

const ayuda = `Uso: node scripts/qa/seed.mjs [--cleanup]

  (sin argumentos)  Crea o reutiliza qa-admin y qa-p1..qa-p10.
  --cleanup         Borra perfiles, salas y movimientos de las cuentas qa-*.

Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.
`;

const arg = process.argv[2];
if (arg === '--help' || arg === '-h') {
  console.log(ayuda);
} else if (arg === '--cleanup') {
  await limpiar().catch((error) => {
    console.error(`[FALLA] limpieza: ${error.message}`);
    process.exitCode = 1;
  });
} else if (arg) {
  console.error(`Opción desconocida: ${arg}\n\n${ayuda}`);
  process.exitCode = 2;
} else {
  await sembrar().catch((error) => {
    console.error(`[FALLA] seed: ${error.message}`);
    process.exitCode = 1;
  });
}
