'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
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
  } | null;
  participantes_sala: Participante[];
};

export default function HistorialPage() {
  useArenaBody();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [salas, setSalas] = useState<SalaTerminada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  async function cargarHistorial() {
    setLoading(true);
    const { data } = await supabase
      .from('salas')
      .select('*, partidas(*), participantes_sala(user_id, equipo, profiles(nick, steam_avatar_url))')
      .eq('estado', 'terminada')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setSalas(data as unknown as SalaTerminada[]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    if (user) void cargarHistorial();
  }, [user]);

  if (authLoading) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Historial de partidas" />

      <main className="mx-auto max-w-5xl px-4 py-8">
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
                    <span className="rounded bg-white/5 px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-white/10">
                      Terminada
                    </span>
                    {sala.partidas && (
                      <p className="mt-1 text-sm text-slate-400">
                        <span className="font-medium">Pozo:</span> S/ {(sala.partidas.pozo / 100).toFixed(2)} |{' '}
                        <span className="font-medium">Ganador:</span>{' '}
                        {sala.partidas.equipo_ganador === 1 ? 'Radiant' : 'Dire'}
                      </p>
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
                          <div key={p.user_id} className="flex items-center gap-1">
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
