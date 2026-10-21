import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { playerLinksFromSteamId } from '@/lib/playerLinks';
import { limitarPorClave } from '@/lib/rateLimit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
};

function ipDe(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { steamUrl: null, dotabuffUrl: null },
        { status: 400 }
      );
    }

    if (!limitarPorClave(`player-links:${ipDe(request)}`, 120, 60_000)) {
      return NextResponse.json(
        { error: 'Demasiadas consultas. Espera un momento.' },
        { status: 429 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('steam_id')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { steamUrl: null, dotabuffUrl: null },
        { status: 500 }
      );
    }

    return NextResponse.json(playerLinksFromSteamId(data?.steam_id), {
      headers: CACHE_HEADERS,
    });
  } catch {
    return NextResponse.json(
      { steamUrl: null, dotabuffUrl: null },
      { status: 500 }
    );
  }
}
