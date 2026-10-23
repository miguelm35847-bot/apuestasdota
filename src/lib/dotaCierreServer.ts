import { type SupabaseClient } from '@supabase/supabase-js';
import { steam64ToAccountId } from '@/lib/playerLinks';
import { resultadoDotaVerificable } from '@/lib/validarResultadoDota';

const STEAM_API_KEY = process.env.STEAM_API_KEY || '';

const MIN_START_BUFFER_SEC = 0;
const MAX_HISTORY_SAMPLE = 4;
const MAX_CANDIDATES = 5;
const MATCHES_PER_HISTORY = 8;

type PerfilSteam = {
  nick: string | null;
  steam_id: string | null;
};

type ParticipanteRow = {
  user_id: string;
  equipo: number | null;
  profiles: PerfilSteam | PerfilSteam[] | null;
};

type SalaRow = {
  id: string;
  nombre: string;
  estado: string;
  cupo: number;
  creado_por: string | null;
  iniciada_at: string | null;
  auto_cierre: boolean;
  dota_match_id_esperado: number | null;
};

type SteamHistoryMatch = {
  match_id?: number;
  match_seq_num?: number;
  start_time?: number;
};

type SteamDetailsPlayer = {
  account_id?: number | null;
  player_slot?: number;
};

type SteamMatchDetails = {
  match_id?: number;
  start_time?: number;
  radiant_win?: boolean;
  duration?: number;
  radiant_score?: number;
  dire_score?: number;
  players?: SteamDetailsPlayer[];
};

type Candidato = {
  match_id: number;
  start_time: number;
  match_seq_num: number | null;
};

type FuenteDetalles = 'steam' | 'secuencia' | 'opendota';

type DetallesPartida = SteamMatchDetails & {
  fuente: FuenteDetalles;
};

export type PartidaDetectada = {
  match_id: number;
  start_time: number;
  radiant_win: boolean;
  duration: number;
  radiant_score: number;
  dire_score: number;
  equipo_ganador: 1 | 2;
  jugadores_detectados: number;
  jugadores_sala: number;
  fuente: FuenteDetalles;
};

export type Resultado = {
  cerrada: boolean;
  detected?: boolean;
  reason?: string;
  match?: PartidaDetectada;
};


function perfilDe(profiles: ParticipanteRow['profiles']): PerfilSteam | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;
}

async function fetchHistorial(accountId: number): Promise<SteamHistoryMatch[]> {
  try {
    const url =
      'https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/v1/' +
      `?key=${STEAM_API_KEY}&account_id=${accountId}&matches_requested=${MATCHES_PER_HISTORY}`;
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];

    const data = (await response.json()) as {
      result?: { matches?: SteamHistoryMatch[] };
    };

    return data.result?.matches ?? [];
  } catch {
    return [];
  }
}

async function fetchDetallesSteam(matchId: number): Promise<SteamMatchDetails | null> {
  try {
    const url =
      'https://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/v1/' +
      `?key=${STEAM_API_KEY}&match_id=${matchId}`;
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { result?: SteamMatchDetails };
    return data.result && typeof data.result.match_id === 'number' ? data.result : null;
  } catch {
    return null;
  }
}

/**
 * Respaldo de Steam cuando GetMatchDetails falla: la búsqueda por número de
 * secuencia devuelve la partida completa con jugadores, ganador y marcador.
 */
async function fetchDetallesSecuencia(
  matchSeqNum: number,
  matchId: number
): Promise<SteamMatchDetails | null> {
  try {
    const url =
      'https://api.steampowered.com/IDOTA2Match_570/GetMatchHistoryBySequenceNum/v1/' +
      `?key=${STEAM_API_KEY}&start_at_match_seq_num=${matchSeqNum}&matches_requested=3`;
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      result?: { matches?: SteamMatchDetails[] };
    };
    const partidas = data.result?.matches ?? [];
    return partidas.find((partida) => partida.match_id === matchId) ?? null;
  } catch {
    return null;
  }
}

