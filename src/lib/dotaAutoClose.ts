import { supabase } from '@/lib/supabase';

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
  fuente: 'steam' | 'secuencia' | 'opendota';
};

export type ResultadoCierreAutomatico = {
  cerrada: boolean;
  detected?: boolean;
  reason?: string;
  match?: PartidaDetectada;
};

/**
 * Pide al servidor que busque una partida terminada de los jugadores de la sala.
 * Si la encuentra, el servidor la cierra y reparte los premios.
 * Requiere sesión: el endpoint valida que el usuario sea participante o admin.
 */
export async function intentarCierreAutomatico(
  salaId: string
): Promise<ResultadoCierreAutomatico | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return null;

  try {
    const response = await fetch('/api/dota/auto-close', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ sala_id: salaId }),
    });

    if (!response.ok) return null;

    return (await response.json()) as ResultadoCierreAutomatico;
  } catch {
    return null;
  }
}
