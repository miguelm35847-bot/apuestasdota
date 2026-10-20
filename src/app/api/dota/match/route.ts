import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { limitarPorClave } from '@/lib/rateLimit';

const STEAM_API_KEY = process.env.STEAM_API_KEY || '';
const OPEN_DOTA_URL = 'https://api.opendota.com/api/matches';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

type Jugador = {
  account_id?: number | null;
  name?: string | null;
  hero_id?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  player_slot?: number;
};

type Partida = {
  match_id: number;
  radiant_win: boolean;
  duration: number;
  radiant_score?: number;
  dire_score?: number;
  start_time?: number;
  players?: Jugador[];
};

type RespuestaSteam = {
  result?: Partida;
};

type Fuente = 'steam' | 'opendota';

function normalizar(partida: Partida, fuente: Fuente) {
  return {
    match_id: partida.match_id,
    radiant_win: Boolean(partida.radiant_win),
    duration: Number(partida.duration ?? 0),
    radiant_score: Number(partida.radiant_score ?? 0),
    dire_score: Number(partida.dire_score ?? 0),
    start_time: partida.start_time ?? null,
    fuente,
    players: (partida.players ?? []).map((p) => ({
      account_id: p.account_id ?? null,
      name: p.name || 'Anónimo',
      hero: p.hero_id ?? null,
      kills: p.kills ?? null,
      deaths: p.deaths ?? null,
      assists: p.assists ?? null,
      team: (p.player_slot ?? 0) < 128 ? 'Radiant' : 'Dire',
    })),
  };
}

async function desdeSteam(matchId: string): Promise<Partida | null> {
  if (!STEAM_API_KEY) return null;

  try {
    const response = await fetch(
      `https://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/v1/?match_id=${matchId}&key=${STEAM_API_KEY}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as RespuestaSteam;
    return data.result && typeof data.result.match_id === 'number' ? data.result : null;
  } catch {
    return null;
  }
}

async function desdeOpenDota(matchId: string): Promise<Partida | null> {
  try {
    const response = await fetch(`${OPEN_DOTA_URL}/${matchId}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as Partida & { error?: string };
    return data && typeof data.match_id === 'number' ? data : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
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

  if (!limitarPorClave(`dota-match:${user.id}`, 20, 60_000)) {
    return NextResponse.json(
      { error: 'Demasiadas consultas. Espera un momento.' },
      { status: 429 }
    );
  }

  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  if (perfilError) {
    return NextResponse.json(
      { error: 'No se pudo verificar el usuario' },
      { status: 500 }
    );
  }

  if (perfil?.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('match_id');

  if (!matchId) {
    return NextResponse.json({ error: 'Falta match_id' }, { status: 400 });
  }

  if (!/^\d+$/.test(matchId)) {
    return NextResponse.json({ error: 'El ID de partida debe ser numérico' }, { status: 400 });
  }

  // Steam GetMatchDetails puede fallar o tardar en publicar la partida.
  // Si eso pasa, OpenDota devuelve los mismos datos desde el ID.
  const partidaSteam = await desdeSteam(matchId);
  if (partidaSteam) {
    return NextResponse.json(normalizar(partidaSteam, 'steam'));
  }

  const partidaOpenDota = await desdeOpenDota(matchId);
  if (partidaOpenDota) {
    return NextResponse.json(normalizar(partidaOpenDota, 'opendota'));
  }

  return NextResponse.json(
    {
      error:
        'No se pudo obtener la partida. Los lobbies personalizados/practice sin ticket no aparecen en la API pública de Steam ni en OpenDota. Si es un lobby de torneo, espera unos minutos e intenta de nuevo; si no, cierra manualmente eligiendo el ganador.',
    },
    { status: 404 }
  );
}
