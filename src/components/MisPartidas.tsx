'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Partida = {
  sala_id: string;
  equipo: number | null;
  salas: {
    nombre: string;
    cuota: number;
    estado: string;
    created_at: string;
    partidas: {
      equipo_ganador: number;
      pozo: number;
      premio_por_ganador: number;
      duracion_segundos?: number | null;
      radiant_score?: number | null;
      dire_score?: number | null;
    } | null;
  };
};

export default function MisPartidas() {
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);

  async function cargarPartidas() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('participantes_sala')
      .select('sala_id, equipo, salas(*, partidas(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setPartidas(data as unknown as Partida[]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    void cargarPartidas();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando tus partidas...</p>;
  }

  if (partidas.length === 0) {
    return <p className="text-sm text-slate-500">Aún no has jugado ninguna partida.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="pb-2 text-left font-medium text-slate-400">Sala</th>
            <th className="pb-2 text-left font-medium text-slate-400">Fecha</th>
            <th className="pb-2 text-left font-medium text-slate-400">Tu equipo</th>
            <th className="pb-2 text-left font-medium text-slate-400">Resultado</th>
            <th className="pb-2 text-left font-medium text-slate-400">Monto</th>
          </tr>
        </thead>
        <tbody>
          {partidas.map((p) => {
            const ganador = p.salas?.partidas?.equipo_ganador;
            const miEquipo = p.equipo;
            const gano = ganador !== null && ganador !== undefined && miEquipo === ganador;
            const monto = gano
              ? (p.salas?.partidas?.premio_por_ganador ?? 0)
              : -(p.salas?.cuota ?? 0);

            return (
              <tr key={p.sala_id} className="border-b border-white/5">
                <td className="py-2 text-slate-200">{p.salas?.nombre ?? 'Sala'}</td>
                <td className="py-2 text-slate-200">
                  <div>{new Date(p.salas?.created_at ?? '').toLocaleDateString('es-PE')}</div>
                  {p.salas?.partidas?.duracion_segundos != null && (
                    <div className="text-[11px] text-slate-400">
                      {Math.floor(p.salas.partidas.duracion_segundos / 60)}m
                      {p.salas.partidas.radiant_score != null &&
                        p.salas.partidas.dire_score != null && (
                          <> · {p.salas.partidas.radiant_score}-{p.salas.partidas.dire_score}</>
                        )}
                    </div>
                  )}
                </td>
                <td className="py-2 text-slate-200">
                  {miEquipo === 1 ? 'Radiant' : miEquipo === 2 ? 'Dire' : 'Sin asignar'}
                </td>
                <td className="py-2">
                  {ganador ? (
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                        gano ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {gano ? 'Ganaste' : 'Perdiste'}
                    </span>
                  ) : (
                    <span className="text-slate-500">En curso</span>
                  )}
                </td>
                <td className={`py-2 font-medium ${gano ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {gano ? '+' : ''}S/ {(monto / 100).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
