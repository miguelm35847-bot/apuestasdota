import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { rutaRetornoSegura } from '@/lib/acceso';
import { getSteamLoginUrl } from '@/lib/steam';
import { crearTokenSteam, origenSteam, remotoSteam, STEAM_CALLBACK, STEAM_STATE_COOKIE, STEAM_STATE_MAX_AGE } from '@/lib/steamState';
import { limitarPorClave } from '@/lib/rateLimit';

export function clienteSteamAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Configuración de Steam incompleta');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export function respuestaSteam(datos: unknown, status = 200) {
  return NextResponse.json(datos, { status, headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache', 'Referrer-Policy': 'no-referrer' } });
}

export function opcionesCookieSteam(origen: string, maxAge: number) {
  return { httpOnly: true, secure: origen.startsWith('https:'), sameSite: 'lax' as const, path: '/api/auth/steam', maxAge };
}

export async function iniciarSteamServidor(request: NextRequest, vincular: boolean) {
  try {
    if (vincular && !request.headers.get('authorization')?.match(/^Bearer\s+\S+/i)) return respuestaSteam({ error: 'No autenticado' }, 401);
    const origen = origenSteam(request.url);
    if (request.headers.get('origin') !== origen) return respuestaSteam({ error: 'Solicitud de otro origen rechazada' }, 403);
    const remoto = remotoSteam(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local');
    if (!limitarPorClave(`steam:${remoto}`, 10, 600_000)) return respuestaSteam({ error: 'Demasiados intentos. Espera unos minutos.' }, 429);
    const admin = clienteSteamAdmin();
    let usuario: string | null = null;
    if (vincular) {
      const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
      if (!token) return respuestaSteam({ error: 'No autenticado' }, 401);
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return respuestaSteam({ error: 'Sesión inválida' }, 401);
      usuario = data.user.id;
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) return respuestaSteam({ error: 'Solicitud inválida' }, 400);
    const cuerpo: unknown = await request.json();
    if (!cuerpo || typeof cuerpo !== 'object' || !('challenge' in cuerpo) || typeof cuerpo.challenge !== 'string'
      || !/^[A-Za-z0-9_-]{43}$/.test(cuerpo.challenge)) return respuestaSteam({ error: 'Solicitud inválida' }, 400);
    const siguiente = 'next' in cuerpo && typeof cuerpo.next === 'string' && cuerpo.next.length <= 1024 ? rutaRetornoSegura(cuerpo.next) : null;
    const state = crearTokenSteam();
    const { error } = await admin.rpc('steam_auth_iniciar', {
      p_id: state.id, p_state_hash: state.hash, p_challenge: cuerpo.challenge,
      p_proposito: vincular ? 'vincular' : 'login', p_usuario: usuario, p_origen: origen,
      p_siguiente: siguiente, p_remoto_hash: remoto,
    });
    if (error) return respuestaSteam({ error: error.message.includes('Demasiados') ? 'Demasiados intentos. Espera unos minutos.' : 'No se pudo iniciar Steam. Vuelve a intentarlo.' }, error.message.includes('Demasiados') ? 429 : 503);
    const respuesta = respuestaSteam({ url: getSteamLoginUrl(new URL(STEAM_CALLBACK, origen).toString(), state.valor) });
    respuesta.cookies.set(STEAM_STATE_COOKIE, state.valor, opcionesCookieSteam(origen, STEAM_STATE_MAX_AGE));
    return respuesta;
  } catch { return respuestaSteam({ error: 'Steam no está disponible. Vuelve a intentarlo.' }, 503); }
}

/** Solo se invoca después de consumir una prueba Steam verificada. */
export async function obtenerCuentaSteam(steamId: string) {
  const admin = clienteSteamAdmin();
  const { data: id, error } = await admin.rpc('steam_cuenta_reservar', { p_steam: steamId });
  if (error || typeof id !== 'string') throw new Error('cuenta_no_disponible');
  let cuenta = await admin.auth.admin.getUserById(id);
  if (cuenta.error) {
    if (cuenta.error.status !== 404) throw new Error('cuenta_no_disponible');
    const creacion = await admin.auth.admin.createUser({
      id, email: `${id}@steam.kodigodota.invalid`, email_confirm: true,
      user_metadata: { nick: `jugador_${id.replaceAll('-', '').slice(0,12)}` },
      app_metadata: { steam_creada: true },
    });
    // Un retorno simultáneo puede haber creado el mismo UUID reservado.
    cuenta = creacion.error ? await admin.auth.admin.getUserById(id) : creacion;
  }
  if (cuenta.error || !cuenta.data.user || cuenta.data.user.id !== id || !cuenta.data.user.email
    || (cuenta.data.user.banned_until && Date.parse(cuenta.data.user.banned_until) > Date.now())) throw new Error('cuenta_no_disponible');
  if (!cuenta.data.user.email_confirmed_at) throw new Error('correo_sin_confirmar');
  if (cuenta.data.user.factors?.some(factor => factor.status === 'verified')) throw new Error('segundo_factor_requerido');
  const { data: perfil, error: errorPerfil } = await admin.from('profiles').select('id,baneado,steam_id').eq('id', id).maybeSingle();
  if (errorPerfil || !perfil || perfil.baneado || (perfil.steam_id && perfil.steam_id !== steamId)) throw new Error('cuenta_no_disponible');
  return { id, email: cuenta.data.user.email };
}

export async function crearSesionSteam(id: string, email: string) {
  const admin = clienteSteamAdmin();
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error || data.user.id !== id || !data.properties.hashed_token) throw new Error('sesion_no_disponible');
  const cliente = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: verificado, error: errorVerificacion } = await cliente.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'email' });
  if (errorVerificacion || !verificado.session || verificado.user?.id !== id) throw new Error('sesion_no_disponible');
  return { access_token: verificado.session.access_token, refresh_token: verificado.session.refresh_token };
}
