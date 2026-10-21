#!/usr/bin/env node
/**
 * Utilidades compartidas por el QA de datos y flujos.
 *
 * No imprime credenciales ni tokens. Usa la API REST de Supabase:
 *   - service_role para preparar y limpiar datos de prueba;
 *   - anon + password grant para actuar como jugador real.
 */

import { readFile, appendFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

async function cargarEnvLocal() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  try {
    const texto = await readFile('.env.local', 'utf8');
    for (const linea of texto.split(/\r?\n/)) {
      const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/.exec(linea);
      if (!m) continue;
      const valor = m[2].replace(/^["']|["']$/g, '');
      if (!(m[1] in process.env)) process.env[m[1]] = valor;
    }
  } catch {
    // Sin .env.local: los scripts de npm lo cargan con --env-file-if-exists.
  }
}

await cargarEnvLocal();

function requerir(nombre) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta ${nombre} en .env.local`);
  return valor;
}

export const SUPABASE_URL = requerir('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
export const ANON_KEY = requerir('NEXT_PUBLIC_SUPABASE_ANON_KEY');
export const SERVICE_KEY = requerir('SUPABASE_SERVICE_ROLE_KEY');
export const APP_BASE = (process.env.QA_BASE ?? 'http://127.0.0.1:3001').replace(/\/$/, '');

export const ADMIN_EMAIL = 'qa-admin@kodigodota.test';
export const ADMIN_NICK = 'qa-admin';
export const PLAYER_EMAIL = (n) => `qa-p${n}@kodigodota.test`;
export const PLAYER_NICK = (n) => `qa-p${n}`;
export const PREFIJO_QA = 'qa-';

export function passwordQa() {
  const existente = process.env.QA_PASSWORD;
  if (existente) return existente;
  const generada = randomBytes(18).toString('base64url');
  process.env.QA_PASSWORD = generada;
  return generada;
}

export async function guardarPasswordEnEnv(password) {
  if (process.env.QA_PASSWORD === password) {
    const texto = await readFile('.env.local', 'utf8').catch(() => '');
    if (/^QA_PASSWORD=/m.test(texto)) return false;
  }
  await appendFile('.env.local', `\nQA_PASSWORD=${password}\n`, 'utf8');
  process.env.QA_PASSWORD = password;
  return true;
}

function cabeceras(key, token, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${token ?? key}`,
    ...extra,
  };
}

export async function pedir(url, { method = 'GET', headers = {}, body, timeout = 20000 } = {}) {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), timeout);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: control.signal,
    });
    const texto = await res.text();
    let data = null;
    if (texto) {
      try {
        data = JSON.parse(texto);
      } catch {
        data = texto;
      }
    }
    return { status: res.status, ok: res.ok, headers: res.headers, data, texto };
  } finally {
    clearTimeout(temporizador);
  }
}

export async function rest(ruta, { method = 'GET', body, token, key = SERVICE_KEY, prefer } = {}) {
  const headers = cabeceras(key, token, body !== undefined ? { 'Content-Type': 'application/json' } : {});
  if (prefer) headers.Prefer = prefer;
  return pedir(`${SUPABASE_URL}/rest/v1/${ruta}`, { method, headers, body });
}

export async function rpc(token, nombre, args = {}) {
  const res = await rest(`rpc/${nombre}`, { method: 'POST', body: args, token, key: ANON_KEY });
  if (!res.ok) {
    const mensaje = res.data?.message ?? res.data?.hint ?? `HTTP ${res.status}`;
    throw new Error(`${nombre}: ${mensaje}`);
  }
  return res.data;
}

export async function rpcSeguro(token, nombre, args = {}) {
  try {
    const data = await rpc(token, nombre, args);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function rpcServicio(nombre, args = {}) {
  const res = await rest(`rpc/${nombre}`, { method: 'POST', body: args, key: SERVICE_KEY });
  if (!res.ok) {
    const mensaje = res.data?.message ?? res.data?.hint ?? `HTTP ${res.status}`;
    throw new Error(`${nombre}: ${mensaje}`);
  }
  return res.data;
}

export async function login(email, password = process.env.QA_PASSWORD) {
  if (!password) throw new Error('Falta QA_PASSWORD');
  const res = await pedir(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: { email, password },
  });
  if (!res.ok) {
    const mensaje = res.data?.error_description ?? res.data?.msg ?? res.data?.message ?? `HTTP ${res.status}`;
    throw new Error(`No se pudo entrar como ${email}: ${mensaje}`);
  }
  return res.data;
}

function cabecerasAdmin() {
  return cabeceras(SERVICE_KEY);
}

export async function crearUsuarioAuth(email, password) {
  const res = await pedir(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { ...cabecerasAdmin(), 'Content-Type': 'application/json' },
    body: { email, password, email_confirm: true },
  });
  if (res.ok) return res.data;
  if (res.status === 422 || res.status === 400) {
    const existente = await buscarUsuarioPorEmail(email);
    if (existente) return existente;
  }
  throw new Error(`crear usuario ${email}: ${res.data?.msg ?? res.data?.message ?? res.status}`);
}

