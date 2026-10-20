'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import Toast from '@/components/Toast';
import Avatar from '@/components/Avatar';
import PerfilHover from '@/components/PerfilHover';
import type { RolDota } from '@/lib/types';

type Sala = {
  id: string;
  nombre: string;
  cuota: number;
  cupo: number;
  estado: string;
  modalidad?: string;
  destacada?: boolean;
  participantes_sala: {
    count: number;
  }[];
};

type Participante = {
  sala_id: string;
  user_id: string;
  equipo: number | null;
  profiles: {
    nick: string;
    steam_avatar_url?: string | null;
    steam_nombre?: string | null;
    mmr?: number | null;
    roles_preferidos?: RolDota[] | null;
  } | null;
};

function ringEquipo(equipo: number | null) {
  return equipo === 1
    ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#111827]'
    : equipo === 2
      ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-[#111827]'
      : 'ring-2 ring-slate-500 ring-offset-2 ring-offset-[#111827]';
}

function estadoBadge(estado: string) {
  const clases: Record<string, string> = {
    abierta: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
    llena: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
    en_juego: 'bg-prism-500/10 text-prism-300 ring-prism-500/30',
  };
  return clases[estado] ?? 'bg-white/5 text-slate-300 ring-white/10';
}

function estadoTexto(estado: string) {
  if (estado === 'abierta') return 'Abierta';
  if (estado === 'llena') return 'Llena';
  return 'En juego';
}

export default function SalasPublicas({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [participantes, setParticipantes] = useState<Record<string, Participante[]>>({});
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);

  const cargarSalas = useCallback(async () => {
    const { data } = await supabase
      .from('salas')
      .select('*, participantes_sala(count)')
      .in('estado', ['abierta', 'llena', 'en_juego'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      const filas = data as unknown as Sala[];
      setSalas(filas);

      // Cargar participantes de cada sala (para los avatares y saber si ya estoy dentro)
      const salaIds = filas.map((s) => s.id);
      if (salaIds.length === 0) {
        setParticipantes({});
        setLoading(false);
        return;
      }

      const { data: parts } = await supabase
        .from('participantes_sala')
        .select('sala_id, user_id, equipo, profiles(nick, steam_avatar_url, steam_nombre, mmr, roles_preferidos)')
        .in('sala_id', salaIds)
        .order('created_at', { ascending: true });

      if (parts) {
        const map: Record<string, Participante[]> = {};
        (parts as unknown as Participante[]).forEach((p) => {
          if (!map[p.sala_id]) map[p.sala_id] = [];
          map[p.sala_id].push(p);
        });
        setParticipantes(map);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    cargarSalas();
  }, [cargarSalas]);

  // Entradas, salidas y movimientos en vivo
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refrescar = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cargarSalas(), 300);
    };

    const channel = supabase
      .channel('salas-publicas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, refrescar)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participantes_sala' },
        refrescar
      )
      .subscribe();

    const interval = setInterval(() => cargarSalas(), 5000);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [cargarSalas]);

  async function unirseASala(salaId: string) {
    if (!user) return;
    setProcesando(salaId);

    const { error } = await supabase.rpc('unirse_a_sala', {
      p_sala: salaId,
    });

    if (error) {
      const errores: Record<string, string> = {
        'Completa tu MMR': 'Completa tu MMR en Mi perfil antes de unirte a una sala',
        'Debes vincular tu cuenta de Steam primero':
          'Vincula tu cuenta de Steam en tu perfil para poder jugar',
        'Saldo insuficiente': 'No tienes saldo suficiente',
      };
      const traducido = Object.entries(errores).find(([clave]) =>
        error.message.includes(clave)
      )?.[1];
      setAviso({ mensaje: traducido ?? error.message, tipo: 'error' });
      setProcesando(null);
    } else {
      // Avisa al Navbar para que refresque el saldo al instante
      window.dispatchEvent(new Event('saldo:refresh'));
      router.push(`/salas/${salaId}`);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">
          Salas activas
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          En vivo
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Radiant
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          Dire
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
          Lista de espera
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-white/20" />
          Libre
        </span>
      </div>

      {loading ? (
        <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 text-sm text-slate-400 shadow-arena-soft">
          Cargando salas...
        </div>
      ) : salas.length === 0 ? (
        <div className="arena-card rounded-2xl border border-dashed border-white/10 bg-[#111827] p-8 text-center">
          <p className="text-sm font-semibold text-slate-200">No hay salas activas por ahora</p>
          <p className="mt-1 text-xs text-slate-500">
            Vuelve en unos minutos o pide a un admin que abra una sala.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {salas.map((sala) => {
            const count = sala.participantes_sala?.[0]?.count ?? 0;
            const parts = participantes[sala.id] ?? [];
            const estoyDentro = !!user && parts.some((p) => p.user_id === user.id);
            const puedeUnirse = sala.estado === 'abierta' && count < sala.cupo && !estoyDentro;

            return (
              <div
                key={sala.id}
                className="arena-card group flex flex-col rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft transition hover:-translate-y-0.5 hover:border-prism-500/40 hover:shadow-arena-glow"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Image
                        src="/dota2.svg"
                        alt=""
                        width={16}
                        height={16}
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0"
                      />
                      <h3 className="font-display text-base font-bold tracking-tight text-white">
                        {sala.nombre}
                      </h3>
                      <span className="rounded-full bg-prism-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-prism-300 ring-1 ring-inset ring-prism-500/30">
                        {sala.modalidad ?? (sala.cupo === 2 ? '1v1' : '5v5')}
                      </span>
                      {sala.destacada && (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 ring-1 ring-inset ring-amber-500/30">
                          ★ Destacada
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${estadoBadge(sala.estado)}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                      {estadoTexto(sala.estado)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.03] px-3 py-2 ring-1 ring-inset ring-white/5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Cuota
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-white">
                        S/ {(sala.cuota / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] px-3 py-2 ring-1 ring-inset ring-white/5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Jugadores
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-white">
                        {count}/{sala.cupo}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {Array.from({ length: sala.cupo }).map((_, i) => {
                      const p = parts[i];

                      return p ? (
                        <PerfilHover
                          key={p.user_id}
                          usuario={{
                            id: p.user_id,
                            nick: p.profiles?.nick,
                            steam_avatar_url: p.profiles?.steam_avatar_url,
                            steam_nombre: p.profiles?.steam_nombre,
                            mmr: p.profiles?.mmr,
                            roles_preferidos: p.profiles?.roles_preferidos,
                            equipo: p.equipo,
                          }}
                          className="inline-block shrink-0"
                        >
                          <Link
                            href={`/jugadores/${p.user_id}`}
                            aria-label={`Ver perfil de ${p.profiles?.nick ?? 'jugador'}`}
                            className="block rounded-full transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]"
                          >
                            <Avatar
                              nick={p.profiles?.nick ?? '?'}
                              src={p.profiles?.steam_avatar_url}
                              ringClass={ringEquipo(p.equipo)}
                              title={`${p.profiles?.nick ?? 'Usuario'}${
                                p.profiles?.mmr != null ? ` · MMR ${p.profiles.mmr}` : ''
                              }${
                                p.equipo === 1 ? ' · Radiant' : p.equipo === 2 ? ' · Dire' : ' · Espera'
                              }`}
                            />
                          </Link>
                        </PerfilHover>
                      ) : (
                        <div
                          key={`libre-${i}`}
                          className="h-8 w-8 rounded-full border-2 border-dashed border-white/10 bg-white/[0.02]"
                          title="Slot libre"
                        />
                      );
                    })}
                    <span className="ml-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                      {count}/{sala.cupo}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  {!isAuthenticated ? (
                    <Link
                      href="/login"
                      className="block w-full rounded-xl bg-prism-500 py-2.5 text-center text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400"
                    >
                      Inicia sesión para unirte
                    </Link>
                  ) : estoyDentro ? (
                    <Link
                      href={`/salas/${sala.id}`}
                      className="block w-full rounded-xl bg-emerald-500/15 py-2.5 text-center text-sm font-semibold text-emerald-200 ring-1 ring-inset ring-emerald-500/30 transition hover:bg-emerald-500/20"
                    >
                      Ir a mi sala
                    </Link>
                  ) : puedeUnirse ? (
                    <button
                      onClick={() => unirseASala(sala.id)}
                      disabled={procesando === sala.id}
                      className="w-full rounded-xl bg-prism-500 py-2.5 text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {procesando === sala.id ? 'Uniéndose...' : 'Unirse'}
                    </button>
                  ) : (
                    <Link
                      href={`/salas/${sala.id}`}
                      className="block w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/10"
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

      <Toast
        mensaje={aviso?.mensaje ?? null}
        tipo={aviso?.tipo}
        onClose={() => setAviso(null)}
      />
    </div>
  );
}
