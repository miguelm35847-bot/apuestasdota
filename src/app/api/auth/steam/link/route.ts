import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { obtenerResumenSteam, resolverSteamId } from '@/lib/steamServer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[STEAM LINK] Request body:', body);

    const { steamUrl, accessToken } = body;

    if (!steamUrl || !accessToken) {
      console.log('[STEAM LINK] Faltan datos:', { steamUrl, accessToken });
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Verificar el usuario con el token de sesión
    console.log('[STEAM LINK] Verificando usuario...');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      console.log('[STEAM LINK] Error de usuario:', userError);
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    console.log('[STEAM LINK] Usuario verificado:', user.id);

    // Validar que la URL sea de Steam
    if (!steamUrl.includes('steamcommunity.com')) {
      return NextResponse.json(
        { error: 'La URL debe de steamcommunity.com' },
        { status: 400 }
      );
    }

    // Extraer el Steam ID de la URL
    const steamIdMatch = steamUrl.match(/steamcommunity\.com\/(id\/[^\/?#]+|profiles\/\d+)/);

    if (!steamIdMatch) {
      return NextResponse.json(
        { error: 'URL de Steam inválida. Usa algo como https://steamcommunity.com/id/tunombre' },
        { status: 400 }
      );
    }

    const steamId = steamIdMatch[1];
    console.log('[STEAM LINK] Steam ID extraído:', steamId);

    // Normalizar a ID numérico (resuelve /id/nombre mediante la API de Steam)
    const steamIdNumerico = await resolverSteamId(steamId);

    if (!steamIdNumerico) {
      return NextResponse.json(
        { error: 'No se pudo encontrar esa cuenta de Steam' },
        { status: 400 }
      );
    }

    // Verificar que este Steam ID no esté vinculado a otra cuenta
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('steam_id', steamIdNumerico)
      .maybeSingle();

    if (existingError) {
      console.log('[STEAM LINK] Error verificando existing:', existingError);
    }

    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { error: 'Esta cuenta de Steam ya está vinculada a otro usuario' },
        { status: 400 }
      );
    }

    // Vincular Steam ID al perfil y guardar avatar/nombre si la API responde
    console.log('[STEAM LINK] Actualizando perfil...');
    const resumen = await obtenerResumenSteam(steamIdNumerico);
    const datosPerfil = resumen
      ? {
          steam_id: resumen.steamId,
          steam_avatar_url: resumen.avatarUrl,
          steam_nombre: resumen.nombre,
        }
      : { steam_id: steamIdNumerico };

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(datosPerfil)
      .eq('id', user.id);

    if (updateError) {
      console.log('[STEAM LINK] Error actualizando:', updateError);
      return NextResponse.json(
        { error: 'Error al vincular la cuenta de Steam' },
        { status: 500 }
      );
    }

    console.log('[STEAM LINK] Perfil actualizado correctamente');
    return NextResponse.json({ success: true, steamId: steamIdNumerico });
  } catch (error) {
    console.error('[STEAM LINK] Error catch:', error);
    return NextResponse.json(
      { error: 'Error desconocido' },
      { status: 500 }
    );
  }
}
