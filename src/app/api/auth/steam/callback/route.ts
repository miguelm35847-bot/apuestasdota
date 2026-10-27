import { NextRequest, NextResponse } from 'next/server';
import { verifySteamOpenId } from '@/lib/steam';
import { crearTokenSteam, hashSteam, leerTokenSteam, origenSteam, STEAM_CALLBACK, STEAM_ENTREGA_COOKIE, STEAM_ENTREGA_MAX_AGE, STEAM_STATE_COOKIE } from '@/lib/steamState';
import { clienteSteamAdmin, opcionesCookieSteam } from '@/lib/steamAuthServer';

export async function GET(request: NextRequest) {
  let origen: string;
  try { origen = origenSteam(request.url); } catch { return new NextResponse(null, { status: 503 }); }
  const redirigir = (error?: string, entrega?: string) => {
    const respuesta = NextResponse.redirect(new URL(`/login/steam${error ? `?error=${error}` : ''}`, origen));
    respuesta.headers.set('Cache-Control', 'no-store');
    respuesta.headers.set('Referrer-Policy', 'no-referrer');
    respuesta.cookies.set(STEAM_STATE_COOKIE, '', opcionesCookieSteam(origen, 0));
    respuesta.cookies.set(STEAM_ENTREGA_COOKIE, entrega ?? '', opcionesCookieSteam(origen, entrega ? STEAM_ENTREGA_MAX_AGE : 0));
    return respuesta;
  };
  try {
    const params = request.nextUrl.searchParams;
    const state = params.get('state');
    if (!state || state !== request.cookies.get(STEAM_STATE_COOKIE)?.value) return redirigir('invalido');
    const intento = leerTokenSteam(state);
    if (!intento) return redirigir('invalido');
    if (params.get('openid.mode') === 'cancel') return redirigir('cancelado');
    const esperado = new URL(STEAM_CALLBACK, origen);
    esperado.searchParams.set('state', state);
    const steamId = await verifySteamOpenId(params, esperado.toString());
    if (!steamId) return redirigir('invalido');
    const admin = clienteSteamAdmin();
    const { error } = await admin.rpc('steam_auth_tomar', {
      p_id: intento.id, p_state_hash: intento.hash, p_origen: origen, p_nonce_hash: hashSteam(params.get('openid.response_nonce')!),
    });
    if (error) return redirigir('invalido');
    const entrega = crearTokenSteam(intento.id);
    const { error: errorEntrega } = await admin.rpc('steam_auth_preparar', {
      p_id: intento.id, p_state_hash: intento.hash, p_steam: steamId, p_entrega_hash: entrega.hash,
    });
    if (errorEntrega) return redirigir('invalido');
    return redirigir(undefined, entrega.valor);
  } catch { return redirigir('invalido'); }
}
