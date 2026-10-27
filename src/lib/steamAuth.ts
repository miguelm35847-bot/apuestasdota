'use client';

import { supabase } from '@/lib/supabase';
import { rutaRetornoSegura } from '@/lib/acceso';

const CONTEXTO = 'kodigodota-steam-acceso-v1';
const PERFIL = 'kodigodota-steam-perfil-v1';
const VIGENCIA = 600_000;
const MENSAJE = 'El acceso con Steam venció o no es válido. Vuelve a intentarlo desde este navegador.';
type Contexto = { creado: number; next: string | null; verificador?: string; userId?: string; vinculo?: boolean };
export type AccesoSteam = { userId: string; next: string | null; vinculo?: boolean };
let pendiente: Promise<AccesoSteam> | undefined;
const base64 = (datos: Uint8Array) => btoa(String.fromCharCode(...datos)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function leer(clave: string): Contexto | null {
  try {
    const valor: unknown = JSON.parse(window.sessionStorage.getItem(clave) ?? 'null');
    if (!valor || typeof valor !== 'object' || !('creado' in valor) || typeof valor.creado !== 'number'
      || valor.creado > Date.now() + 30_000 || Date.now() - valor.creado > VIGENCIA) return null;
    return valor as Contexto;
  } catch { return null; }
}

export async function iniciarAccesoSteam(vincular = false) {
  window.sessionStorage.removeItem(CONTEXTO);
  window.sessionStorage.removeItem(PERFIL);
  pendiente = undefined;
  const verificador = base64(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador))));
  const next = rutaRetornoSegura(new URLSearchParams(window.location.search).get('next'));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let userId: string | undefined;
  if (vincular) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Debes iniciar sesión antes de vincular Steam.');
    headers.Authorization = `Bearer ${session.access_token}`;
    userId = session.user.id;
  }
  window.sessionStorage.setItem(CONTEXTO, JSON.stringify({ creado: Date.now(), next, verificador, userId, vinculo: vincular }));
  try {
    const respuesta = await fetch(`/api/auth/steam/${vincular ? 'start' : 'login'}`, {
      method: 'POST', credentials: 'same-origin', headers, body: JSON.stringify({ challenge, next }),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok || typeof datos.url !== 'string') throw new Error(typeof datos.error === 'string' ? datos.error : 'Steam no está disponible.');
    const url = new URL(datos.url);
    if (url.origin !== 'https://steamcommunity.com' || url.pathname !== '/openid/login') throw new Error('Respuesta de Steam inválida.');
    window.location.assign(url.toString());
  } catch (error) { window.sessionStorage.removeItem(CONTEXTO); throw error; }
}

async function intercambiar(): Promise<AccesoSteam> {
  const error = new URLSearchParams(window.location.search).get('error');
  window.history.replaceState(window.history.state, '', '/login/steam');
  try {
    if (error) throw new Error(error === 'cancelado' ? 'Cancelaste el acceso con Steam. Puedes volver a intentarlo.' : MENSAJE);
    const perfil = leer(PERFIL);
    if (perfil?.userId) {
      const { data, error: errorUsuario } = await supabase.auth.getUser();
      if (errorUsuario || data.user?.id !== perfil.userId) throw new Error('Tu sesión cambió. Vuelve a iniciar sesión.');
      return { userId: perfil.userId, next: rutaRetornoSegura(perfil.next) };
    }
    const contexto = leer(CONTEXTO);
    if (!contexto || typeof contexto.verificador !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(contexto.verificador)) throw new Error(MENSAJE);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (contexto.vinculo) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== contexto.userId) throw new Error('Tu sesión cambió. Vuelve a iniciar sesión antes de vincular Steam.');
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const respuesta = await fetch('/api/auth/steam/session', {
      method: 'POST', credentials: 'same-origin', headers, body: JSON.stringify({ verificador: contexto.verificador }),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok || typeof datos.userId !== 'string') throw new Error(typeof datos.error === 'string' ? datos.error : MENSAJE);
    if (contexto.vinculo) {
      if (datos.vinculo !== true || datos.userId !== contexto.userId) throw new Error(MENSAJE);
    } else {
      if (typeof datos.access_token !== 'string' || typeof datos.refresh_token !== 'string' || datos.vinculo) throw new Error(MENSAJE);
      const { error: errorSesion } = await supabase.auth.setSession({ access_token: datos.access_token, refresh_token: datos.refresh_token });
      if (errorSesion) throw new Error('No se pudo guardar tu sesión. Vuelve a iniciar sesión.');
    }
    const { data: usuario, error: errorUsuario } = await supabase.auth.getUser();
    if (errorUsuario || usuario.user?.id !== datos.userId) {
      if (!contexto.vinculo) await supabase.auth.signOut({ scope: 'local' });
      throw new Error('No se pudo verificar tu sesión. Vuelve a iniciar sesión.');
    }
    const resultado: AccesoSteam = { userId: datos.userId, next: contexto.vinculo ? '/perfil?steam=linked' : rutaRetornoSegura(datos.next), vinculo: contexto.vinculo === true };
    if (!contexto.vinculo) window.sessionStorage.setItem(PERFIL, JSON.stringify({ ...resultado, creado: Date.now() }));
    return resultado;
  } finally { window.sessionStorage.removeItem(CONTEXTO); }
}

export function completarAccesoSteam() { pendiente ??= intercambiar(); return pendiente; }
export function cerrarRetornoSteam() { window.sessionStorage.removeItem(PERFIL); }
