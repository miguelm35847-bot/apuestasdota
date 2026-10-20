import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSteamLoginUrl } from '@/lib/steam';
import {
  crearStateSteam,
  STEAM_STATE_COOKIE,
  STEAM_STATE_MAX_AGE,
} from '@/lib/steamState';
import { limitarPorClave } from '@/lib/rateLimit';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Configuración del servidor incompleta' },
      { status: 500 }
    );
  }

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }

  if (!limitarPorClave(`steam-start:${user.id}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos.' },
      { status: 429 }
    );
  }

  const state = crearStateSteam(user.id);

  // Detrás de un proxy (ngrok, Vercel, Nginx) el host interno no sirve para
  // el return_to de Steam. Preferimos la URL pública configurada o el Origin.
  const origen =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get('origin') ||
    request.nextUrl.origin;

  let callbackUrl: string;
  try {
    callbackUrl = new URL('/api/auth/steam/callback', origen).toString();
  } catch {
    callbackUrl = new URL('/api/auth/steam/callback', request.url).toString();
  }

  const steamUrl = getSteamLoginUrl(callbackUrl, state);

  const response = NextResponse.json(
    { url: steamUrl },
    { headers: { 'Cache-Control': 'no-store' } }
  );

  response.cookies.set(STEAM_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/steam',
    maxAge: STEAM_STATE_MAX_AGE,
  });

  return response;
}
