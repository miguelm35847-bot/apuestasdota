'use client';

import { GoTrueClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { rutaRetornoSegura } from '@/lib/acceso';

const CLAVE_PKCE = 'kodigodota-google-pkce-v1';
const CLAVE_CONTEXTO = 'kodigodota-google-retorno-v1';
const CLAVE_PERFIL = 'kodigodota-google-perfil-v1';
const VIGENCIA = 10 * 60 * 1000;
const MENSAJE_REINICIAR = 'El acceso con Google venció o no es válido. Vuelve a intentarlo desde este navegador.';
let clienteGoogle: GoTrueClient | undefined;
let retornoPendiente: Promise<{ userId: string; next: string | null }> | undefined;

function cliente() {
  if (!clienteGoogle) {
    clienteGoogle = new GoTrueClient({
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`,
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      storageKey: CLAVE_PKCE,
      storage: window.sessionStorage,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
    });
  }
  return clienteGoogle;
}

/** El cliente temporal no comparte almacenamiento ni modifica los enlaces de recuperación. */
function limpiarTemporal() {
  for (const clave of Object.keys(window.sessionStorage)) {
    if (clave.startsWith(CLAVE_PKCE) || clave === CLAVE_CONTEXTO) window.sessionStorage.removeItem(clave);
  }
}

export async function iniciarAccesoGoogle() {
  limpiarTemporal();
  window.sessionStorage.removeItem(CLAVE_PERFIL);
  retornoPendiente = undefined;
  const next = rutaRetornoSegura(new URLSearchParams(window.location.search).get('next'));
  window.sessionStorage.setItem(CLAVE_CONTEXTO, JSON.stringify({ next, creado: Date.now() }));
  try {
    const { data, error } = await cliente().signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login/google`,
        queryParams: { prompt: 'select_account' },
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) throw new Error('Google no está disponible en este momento. Intenta de nuevo o ingresa con tu correo.');
    window.location.assign(data.url);
  } catch (error) {
    limpiarTemporal();
    throw error;
  }
}

async function intercambiarRetorno() {
  const url = new URL(window.location.href);
  const fragmento = new URLSearchParams(url.hash.slice(1));
  const codigo = url.searchParams.get('code');
  const errorProveedor = url.searchParams.get('error') ?? fragmento.get('error');
  const contextoGuardado = window.sessionStorage.getItem(CLAVE_CONTEXTO);
  // El código de un solo uso y los errores del proveedor no quedan en el historial.
  window.history.replaceState(window.history.state, '', '/login/google');
  try {
    if (errorProveedor) {
      throw new Error(errorProveedor === 'access_denied'
        ? 'Cancelaste el acceso con Google. Puedes volver a intentarlo.'
        : 'Google no pudo completar el acceso. Vuelve a intentarlo.');
    }
    // Una recarga al elegir nick puede continuar con la sesión ya verificada.
    const perfilPendiente = !codigo ? window.sessionStorage.getItem(CLAVE_PERFIL) : null;
    const guardado = perfilPendiente ?? contextoGuardado;
    if (!guardado || (!codigo && !perfilPendiente)) throw new Error(MENSAJE_REINICIAR);
    let contexto: { creado?: unknown; next?: unknown; userId?: unknown };
    try {
      const valor: unknown = JSON.parse(guardado);
      if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error(MENSAJE_REINICIAR);
      contexto = valor;
    } catch { throw new Error(MENSAJE_REINICIAR); }
    if (typeof contexto.creado !== 'number' || Date.now() - contexto.creado > VIGENCIA || contexto.creado > Date.now() + 30000) {
      throw new Error(MENSAJE_REINICIAR);
    }
    if (perfilPendiente) {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user || data.user.id !== contexto.userId || !data.user.identities?.some(i => i.provider === 'google')) {
        window.sessionStorage.removeItem(CLAVE_PERFIL);
        throw new Error(MENSAJE_REINICIAR);
      }
      return { userId: data.user.id, next: rutaRetornoSegura(typeof contexto.next === 'string' ? contexto.next : null) };
    }
    if (!codigo) throw new Error(MENSAJE_REINICIAR);
    const { data, error } = await cliente().exchangeCodeForSession(codigo);
    if (error || !data.session) throw new Error(MENSAJE_REINICIAR);
    const { error: errorSesion } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (errorSesion) throw new Error('No se pudo guardar tu sesión. Vuelve a iniciar sesión.');
    const { data: identidad, error: errorIdentidad } = await supabase.auth.getUser();
    if (errorIdentidad || !identidad.user || identidad.user.id !== data.session.user.id || !identidad.user.identities?.some(i => i.provider === 'google')) {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('No se pudo verificar el acceso con Google. Vuelve a intentarlo.');
    }
    const resultado = { userId: identidad.user.id, next: rutaRetornoSegura(typeof contexto.next === 'string' ? contexto.next : null) };
    window.sessionStorage.setItem(CLAVE_PERFIL, JSON.stringify({ ...resultado, creado: Date.now() }));
    return resultado;
  } finally {
    limpiarTemporal();
  }
}

/** React puede montar el efecto dos veces: el código se intercambia una sola vez. */
export function completarAccesoGoogle() {
  retornoPendiente ??= intercambiarRetorno();
  return retornoPendiente;
}

export function cerrarRetornoGoogle() {
  window.sessionStorage.removeItem(CLAVE_PERFIL);
}
