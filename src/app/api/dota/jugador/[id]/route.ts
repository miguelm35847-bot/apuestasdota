import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { limitarPorClave } from '@/lib/rateLimit';
import { obtenerResumenDota } from '@/lib/dotaResumen';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Resumen de Dota 2 de un jugador (héroe y rol más jugados, winrate
 * reciente y enlace a Dotabuff). Es la misma información que muestra Dotabuff,
 * calculada en el servidor con la API pública de OpenDota.
 *
 * Requiere sesión: el `steam_id` se lee con la service role y nunca se
 * devuelve al cliente.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }

  if (!limitarPorClave(`resumen-dota:${user.id}`, 90, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas consultas' }, { status: 429 });
  }

  const { data: perfil, error: perfilError } = await admin
    .from('profiles')
    .select('steam_id')
    .eq('id', id)
    .maybeSingle();

  if (perfilError) {
    return NextResponse.json({ error: 'No se pudo leer el perfil' }, { status: 500 });
  }

  if (!perfil) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });
  }

  const resumen = await obtenerResumenDota(id, perfil.steam_id);

  return NextResponse.json(resumen, {
    headers: { 'Cache-Control': 'private, max-age=300' },
  });
}