export async function listarUsuariosAuth() {
  const usuarios = [];
  for (let pagina = 1; pagina <= 20; pagina++) {
    const res = await pedir(`${SUPABASE_URL}/auth/v1/admin/users?page=${pagina}&per_page=100`, {
      headers: cabecerasAdmin(),
    });
    if (!res.ok) throw new Error(`listar usuarios: ${res.data?.message ?? res.status}`);
    const lote = res.data?.users ?? [];
    usuarios.push(...lote);
    if (lote.length < 100) break;
  }
  return usuarios;
}

export async function buscarUsuarioPorEmail(email) {
  const objetivo = email.toLowerCase();
  return (await listarUsuariosAuth()).find((u) => (u.email ?? '').toLowerCase() === objetivo) ?? null;
}

export async function borrarUsuarioAuth(id) {
  await rest(`profiles?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });
  const res = await pedir(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: cabecerasAdmin(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`borrar usuario ${id}: ${res.data?.message ?? res.status}`);
  }
}

export async function perfilPorNick(nick) {
  const res = await rest(`profiles?nick=eq.${encodeURIComponent(nick)}&select=id,nick,rol,mmr,roles_preferidos&limit=1`);
  if (!res.ok) throw new Error(`perfil ${nick}: ${res.data?.message ?? res.status}`);
  return res.data?.[0] ?? null;
}

export async function perfilesQa() {
  const res = await rest('profiles?nick=like.qa-*&select=id,nick,rol&limit=100');
  if (!res.ok) throw new Error(`perfiles QA: ${res.data?.message ?? res.status}`);
  return res.data ?? [];
}

export async function actualizarPerfil(id, campos) {
  const res = await rest(`profiles?id=eq.${id}`, {
    method: 'PATCH',
    body: campos,
    prefer: 'return=minimal',
  });
  if (!res.ok) throw new Error(`actualizar perfil ${id}: ${res.data?.message ?? res.status}`);
}

export async function insertarMovimiento({ userId, tipo, monto, descripcion, referenciaId = null, creadoPor = null }) {
  const res = await rest('movimientos_billetera', {
    method: 'POST',
    body: {
      user_id: userId,
      tipo,
      monto,
      referencia_id: referenciaId,
      descripcion,
      creado_por: creadoPor,
    },
    prefer: 'return=minimal',
  });
  if (!res.ok) throw new Error(`movimiento ${tipo}: ${res.data?.message ?? res.status}`);
}

export async function movimientosDe(userId) {
  const res = await rest(
    `movimientos_billetera?user_id=eq.${userId}&select=id,tipo,monto,descripcion,referencia_id&order=created_at.asc&limit=1000`,
  );
  if (!res.ok) throw new Error(`movimientos de ${userId}: ${res.data?.message ?? res.status}`);
  return res.data ?? [];
}

export async function saldoDe(userId) {
  return (await movimientosDe(userId)).reduce((total, m) => total + Number(m.monto), 0);
}

export async function saldoActor(token) {
  const data = await rpc(token, 'mi_saldo');
  return Number(data ?? 0);
}

export async function salaPorId(id) {
  const res = await rest(`salas?id=eq.${id}&select=*&limit=1`);
  if (!res.ok) throw new Error(`sala ${id}: ${res.data?.message ?? res.status}`);
  return res.data?.[0] ?? null;
}

export async function salaPorNombre(nombre) {
  const res = await rest(`salas?nombre=eq.${encodeURIComponent(nombre)}&select=*&order=created_at.desc&limit=1`);
  if (!res.ok) throw new Error(`sala ${nombre}: ${res.data?.message ?? res.status}`);
  return res.data?.[0] ?? null;
}

export async function participantesDe(salaId) {
  const res = await rest(
    `participantes_sala?sala_id=eq.${salaId}&select=user_id,equipo,es_capitan,pick_orden&order=created_at.asc`,
  );
  if (!res.ok) throw new Error(`participantes de ${salaId}: ${res.data?.message ?? res.status}`);
  return res.data ?? [];
}

export async function lobbyDe(salaId, token) {
  const res = await rest(`lobbies?sala_id=eq.${salaId}&select=*&limit=1`, {
    token,
    key: ANON_KEY,
  });
  if (!res.ok) throw new Error(`lobby de ${salaId}: ${res.data?.message ?? res.status}`);
  return res.data?.[0] ?? null;
}

export async function notificacionesDe(userId, token) {
  const res = await rest(
    `notificaciones?user_id=eq.${userId}&select=id,tipo,mensaje,leida&order=created_at.desc&limit=50`,
    { token, key: ANON_KEY },
  );
  if (!res.ok) throw new Error(`notificaciones de ${userId}: ${res.data?.message ?? res.status}`);
  return res.data ?? [];
}

export async function crearSala(adminToken, { nombre, cuota = 1000, cupo = 2, comisionBp = 0 }) {
  await rpc(adminToken, 'crear_sala', {
    p_nombre: nombre,
    p_cuota: cuota,
    p_cupo: cupo,
    p_comision_bp: comisionBp,
  });
  const sala = await salaPorNombre(nombre);
  if (!sala) throw new Error(`No se encontró la sala recién creada: ${nombre}`);
  return sala;
}

export async function unir(token, salaId) {
  await rpc(token, 'unirse_a_sala', { p_sala: salaId });
}

export async function definirLobby(adminToken, salaId, nombre = 'QA Lobby', clave = 'qa1234') {
  await rpc(adminToken, 'definir_lobby', { p_sala: salaId, p_nombre: nombre, p_clave: clave });
}

export async function cancelarSala(adminToken, salaId) {
  try {
    await rpc(adminToken, 'cancelar_sala', { p_sala: salaId });
  } catch (error) {
    if (!/p_motivo|Could not find the function/i.test(error.message)) throw error;
    await rpc(adminToken, 'cancelar_sala', { p_sala: salaId, p_motivo: 'QA' });
  }
}

export async function eliminarSalaForzada(salaId) {
  for (const ruta of [
    `participantes_sala?sala_id=eq.${salaId}`,
    `mensajes_chat?sala_id=eq.${salaId}`,
    `lobbies?sala_id=eq.${salaId}`,
    `partidas?sala_id=eq.${salaId}`,
    `salas?id=eq.${salaId}`,
  ]) {
    const res = await rest(ruta, { method: 'DELETE', prefer: 'return=minimal' });
    if (!res.ok && res.status !== 404) {
      throw new Error(res.data?.message ?? `no se pudo borrar ${ruta}`);
    }
  }
}

export async function limpiarSala(salaId, adminToken) {
  try {
    await cancelarSala(adminToken, salaId);
    return 'cancelada';
  } catch {
    try {
      await rest(`salas?id=eq.${salaId}`, {
        method: 'PATCH',
        body: { picks_estado: 'inactivo' },
        prefer: 'return=minimal',
      });
    } catch {
      // El borrado forzado puede fallar si el trigger de picks sigue activo.
    }
    await eliminarSalaForzada(salaId);
    return 'eliminada';
  }
}

export async function limpiarDatosQa() {
  try {
    const data = await rpcServicio('qa_cleanup');
    return {
      perfiles: Number(data?.perfiles ?? 0),
      salas: Number(data?.salas ?? 0),
    };
  } catch (error) {
    if (/PGRST202|Could not find the function/i.test(error.message)) {
      throw new Error(
        'falta aplicar docs/sql/2026-10-21-qa-hallazgos.sql (función qa_cleanup) antes de limpiar',
      );
    }
    if (/movimientos.*no se pueden modificar ni borrar/i.test(error.message)) {
      throw new Error(
        'qa_cleanup está desactualizada: vuelve a aplicar la función de docs/sql/2026-10-21-qa-hallazgos.sql (deshabilita el trigger de movimientos durante la limpieza)',
      );
    }
    throw error;
  }
}

export function assert(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

export async function paso(nombre, fn) {
  const inicio = Date.now();
  const detalle = await fn();
  const sufijo = typeof detalle === 'string' && detalle ? ` — ${detalle}` : '';
  console.log(`[ok] ${nombre}${sufijo} (${Date.now() - inicio} ms)`);
  return detalle;
}

export function fallo(nombre, error) {
  const mensaje = error instanceof Error ? error.message : String(error);
  console.error(`[FALLA] ${nombre}: ${mensaje}`);
}

export function resumen(fallos, total) {
  if (fallos === 0) {
    console.log(`\n${total} comprobaciones OK.`);
    return 0;
  }
  console.error(`\n${fallos} de ${total} comprobaciones fallaron.`);
  return 1;
}
