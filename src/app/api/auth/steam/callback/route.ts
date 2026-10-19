import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySteamOpenId } from '@/lib/steam';
import { obtenerResumenSteam } from '@/lib/steamServer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function GET(request: NextRequest) {
  try {
    // Verificar la respuesta OpenID de Steam
    const { searchParams } = new URL(request.url);
    const steamId = await verifySteamOpenId(searchParams);

    if (!steamId) {
      return NextResponse.redirect(new URL('/perfil?error=steam_auth_failed', request.url));
    }

    // Leer el token de sesión del parámetro state
    const tempToken = searchParams.get('state');

    if (!tempToken) {
      return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
    }

    // Verificar el usuario con el token de sesión
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(tempToken);

    if (userError || !user) {
      return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
    }

    // Verificar que este Steam ID no esté vinculado a otra cuenta
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('steam_id', steamId)
      .maybeSingle();

    if (existing && existing.id !== user.id) {
      return NextResponse.redirect(new URL('/perfil?error=steam_already_linked', request.url));
    }

    // Vincular Steam ID al perfil del usuario (y guardar avatar/nombre si la API responde)
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
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.redirect(new URL('/perfil?error=steam_link_failed', request.url));
    }

    return NextResponse.redirect(new URL('/perfil?steam=linked', request.url));
  } catch {
    return NextResponse.redirect(new URL('/perfil?error=unknown', request.url));
  }
}
