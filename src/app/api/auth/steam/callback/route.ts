import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySteamOpenId } from '@/lib/steam';
import { obtenerResumenSteam } from '@/lib/steamServer';
import {
  STEAM_STATE_COOKIE,
  verificarStateSteam,
} from '@/lib/steamState';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

function redirigir(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.set(STEAM_STATE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/steam',
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const cookieState = request.cookies.get(STEAM_STATE_COOKIE)?.value ?? null;

    // El state debe coincidir con la cookie HttpOnly creada al iniciar el flujo.
    if (!state || !cookieState || state !== cookieState) {
      return redirigir(request, '/perfil?error=steam_auth_failed');
    }

    const userId = verificarStateSteam(state);
    if (!userId) {
      return redirigir(request, '/perfil?error=steam_auth_failed');
    }

    // Verificar la respuesta OpenID de Steam.
    const steamId = await verifySteamOpenId(searchParams);
    if (!steamId) {
      return redirigir(request, '/perfil?error=steam_auth_failed');
    }

    // El state también debe ser el mismo que Steam devolvió en openid.return_to.
    // Así un tercero no puede reutilizar una respuesta OpenID ajena cambiando
    // solo el parámetro state de la URL del callback.
    const returnTo = searchParams.get('openid.return_to');
    if (!returnTo) {
      return redirigir(request, '/perfil?error=steam_auth_failed');
    }

    try {
      const returnToUrl = new URL(returnTo);
      const returnToState = returnToUrl.searchParams.get('state');
      if (
        returnToUrl.pathname !== '/api/auth/steam/callback' ||
        !returnToState ||
        returnToState !== cookieState
      ) {
        return redirigir(request, '/perfil?error=steam_auth_failed');
      }
    } catch {
      return redirigir(request, '/perfil?error=steam_auth_failed');
    }

    // Verificar que este Steam ID no esté vinculado a otra cuenta.
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('steam_id', steamId)
      .maybeSingle();

    if (existing && existing.id !== userId) {
      return redirigir(request, '/perfil?error=steam_already_linked');
    }

    // Vincular Steam ID al perfil del usuario autenticado por el state firmado.
    const resumen = await obtenerResumenSteam(steamId);
    const datosPerfil = resumen
      ? {
          steam_id: resumen.steamId,
          steam_avatar_url: resumen.avatarUrl,
          steam_nombre: resumen.nombre,
        }
      : { steam_id: steamId };

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(datosPerfil)
      .eq('id', userId);

    if (updateError) {
      return redirigir(request, '/perfil?error=steam_link_failed');
    }

    return redirigir(request, '/perfil?steam=linked');
  } catch {
    return redirigir(request, '/perfil?error=unknown');
  }
}
