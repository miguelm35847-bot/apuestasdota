#!/usr/bin/env node
/**
 * Fase 0: probes de seguridad, contrato HTTP y esquema real.
 *
 *   npm run qa:probes
 *   npm run qa:probes -- --base http://127.0.0.1:3001
 *
 * Comprueba con la clave anon y con una sesión real que RLS/grants bloqueen
 * lo que no debe exponerse, y que las RPC/columnas que usan los flujos
 * existan en Supabase. No modifica datos.
 */

import {
  ANON_KEY,
  APP_BASE,
  SERVICE_KEY,
  SUPABASE_URL,
  assert,
  login,
  pedir,
  rest,
  resumen,
} from './lib.mjs';

const opciones = { base: APP_BASE };
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--base') opciones.base = process.argv[++i]?.replace(/\/$/, '') ?? APP_BASE;
  else if (arg === '--help' || arg === '-h') {
    console.log('Uso: node scripts/qa/probes.mjs [--base http://127.0.0.1:3001]');
    process.exit(0);
  } else {
    console.error(`Opción desconocida: ${arg}`);
    process.exit(2);
  }
}

let total = 0;
let fallos = 0;

async function comprobar(nombre, fn) {
  total++;
  try {
    const detalle = await fn();
    console.log(`[ok] ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  } catch (error) {
    fallos++;
    console.error(`[FALLA] ${nombre}: ${error instanceof Error ? error.message : error}`);
  }
}

async function denegado(nombre, fn) {
  await comprobar(nombre, async () => {
    const res = await fn();
    const codigo = res.data?.code ?? '';
    assert(
      [401, 403, 404].includes(res.status),
      `esperaba 401/403/404, recibió HTTP ${res.status}${codigo ? ` (${codigo})` : ''}`,
    );
    return `HTTP ${res.status}${codigo ? ` ${codigo}` : ''}`;
  });
}

const anon = (ruta, opciones = {}) => rest(ruta, { ...opciones, key: ANON_KEY });

console.log(`Probes contra ${SUPABASE_URL} y ${opciones.base}\n`);

// --- RLS / grants con la clave anon -----------------------------------------
await denegado('anon no lee profiles.steam_id', () => anon('profiles?select=steam_id&limit=1'));
await comprobar('anon sí lee el perfil público', async () => {
  const res = await anon('profiles?select=id,nick,mmr&limit=1');
  assert(res.ok, `HTTP ${res.status}: ${res.data?.message ?? ''}`);
  const fila = res.data?.[0];
  assert(fila && 'nick' in fila && !('steam_id' in fila), 'respuesta inesperada');
  return `${fila.nick ?? 'sin nick'}`;
});

await denegado('anon no ejecuta RPC de admin', () =>
  anon('rpc/admin_editar_mmr', { method: 'POST', body: {} }),
);
await denegado('anon no inserta movimientos', () =>
  anon('movimientos_billetera', { method: 'POST', body: {}, prefer: 'return=minimal' }),
);
await denegado('anon no inserta salas', () =>
  anon('salas', { method: 'POST', body: {}, prefer: 'return=minimal' }),
);
await denegado('anon no inserta notificaciones', () =>
  anon('notificaciones', { method: 'POST', body: {}, prefer: 'return=minimal' }),
);
await denegado('anon no inserta en el chat general', () =>
  anon('mensajes_chat', { method: 'POST', body: {}, prefer: 'return=minimal' }),
);

// --- Contrato HTTP -----------------------------------------------------------
await comprobar('cabeceras CSP y anti-clickjacking', async () => {
  const res = await pedir(`${opciones.base}/`);
  assert(res.status === 200, `la portada respondió HTTP ${res.status}`);
  const csp = res.headers.get('content-security-policy') ?? '';
  assert(csp.includes("default-src 'self'"), 'falta default-src en CSP');
  assert(!csp.includes("'unsafe-eval'"), 'CSP permite unsafe-eval');
  assert(res.headers.get('x-frame-options') === 'DENY', 'falta X-Frame-Options: DENY');
  assert(res.headers.get('x-content-type-options') === 'nosniff', 'falta X-Content-Type-Options');
  return 'CSP, frame y nosniff';
});

await comprobar('/api/steam/sync exige sesión', async () => {
  const res = await pedir(`${opciones.base}/api/steam/sync`, { method: 'POST' });
  assert(res.status === 401, `esperaba 401, recibió ${res.status}`);
  return 'HTTP 401';
});

await comprobar('/api/perfil/steam exige sesión', async () => {
  const res = await pedir(`${opciones.base}/api/perfil/steam`);
  assert(res.status === 401, `esperaba 401, recibió ${res.status}`);
  return 'HTTP 401';
});

await comprobar('/api/dota/match exige sesión', async () => {
  const res = await pedir(`${opciones.base}/api/dota/match?match_id=1`);
  assert(res.status === 401, `esperaba 401, recibió ${res.status}`);
  return 'HTTP 401';
});

let perfilPublico = null;
await comprobar('/api/jugadores/:id/links no filtra steam_id', async () => {
  const lista = await anon('profiles?select=id&limit=1');
  assert(lista.ok && lista.data?.[0]?.id, 'no hay perfiles públicos para probar');
  perfilPublico = lista.data[0].id;
  const res = await pedir(`${opciones.base}/api/jugadores/${perfilPublico}/links`);
  assert(res.status === 200, `HTTP ${res.status}`);
  assert(res.data && typeof res.data === 'object', 'respuesta no JSON');
  const claves = Object.keys(res.data).sort().join(',');
  assert(claves === 'dotabuffUrl,steamUrl', `claves inesperadas: ${claves}`);
  assert(!JSON.stringify(res.data).includes('steam_id'), 'la respuesta incluye steam_id');
  return claves;
});

await comprobar('/api/jugadores/:id/links valida el UUID', async () => {
  const res = await pedir(`${opciones.base}/api/jugadores/123/links`);
  assert(res.status === 400, `esperaba 400, recibió ${res.status}`);
  return 'HTTP 400';
});

// --- Sesión real: no debe poder escalar ni leer datos privados ---------------
let token = null;
let userId = null;
if (process.env.QA_EMAIL && process.env.QA_PASSWORD) {
  try {
    const sesion = await login(process.env.QA_EMAIL);
    token = sesion.access_token;
    userId = sesion.user?.id;
    console.log(`[ok] login QA — ${process.env.QA_EMAIL}`);
    total++;
  } catch (error) {
    fallos++;
    total++;
    console.error(`[FALLA] login QA: ${error.message}`);
  }
}

if (token) {
  const auth = (ruta, opciones = {}) => rest(ruta, { ...opciones, token, key: ANON_KEY });

  await comprobar('un jugador no lee el steam_id de otros', async () => {
    const res = await auth('profiles?select=id,steam_id&limit=200');
    if (res.status === 401 || res.status === 403) {
      return `columna revocada (HTTP ${res.status} ${res.data?.code ?? ''})`;
    }
    assert(res.ok, `HTTP ${res.status}: ${res.data?.message ?? ''}`);
    const ajenos = (res.data ?? []).filter((p) => p.id !== userId && p.steam_id);
    assert(
      ajenos.length === 0,
      `${ajenos.length} perfiles ajenos exponen steam_id (p. ej. ${ajenos[0]?.id})`,
    );
    return 'solo perfiles sin steam_id ajeno';
  });

  await denegado('un jugador no ejecuta RPC de admin', () =>
    auth('rpc/admin_editar_mmr', { method: 'POST', body: {} }),
  );
  await comprobar('un jugador no ajusta el saldo de otro', async () => {
    const res = await auth('rpc/ajuste_admin', {
      method: 'POST',
      body: { p_user: userId, p_monto: 100, p_motivo: 'intento no autorizado' },
    });
    assert(!res.ok, `esperaba error, recibió HTTP ${res.status}`);
    assert(
      /solo administradores/i.test(res.data?.message ?? ''),
      `mensaje inesperado: ${res.data?.message ?? ''}`,
    );
    return `HTTP ${res.status}`;
  });
  await denegado('un jugador no inserta movimientos', () =>
    auth('movimientos_billetera', { method: 'POST', body: {}, prefer: 'return=minimal' }),
  );
  await denegado('un jugador no cambia su rol', () =>
    auth(`profiles?id=eq.${userId}`, {
      method: 'PATCH',
      body: { rol: 'admin' },
      prefer: 'return=minimal',
    }),
  );

  await comprobar('mi_saldo responde para el jugador', async () => {
    const res = await auth('rpc/mi_saldo', { method: 'POST', body: {} });
    assert(res.ok, `HTTP ${res.status}: ${res.data?.message ?? ''}`);
    assert(typeof res.data === 'number', `tipo inesperado: ${typeof res.data}`);
    return `S/ ${(res.data / 100).toFixed(2)}`;
  });

  await comprobar('/api/perfil/steam solo devuelve el SteamID propio', async () => {
    const res = await pedir(`${opciones.base}/api/perfil/steam`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(res.status === 200, `HTTP ${res.status}`);
    assert(res.data && typeof res.data === 'object', 'respuesta no JSON');
    assert(Object.keys(res.data).join(',') === 'steamId', `claves inesperadas: ${Object.keys(res.data)}`);
    assert(
      res.data.steamId === null || typeof res.data.steamId === 'string',
      'steamId con tipo inesperado',
    );
    return res.data.steamId ? 'con Steam' : 'sin Steam';
  });
} else {
  console.log('[omitido] probes autenticados: faltan QA_EMAIL/QA_PASSWORD');
}

// --- Esquema real (service_role) --------------------------------------------
await comprobar('RPC y columnas que usan los flujos existen', async () => {
  const res = await pedir(`${SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  assert(res.ok, `OpenAPI respondió HTTP ${res.status}`);
  const spec = res.data;

  const rpcs = [
    'crear_sala',
    'unirse_a_sala',
    'elegir_lado',
    'iniciar_picks',
    'elegir_moneda',
    'pickear_jugador',
    'auto_pickear_si_vencido',
    'cancelar_picks',
    'definir_lobby',
    'cancelar_sala',
    'cerrar_partida_auto',
    'admin_editar_mmr',
    'ajuste_admin',
    'notificar_usuario',
    'admin_pedir_verificacion',
    'confirmar_verificacion',
    'admin_cancelar_verificacion',
    'notificar_sala_terminada',
    'guardar_roles_preferidos',
    'mi_saldo',
  ];
  const faltantes = rpcs.filter((nombre) => !spec.paths?.[`/rpc/${nombre}`]);
  assert(faltantes.length === 0, `faltan RPCs: ${faltantes.join(', ')}`);

  const columnas = {
    salas: ['picks_estado', 'pick_decision_user_id', 'pick_decision_tipo', 'destacada', 'verificacion_estado', 'verificacion_iniciada_at', 'verificacion_expira_at'],
    participantes_sala: ['equipo', 'es_capitan', 'pick_orden', 'verificado_at'],
    profiles: ['mmr', 'roles_preferidos'],
    movimientos_billetera: ['tipo', 'monto', 'referencia_id'],
  };
  for (const [tabla, esperadas] of Object.entries(columnas)) {
    const disponibles = Object.keys(spec.definitions?.[tabla]?.properties ?? {});
    const faltan = esperadas.filter((c) => !disponibles.includes(c));
    assert(faltan.length === 0, `${tabla} sin columnas: ${faltan.join(', ')}`);
  }

  return `${rpcs.length} RPCs y ${Object.keys(columnas).length} tablas`;
});

// La sonda de sorteo no puede verse por OpenAPI: se comprueba con un flujo 1v1.
// Dejamos una nota explícita para que el reporte no confunda "existe" con "aplicado".
console.log('\n[nota] El trigger de sorteo 1v1 se valida en `npm run qa:flows`.');

process.exit(resumen(fallos, total));
