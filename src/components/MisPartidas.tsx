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
    } | null;
  };
};

export default function MisPartidas() {
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarPartidas();
  }, []);

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

    if (data) setPartidas(data as any);
    setLoading(false);
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Cargando tus partidas...</p>;
  }

  if (partidas.length === 0) {
    return <p className="text-sm text-gray-500">Aún no has jugado ninguna partida.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-2 text-left font-medium text-gray-600">Sala</th>
            <th className="pb-2 text-left font-medium text-gray-600">Fecha</th>
            <th className="pb-2 text-left font-medium text-gray-600">Tu equipo</th>
            <th className="pb-2 text-left font-medium text-gray-600">Resultado</th>
            <th className="pb-2 text-left font-medium text-gray-600">Monto</th>
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
              <tr key={p.sala_id} className="border-b border-gray-100">
                <td className="py-2 text-gray-900">{p.salas?.nombre ?? 'Sala'}</td>
                <td className="py-2 text-gray-900">
                  {new Date(p.salas?.created_at ?? '').toLocaleDateString('es-PE')}
                </td>
                <td className="py-2 text-gray-900">
                  {miEquipo === 1 ? 'Equipo 1' : miEquipo === 2 ? 'Equipo 2' : 'Sin asignar'}
                </td>
                <td className="py-2">
                  {ganador ? (
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                        gano ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {gano ? 'Ganaste' : 'Perdiste'}
                    </span>
                  ) : (
                    <span className="text-gray-500">En curso</span>
                  )}
                </td>
                <td className={`py-2 font-medium ${gano ? 'text-green-600' : 'text-red-600'}`}>
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
