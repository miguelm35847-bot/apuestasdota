import { NextRequest, NextResponse } from 'next/server';

const STEAM_API_KEY = process.env.STEAM_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('match_id');

  if (!matchId) {
    return NextResponse.json({ error: 'Falta match_id' }, { status: 400 });
  }

  if (!STEAM_API_KEY) {
    return NextResponse.json({ error: 'Steam API key no configurada' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/v1/?match_id=${matchId}&key=${STEAM_API_KEY}`
    );

    const data = await response.json();

    if (!data.result) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
    }

    const result = data.result;

    return NextResponse.json({
      match_id: result.match_id,
      radiant_win: result.radiant_win,
      duration: result.duration,
      radiant_score: result.radiant_score,
      dire_score: result.dire_score,
      players: result.players?.map((p: any) => ({
        name: p.name || 'Anónimo',
        hero: p.hero_id,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        team: p.player_slot < 128 ? 'Radiant' : 'Dire',
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error consultando la API' }, { status: 500 });
  }
}
