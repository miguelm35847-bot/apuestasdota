import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Devuelve el SteamID solo al usuario autenticado. El cliente ya no lee
// profiles.steam_id directo, así ningún jugador puede pedir el de otro.
export async function GET(request: NextRequest) {
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

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('steam_id')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'No se pudo leer el perfil' }, { status: 500 });
    }

    // El siguiente paso del landing solo necesita saber si hay una vinculación.
    // La identidad siempre sale de la sesión validada, nunca de un parámetro.
    const soloEstado = request.nextUrl.searchParams.get('estado') === '1';
    if (soloEstado && !data) {
      return NextResponse.json({ error: 'Perfil no disponible' }, { status: 404 });
    }

    return NextResponse.json(
      soloEstado ? { vinculado: !!data?.steam_id } : { steamId: data?.steam_id ?? null },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 });
  }
}
