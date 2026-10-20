import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { obtenerResumenSteam } from '@/lib/steamServer';
import { limitarPorClave } from '@/lib/rateLimit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!limitarPorClave(`steam-sync:${user.id}`, 3, 60_000)) {
      return NextResponse.json(
        { error: 'Demasiadas actualizaciones. Espera un momento.' },
        { status: 429 }
      );
    }

    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('profiles')
      .select('steam_id')
      .eq('id', user.id)
      .single();

    if (perfilError) {
      return NextResponse.json({ error: 'No se pudo leer el perfil' }, { status: 500 });
    }

    if (!perfil?.steam_id) {
      return NextResponse.json({ error: 'No tienes Steam vinculado' }, { status: 400 });
    }

    const resumen = await obtenerResumenSteam(perfil.steam_id);

    if (!resumen) {
      return NextResponse.json(
        { error: 'No se pudieron obtener los datos de Steam' },
        { status: 502 }
      );
    }

    const { data: existente } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('steam_id', resumen.steamId)
      .maybeSingle();

    if (existente && existente.id !== user.id) {
      return NextResponse.json(
        { error: 'Esta cuenta de Steam ya está vinculada a otro usuario' },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        steam_id: resumen.steamId,
        steam_avatar_url: resumen.avatarUrl,
        steam_nombre: resumen.nombre,
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'No se pudo actualizar el perfil' }, { status: 500 });
    }

    return NextResponse.json(resumen);
  } catch {
    return NextResponse.json({ error: 'Error desconocido' }, { status: 500 });
  }
}
