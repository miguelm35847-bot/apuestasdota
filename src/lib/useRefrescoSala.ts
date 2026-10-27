'use client';

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { crearRefrescoVisible } from '@/lib/refrescoVisible';
import type { Lobby, Participante, Sala } from '@/lib/types';

export type DatosSala = {
  sala?: Sala;
  participantes?: Participante[];
  /** Ausente si falló la consulta; null si el lobby ya no existe. */
  lobby?: Lobby | null;
};

export function useRefrescoSala(
  salaId: string,
  userId: string | undefined,
  aplicar: (datos: DatosSala) => void
) {
  const refrescoActual = useRef<ReturnType<typeof crearRefrescoVisible> | null>(null);
  const recargar = useCallback(() => refrescoActual.current?.actualizar() ?? Promise.resolve(), []);

  useEffect(() => {
    if (!salaId || !userId) return;

    const refresco = crearRefrescoVisible(async (signal) => {
      try {
        const [sala, participantes, lobby] = await Promise.all([
          supabase.from('salas').select('*').eq('id', salaId).abortSignal(signal).single(),
          supabase.from('participantes_sala')
            .select('user_id, equipo, es_capitan, pick_orden, verificado_at, preferencia_equipo, profiles(nick, steam_avatar_url, steam_nombre, mmr, roles_preferidos)')
            .eq('sala_id', salaId).order('created_at', { ascending: true }).abortSignal(signal),
          supabase.from('lobbies').select('*').eq('sala_id', salaId).abortSignal(signal).maybeSingle(),
        ]);
        if (signal.aborted) return;
        aplicar({
          ...(sala.data ? { sala: sala.data as Sala } : {}),
          ...(!participantes.error && participantes.data
            ? { participantes: participantes.data as unknown as Participante[] } : {}),
          ...(!lobby.error ? { lobby: (lobby.data as Lobby | null) ?? null } : {}),
        });
      } catch {
        if (!signal.aborted) aplicar({});
      }
    }, { intervaloMs: 30000, intervaloSinRealtimeMs: 5000 });
    refrescoActual.current = refresco;

    const canal = supabase
      .channel(`sala-detalle-${salaId}-${crypto.randomUUID()}`, {
        config: { postgres_changes_options: { wait: true } },
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participantes_sala', filter: `sala_id=eq.${salaId}` }, refresco.notificar)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'participantes_sala', filter: `sala_id=eq.${salaId}` }, refresco.notificar)
      // DELETE puede no incluir sala_id en su registro anterior.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'participantes_sala' }, refresco.notificar)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'salas', filter: `id=eq.${salaId}` }, refresco.notificar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbies', filter: `sala_id=eq.${salaId}` }, refresco.notificar)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, refresco.notificar)
      .subscribe(refresco.estadoRealtime);

    return () => {
      refresco.detener();
      if (refrescoActual.current === refresco) refrescoActual.current = null;
      void supabase.removeChannel(canal);
    };
  }, [salaId, userId, aplicar]);

  return recargar;
}
