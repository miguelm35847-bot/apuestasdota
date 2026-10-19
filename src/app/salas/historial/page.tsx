'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

type Participante = {
  user_id: string;
  equipo: number | null;
  profiles: {
    nick: string;
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
  } | null;
  participantes_sala: Participante[];
};

export default function HistorialPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [salas, setSalas] = useState<SalaTerminada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) cargarHistorial();
  }, [user]);

  async function cargarHistorial() {
    setLoading(true);
    const { data } = await supabase
      .from('salas')
      .select('*, partidas(*), participantes_sala(user_id, equipo, profiles(nick))')
      .eq('estado', 'terminada')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setSalas(data as any);
    setLoading(false);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Historial de partidas</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Inicio
            </Link>
            <Link href="/salas" className="text-sm text-gray-600 hover:text-gray-900">
              Salas
            </Link>
            <Link href="/perfil" className="text-sm text-gray-600 hover:text-gray-900">
              Mi perfil
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {loading ? (
          <p className="text-gray-500">Cargando historial...</p>
        ) : salas.length === 0 ? (
          <div className="rounded-lg bg-white p-6 shadow text-center">
            <p className="text-gray-500">No hay partidas terminadas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {salas.map((sala) => (
              <div key={sala.id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{sala.nombre}</h3>
                    <div className="mt-1 text-sm text-gray-600">
                      <span className="font-medium">Fecha:</span>{' '}
                      {new Date(sala.created_at).toLocaleDateString('es-PE')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                      Terminada
                    </span>
                    {sala.partidas && (
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">Pozo:</span> S/ {(sala.partidas.pozo / 100).toFixed(2)} |{' '}
                        <span className="font-medium">Ganador:</span>{' '}
                        {sala.partidas.equipo_ganador === 1 ? 'Radiant' : 'Dire'}
                      </p>
                    )}
                  </div>
                </div>

                {sala.participantes_sala && sala.participantes_sala.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Jugadores</p>
                    <div className="flex flex-wrap gap-2">
                      {sala.participantes_sala
                        .sort((a, b) => (a.equipo ?? 0) - (b.equipo ?? 0))
                        .map((p) => (
                          <div key={p.user_id} className="flex items-center gap-1">
                            <span
                              className={`rounded px-2 py-1 text-xs font-medium ${
                                p.equipo === 1
                                  ? 'bg-blue-100 text-blue-800'
                                  : p.equipo === 2
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {p.equipo === 1 ? 'Radiant' : p.equipo === 2 ? 'Dire' : 'Sin equipo'}
                            </span>
                            <span className="text-sm text-gray-900">{p.profiles?.nick ?? 'Usuario'}</span>
                          </div>
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
