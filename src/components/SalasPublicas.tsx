'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

type Sala = {
  id: string;
  nombre: string;
  cuota: number;
  cupo: number;
  estado: string;
  participantes_sala: {
    count: number;
  }[];
};

type Participante = {
  user_id: string;
  equipo: number | null;
  profiles: {
    nick: string;
  };
};

export default function SalasPublicas({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { user } = useAuth();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [participantes, setParticipantes] = useState<Record<string, Participante[]>>({});
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);

  const cargarSalas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('salas')
      .select('*, participantes_sala(count)')
      .in('estado', ['abierta', 'llena', 'en_juego'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setSalas(data as any);

      // Cargar participantes de cada sala
      const salaIds = data.map((s) => s.id);
      const { data: parts } = await supabase
        .from('participantes_sala')
        .select('sala_id, user_id, equipo, profiles(nick)')
        .in('sala_id', salaIds);

      if (parts) {
        const map: Record<string, Participante[]> = {};
        parts.forEach((p: any) => {
          if (!map[p.sala_id]) map[p.sala_id] = [];
          map[p.sala_id].push(p);
        });
        setParticipantes(map);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarSalas();
  }, [cargarSalas]);

  async function unirseASala(salaId: string) {
    if (!user) return;
    setProcesando(salaId);

    const { error } = await supabase.rpc('unirse_a_sala', {
      p_sala: salaId,
    });

    if (error) {
      alert(error.message);
    } else {
      await cargarSalas();
    }
    setProcesando(null);
  }

  function Avatar({ nick }: { nick: string }) {
    const inicial = nick?.charAt(0)?.toUpperCase() || '?';
    const colores = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
    const color = colores[nick?.charCodeAt(0) % colores.length] || 'bg-gray-500';

    return (
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${color}`}
        title={nick}
      >
        {inicial}
      </div>
    );
  }

  function estadoBadge(estado: string) {
    const clases: Record<string, string> = {
      abierta: 'bg-green-100 text-green-800',
      llena: 'bg-yellow-100 text-yellow-800',
      en_juego: 'bg-blue-100 text-blue-800',
    };
    return clases[estado] ?? 'bg-gray-100 text-gray-800';
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Salas activas</h2>
      {loading ? (
        <p className="text-gray-500">Cargando salas...</p>
      ) : salas.length === 0 ? (
        <p className="text-gray-500">No hay salas activas en este momento</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {salas.map((sala) => {
            const count = sala.participantes_sala?.[0]?.count ?? 0;
            const parts = participantes[sala.id] ?? [];
            const puedeUnirse = sala.estado === 'abierta' && count < sala.cupo;

            return (
              <div key={sala.id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{sala.nombre}</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Cuota:</span> S/ {(sala.cuota / 100).toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {parts.slice(0, 5).map((p) => (
                            <Avatar key={p.user_id} nick={p.profiles?.nick ?? '?'} />
                          ))}
                        </div>
                        <span className="text-gray-600">
                          {count}/{sala.cupo}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-block rounded px-2 py-1 text-xs font-medium ${estadoBadge(sala.estado)}`}
                  >
                    {sala.estado === 'abierta' ? 'Abierta' : sala.estado === 'llena' ? 'Llena' : 'En juego'}
                  </span>
                </div>

                <div className="mt-4">
                  {!isAuthenticated ? (
                    <Link
                      href="/login"
                      className="block w-full rounded bg-blue-600 py-2 text-center text-white hover:bg-blue-700"
                    >
                      Inicia sesión para unirte
                    </Link>
                  ) : puedeUnirse ? (
                    <button
                      onClick={() => unirseASala(sala.id)}
                      disabled={procesando === sala.id}
                      className="w-full rounded bg-green-600 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {procesando === sala.id ? 'Uniéndose...' : 'Unirse'}
                    </button>
                  ) : (
                    <Link
                      href={`/salas/${sala.id}`}
                      className="block w-full rounded bg-blue-600 py-2 text-center text-white hover:bg-blue-700"
                    >
                      Ver sala
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
