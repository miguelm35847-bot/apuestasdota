'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Avatar from '@/components/Avatar';

type Participante = {
  user_id: string;
  equipo: number | null;
  profiles: {
    nick: string;
    steam_avatar_url?: string | null;
  };
};

type PartidaGlobal = {
  id: string;
  nombre: string;
  created_at: string;
  partidas: {
    dota_match_id: number | null;
    equipo_ganador: number;
    pozo: number;
    premio_por_ganador: number;
    duracion_segundos?: number | null;
    radiant_score?: number | null;
    dire_score?: number | null;
    detectada_auto?: boolean | null;
  } | null;
  participantes_sala: Participante[];
};

function EquipoBadge({ equipo }: { equipo: number }) {
  const color =
    equipo === 1
      ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
      : 'bg-rose-500/10 text-rose-300 ring-rose-500/30';
  const nombre = equipo === 1 ? 'Radiant' : 'Dire';
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${color}`}
    >
      {nombre}
    </span>
  );
}

export default function HistorialGlobal() {
  const [partidas, setPartidas] = useState<PartidaGlobal[]>([]);
  const [loading, setLoading] = useState(true);

  async function cargarHistorial() {
    setLoading(true);
    const { data } = await supabase
      .from('salas')
      .select('*, partidas(*), participantes_sala(user_id, equipo, profiles(nick, steam_avatar_url))')
      .eq('estado', 'terminada')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setPartidas(data as unknown as PartidaGlobal[]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    void cargarHistorial();
  }, []);

  return (
    <div className="arena-card mt-6 rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold tracking-tight text-white">
          Últimas partidas
        </h2>
        <Link
          href="/salas/historial"
          className="text-sm font-semibold text-prism-300 transition hover:text-prism-200"
        >
          Ver todo
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : partidas.length === 0 ? (
        <p className="text-sm text-slate-400">No hay partidas terminadas aún.</p>
      ) : (
        <div className="space-y-4">
          {partidas.map((sala) => (
            <div key={sala.id} className="border-b border-white/5 pb-4 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold tracking-tight text-white">{sala.nombre}</h3>
                <span className="text-xs text-slate-400">
                  {new Date(sala.created_at).toLocaleDateString('es-PE')}
                </span>
              </div>

              {sala.partidas && (
                <div className="mt-1 text-sm text-slate-400">
                  <span className="font-semibold text-slate-300">Ganador:</span>{' '}
                  {sala.partidas.equipo_ganador === 1 ? 'Radiant' : 'Dire'}
                  <span className="mx-2 text-slate-600">|</span>
                  <span className="font-semibold text-slate-300">Pozo:</span> S/{' '}
                  {(sala.partidas.pozo / 100).toFixed(2)}
                  {sala.partidas.dota_match_id ? (
                    <>
                      <span className="mx-2 text-slate-600">|</span>
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
                    <>
                      <span className="mx-2 text-slate-600">|</span>
                      {Math.floor(sala.partidas.duracion_segundos / 60)}m
                    </>
                  ) : null}
                  {sala.partidas.radiant_score != null && sala.partidas.dire_score != null ? (
                    <>
                      <span className="mx-2 text-slate-600">|</span>
                      {sala.partidas.radiant_score} - {sala.partidas.dire_score}
                    </>
                  ) : null}
                  {sala.partidas.detectada_auto ? (
                    <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
                      Auto
                    </span>
                  ) : null}
                </div>
              )}

              {sala.participantes_sala && sala.participantes_sala.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...sala.participantes_sala]
                    .sort((a, b) => (a.equipo ?? 0) - (b.equipo ?? 0))
                    .map((p) => (
                      <Link
                        key={p.user_id}
                        href={`/jugadores/${p.user_id}`}
                        title={`Ver perfil de ${p.profiles?.nick ?? 'Usuario'}`}
                        className="flex items-center gap-1.5 rounded-full bg-white/5 py-1 pl-1 pr-2.5 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 hover:ring-prism-400/30"
                      >
                        <EquipoBadge equipo={p.equipo ?? 0} />
                        <Avatar
                          nick={p.profiles?.nick}
                          src={p.profiles?.steam_avatar_url}
                          size="xs"
                        />
                        <span className="text-sm font-medium text-slate-200">
                          {p.profiles?.nick ?? 'Usuario'}
                        </span>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