async function fetchDetallesOpenDota(matchId: number): Promise<SteamMatchDetails | null> {
  try {
    const response = await fetch(`https://api.opendota.com/api/matches/${matchId}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as SteamMatchDetails & { error?: string };
    return data && typeof data.match_id === 'number' ? data : null;
  } catch {
    return null;
  }
}

async function fetchDetalles(candidato: Candidato): Promise<DetallesPartida | null> {
  const steam = await fetchDetallesSteam(candidato.match_id);
  if (steam) return { ...steam, fuente: 'steam' };

  if (candidato.match_seq_num) {
    const secuencia = await fetchDetallesSecuencia(
      candidato.match_seq_num,
      candidato.match_id
    );
    if (secuencia) return { ...secuencia, fuente: 'secuencia' };
  }

  const openDota = await fetchDetallesOpenDota(candidato.match_id);
  if (openDota) return { ...openDota, fuente: 'opendota' };

  return null;
}

export async function detectarYCerrar(admin: SupabaseClient, salaId: string): Promise<Resultado> {
  const { data: salaData, error: salaError } = await admin
    .from('salas')
    .select('*')
    .eq('id', salaId)
    .maybeSingle();

  if (salaError) return { cerrada: false, reason: 'No se pudo leer la sala' };

  const sala = salaData as unknown as SalaRow | null;
  if (!sala) return { cerrada: false, reason: 'La sala no existe' };
  if (sala.estado !== 'en_juego') {
    return { cerrada: false, reason: 'La sala no está en juego' };
  }
  if (!sala.auto_cierre) return { cerrada: false, reason: 'Cierre automático desactivado' };
  if (!sala.dota_match_id_esperado) return { cerrada: false, reason: 'Asocia el ID exacto de la partida desde el panel admin' };
  if (!STEAM_API_KEY) {
    return { cerrada: false, reason: 'Steam API no configurada' };
  }

  const { data: participantesData } = await admin
    .from('participantes_sala')
    .select('user_id, equipo, profiles(nick, steam_id)')
    .eq('sala_id', salaId);

  const participantes = (participantesData ?? []) as unknown as ParticipanteRow[];
  const roster = new Map<number, { user_id: string; equipo: number | null }>();

  for (const participante of participantes) {
    const perfil = perfilDe(participante.profiles);
    const cuenta = steam64ToAccountId(perfil?.steam_id);
    if (cuenta !== null && !roster.has(cuenta)) {
      roster.set(cuenta, {
        user_id: participante.user_id,
        equipo: participante.equipo,
      });
    }
  }

  if (roster.size !== sala.cupo) {
    return { cerrada: false, reason: 'Se necesita el roster completo, con Steam vinculado y cuentas únicas' };
  }

  const inicioMs = sala.iniciada_at
    ? new Date(sala.iniciada_at).getTime()
    : NaN;
  if (!Number.isFinite(inicioMs)) return { cerrada: false, reason: 'Falta el inicio verificable de la sala' };
  const desdeSec = Math.floor(inicioMs / 1000) - MIN_START_BUFFER_SEC;

  // Consultamos las partidas recientes de una muestra de jugadores. Con los detalles
  // después verificamos cuántos de la sala aparecen realmente en la partida.
  const cuentas = [...roster.keys()];
  const candidatos = new Map<number, Candidato>();

  const agregarHistoriales = (historiales: SteamHistoryMatch[][]) => {
    for (const historial of historiales) {
      for (const partida of historial) {
        if (!partida.match_id) continue;
        const inicio = partida.start_time ?? 0;
        if (inicio < desdeSec) continue;

        const candidato: Candidato = {
          match_id: partida.match_id,
          start_time: inicio,
          match_seq_num: partida.match_seq_num ?? null,
        };
        const previo = candidatos.get(partida.match_id);

        // Si la misma partida aparece en varios historiales, preferimos la que
        // traiga match_seq_num para poder pedir el detalle por secuencia.
        if (!previo || (!previo.match_seq_num && candidato.match_seq_num)) {
          candidatos.set(partida.match_id, candidato);
        }
      }
    }
  };

  const muestra = cuentas.slice(0, MAX_HISTORY_SAMPLE);
  agregarHistoriales(await Promise.all(muestra.map((cuenta) => fetchHistorial(cuenta))));

  // Si la muestra no tiene datos públicos, probamos con el resto de la sala.
  if (candidatos.size === 0 && cuentas.length > MAX_HISTORY_SAMPLE) {
    const resto = cuentas.slice(MAX_HISTORY_SAMPLE);
    agregarHistoriales(await Promise.all(resto.map((cuenta) => fetchHistorial(cuenta))));
  }

  if (!candidatos.has(Number(sala.dota_match_id_esperado))) candidatos.set(Number(sala.dota_match_id_esperado), { match_id: Number(sala.dota_match_id_esperado), start_time: desdeSec, match_seq_num: null });
  const ordenados = [...candidatos.values()]
    .filter(c => c.match_id === Number(sala.dota_match_id_esperado))
    .sort((a, b) => b.start_time - a.start_time)
    .slice(0, MAX_CANDIDATES);

  for (const candidato of ordenados) {
    const detalles = await fetchDetalles(candidato);
    if (!detalles || detalles.radiant_win === undefined) continue;

    if (!resultadoDotaVerificable(detalles, Number(sala.dota_match_id_esperado), desdeSec, sala.cupo, roster, Date.now()/1000)) continue;
    const partida: PartidaDetectada = {
      match_id: detalles.match_id ?? candidato.match_id,
      start_time: detalles.start_time ?? candidato.start_time,
      radiant_win: Boolean(detalles.radiant_win),
      duration: Number(detalles.duration ?? 0),
      radiant_score: Number(detalles.radiant_score ?? 0),
      dire_score: Number(detalles.dire_score ?? 0),
      equipo_ganador: detalles.radiant_win ? 1 : 2,
      jugadores_detectados: roster.size,
      jugadores_sala: roster.size,
      fuente: detalles.fuente,
    };

    const { error: rpcError } = await admin.rpc('cerrar_partida_auto', {
      p_sala: salaId,
      p_dota_match_id: partida.match_id,
      p_equipo_ganador: partida.equipo_ganador,
      p_duracion: partida.duration,
      p_radiant_score: partida.radiant_score,
      p_dire_score: partida.dire_score,
    });

    if (rpcError) {
      return {
        cerrada: false,
        detected: true,
        match: partida,
        reason: 'Partida detectada, pero no se pudo cerrar: ' + rpcError.message,
      };
    }

    // Avisamos a los jugadores de la sala que terminó la partida: el aviso
    // dispara el sonido para todos, estén o no dentro de la sala.
    const { error: notifError } = await admin.rpc('notificar_sala_terminada', {
      p_sala: salaId,
    });
    if (notifError) {
      console.error('No se pudo avisar el fin de partida:', notifError.message);
    }

    return { cerrada: true, detected: true, match: partida };
  }

  return {
    cerrada: false,
    detected: false,
    reason:
      'No se detecta la partida en los datos públicos. Los lobbies personalizados/practice sin ticket no aparecen en la API de Steam/OpenDota. Usa el cierre manual o juega en un lobby de torneo.',
  };
}
