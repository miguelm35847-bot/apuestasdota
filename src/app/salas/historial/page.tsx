'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';
import Avatar from '@/components/Avatar';

type Participante = {
  user_id: string;
  equipo: number | null;
  profiles: {
    nick: string;
    steam_avatar_url?: string | null;
  };
};

type SalaTerminada = {
  id: string;
  nombre: string;
  cuota: number;
  cupo: number;
  estado: string;
  created_at: string;
  partidas: {
    dota_match_id: number | null;
    equipo_ganador: number;
    pozo: number;
    comision: number;
    premio_por_ganador: number;
    duracion_segundos?: number | null;
    radiant_score?: number | null;
    dire_score?: number | null;
    detectada_auto?: boolean | null;
  } | null;
  participantes_sala: Participante[];
};

function formatearDuracion(segundos: number) {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${minutos}m ${resto.toString().padStart(2, '0')}s`;
}

export default function HistorialPage() {
  useArenaBody();
  const [salas, setSalas] = useState<SalaTerminada[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const cargarHistorial = useCallback(async () => {
    setLoading(true);
    const { data, count, error } = await supabase
      .from('salas')
      .select('*, partidas(*), participantes_sala(user_id, equipo, profiles(nick, steam_avatar_url))', { count: 'exact' })
      .eq('estado', 'terminada')
      .order('created_at', { ascending: false })
      .range(pagina * 20, pagina * 20 + 19);

    setTotal(count ?? 0); setError(error ? 'No se pudo consultar el historial.' : '');
    if (data) setSalas(data as unknown as SalaTerminada[]);
    setLoading(false);
  }, [pagina]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    void cargarHistorial();
  }, [cargarHistorial]);

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Historial de partidas" />

      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && <p role="alert">{error} <button onClick={() => void cargarHistorial()} className="underline">Reintentar</button></p>}
        <nav className="mb-4 flex justify-between"><button disabled={loading || pagina===0} onClick={() => setPagina(p=>p-1)}>Anterior</button><span>{pagina+1} / {Math.max(1,Math.ceil(total/20))}</span><button disabled={loading || (pagina+1)*20>=total} onClick={() => setPagina(p=>p+1)}>Siguiente</button></nav>
        {loading ? (
          <p className="text-slate-500">Cargando historial...</p>
        ) : salas.length === 0 ? (
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 text-center shadow-arena-soft">
            <p className="text-slate-500">No hay partidas terminadas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {salas.map((sala) => (
              <div
                key={sala.id}
                className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">{sala.nombre}</h3>
                    <div className="mt-1 text-sm text-slate-400">
                      <span className="font-medium">Fecha:</span>{' '}
                      {new Date(sala.created_at).toLocaleDateString('es-PE')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {sala.partidas?.detectada_auto && (
                        <span className="rounded bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
                          Auto
                        </span>
                      )}
                      <span className="rounded bg-white/5 px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-white/10">
                        Terminada
                      </span>
                    </div>
                    {sala.partidas && (
                      <div className="mt-1 text-sm text-slate-400">
                        <p>
                          <span className="font-medium">Pozo:</span> S/ {(sala.partidas.pozo / 100).toFixed(2)} |{' '}
                          <span className="font-medium">Ganador:</span>{' '}
                          {sala.partidas.equipo_ganador === 1 ? 'Radiant' : 'Dire'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {sala.partidas.dota_match_id ? (
                            <>
                              <span className="font-medium">Partida:</span>{' '}
                              {sala.partidas.duracion_segundos != null ||
                              sala.partidas.radiant_score != null ? (
                                <a
                                  href={`https://www.dotabuff.com/matches/${sala.partidas.dota_match_id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-prism-300 hover:underline"
                                >
                                  #{sala.partidas.dota_match_id}
                                </a>
                              ) : (
                                <span className="text-slate-400">
                                  #{sala.partidas.dota_match_id} (sin verificar)
                                </span>
                              )}
                            </>
                          ) : null}
                          {sala.partidas.duracion_segundos != null ? (
                            <> · {formatearDuracion(sala.partidas.duracion_segundos)}</>
                          ) : null}
                          {sala.partidas.radiant_score != null && sala.partidas.dire_score != null ? (
                            <> · {sala.partidas.radiant_score} - {sala.partidas.dire_score}</>
                          ) : null}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {sala.participantes_sala && sala.participantes_sala.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="mb-2 text-sm font-medium text-slate-300">Jugadores</p>
                    <div className="flex flex-wrap gap-2">
                      {sala.participantes_sala
                        .sort((a, b) => (a.equipo ?? 0) - (b.equipo ?? 0))
                        .map((p) => (
                          <Link
                            key={p.user_id}
                            href={`/jugadores/${p.user_id}`}
                            title={`Ver perfil de ${p.profiles?.nick ?? 'Usuario'}`}
                            className="flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-1.5 transition hover:bg-white/5"
                          >
                            <span
                              className={`rounded px-2 py-1 text-xs font-medium ${
                                p.equipo === 1
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : p.equipo === 2
                                  ? 'bg-rose-500/15 text-rose-300'
                                  : 'bg-white/5 text-slate-400'
                              }`}
                            >
                              {p.equipo === 1 ? 'Radiant' : p.equipo === 2 ? 'Dire' : 'Sin equipo'}
                            </span>
                            <Avatar
                              nick={p.profiles?.nick}
                              src={p.profiles?.steam_avatar_url}
                              size="xs"
                            />
                            <span className="text-sm text-slate-200">{p.profiles?.nick ?? 'Usuario'}</span>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
