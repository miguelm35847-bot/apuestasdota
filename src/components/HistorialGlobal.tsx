'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Participante = {
  user_id: string;
  equipo: number | null;
  profiles: {
    nick: string;
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
  } | null;
  participantes_sala: Participante[];
};

export default function HistorialGlobal() {
  const [partidas, setPartidas] = useState<PartidaGlobal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarHistorial();
  }, []);

  async function cargarHistorial() {
    setLoading(true);
    const { data } = await supabase
      .from('salas')
      .select('*, partidas(*), participantes_sala(user_id, equipo, profiles(nick))')
      .eq('estado', 'terminada')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setPartidas(data as any);
    setLoading(false);
  }

  function EquipoBadge({ equipo }: { equipo: number }) {
    const color = equipo === 1 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800';
    const nombre = equipo === 1 ? 'Radiant' : 'Dire';
    return <span className={`rounded px-2 py-1 text-xs font-medium ${color}`}>{nombre}</span>;
  }

  return (
    <div className="mt-6 rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Últimas partidas</h2>
        <Link
          href="/salas/historial"
          className="text-sm text-blue-600 hover:underline"
        >
          Ver todo
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : partidas.length === 0 ? (
        <p className="text-sm text-gray-500">No hay partidas terminadas aún.</p>
      ) : (
        <div className="space-y-4">
          {partidas.map((sala) => (
            <div key={sala.id} className="border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{sala.nombre}</h3>
                <span className="text-sm text-gray-500">
                  {new Date(sala.created_at).toLocaleDateString('es-PE')}
                </span>
              </div>

              {sala.partidas && (
                <div className="mt-1 text-sm text-gray-600">
                  <span className="font-medium">Ganador:</span>{' '}
                  {sala.partidas.equipo_ganador === 1
                    ? 'Radiant'
                    : 'Dire'}
                  <span className="mx-2">|</span>
                  <span className="font-medium">Pozo:</span> S/{' '}
                  {(sala.partidas.pozo / 100).toFixed(2)}
                </div>
              )}

              {sala.participantes_sala && sala.participantes_sala.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {sala.participantes_sala
                    .sort((a, b) => (a.equipo ?? 0) - (b.equipo ?? 0))
                    .map((p) => (
                      <div key={p.user_id} className="flex items-center gap-1">
                        <EquipoBadge equipo={p.equipo ?? 0} />
                        <span className="text-sm text-gray-900">{p.profiles?.nick ?? 'Usuario'}</span>
                      </div>
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
