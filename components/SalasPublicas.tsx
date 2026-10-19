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

export default function SalasPublicas({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { user } = useAuth();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(true);
  const [esParticipante, setEsParticipante] = useState<Record<string, boolean>>({});
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

      // Verificar si el usuario está en cada sala
      if (user) {
        const salaIds = data.map((s) => s.id);
        const { data: participaciones } = await supabase
          .from('participantes_sala')
          .select('sala_id')
          .eq('user_id', user.id)
          .in('sala_id', salaIds);

        if (participaciones) {
          const map: Record<string, boolean> = {};
          participaciones.forEach((p) => {
            map[p.sala_id] = true;
          });
          setEsParticipante(map);
        }
      }
    }
    setLoading(false);
  }, [user]);

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

  async function salirDeSala(salaId: string) {
    if (!user) return;
    setProcesando(salaId);

    const { error } = await supabase.rpc('salir_de_sala', {
      p_sala: salaId,
    });

    if (error) {
      alert(error.message);
    } else {
      await cargarSalas();
    }
    setProcesando(null);
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
            const participo = esParticipante[sala.id] ?? false;
            const puedeUnirse = sala.estado === 'abierta' && count < sala.cupo;
            const puedeSalir = participo && sala.estado !== 'en_juego';

            return (
              <div key={sala.id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{sala.nombre}</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Cuota:</span> S/ {(sala.cuota / 100).toFixed(2)}
                      </p>
                      <p>
                        <span className="font-medium">Jugadores:</span> {count}/{sala.cupo}
                      </p>
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
                  ) : participo ? (
                    puedeSalir ? (
                      <button
                        onClick={() => salirDeSala(sala.id)}
                        disabled={procesando === sala.id}
                        className="w-full rounded bg-red-600 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {procesando === sala.id ? 'Saliendo...' : 'Salir'}
                      </button>
                    ) : (
                      <div className="rounded bg-green-50 py-2 text-center text-sm text-green-700">
                        Estás en esta sala
                      </div>
                    )
                  ) : puedeUnirse ? (
                    <button
                      onClick={() => unirseASala(sala.id)}
                      disabled={procesando === sala.id}
                      className="w-full rounded bg-green-600 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {procesando === sala.id ? 'Uniéndose...' : 'Unirse'}
                    </button>
                  ) : (
                    <div className="rounded bg-gray-100 py-2 text-center text-sm text-gray-500">
                      {sala.estado === 'llena' ? 'Sala llena' : 'Sala en juego'}
                    </div>
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
