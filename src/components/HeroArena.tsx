'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Avatar from '@/components/Avatar';
import PerfilHover from '@/components/PerfilHover';
import type { RolDota } from '@/lib/types';

type SalaHero = {
  id: string;
  nombre: string;
  cuota: number;
  cupo: number;
  comision_bp: number | null;
  estado: string;
  modalidad: string | null;
  destacada?: boolean | null;
  participantes_sala: { count: number }[];
};

type ParticipanteHero = {
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

const ESTADOS_ACTIVOS = ['abierta', 'llena', 'en_juego'];

const PARTICULAS = [
  { left: '6%', size: 3, delay: -1, duracion: 13 },
  { left: '14%', size: 2, delay: -7, duracion: 16 },
  { left: '23%', size: 4, delay: -3, duracion: 12 },
  { left: '31%', size: 2, delay: -11, duracion: 18 },
  { left: '42%', size: 3, delay: -5, duracion: 15 },
  { left: '51%', size: 2, delay: -9, duracion: 14 },
  { left: '59%', size: 4, delay: -2, duracion: 17 },
  { left: '67%', size: 2, delay: -12, duracion: 13 },
  { left: '74%', size: 3, delay: -6, duracion: 16 },
  { left: '82%', size: 2, delay: -4, duracion: 12 },
  { left: '89%', size: 4, delay: -10, duracion: 18 },
  { left: '95%', size: 2, delay: -8, duracion: 15 },
];

function soles(centimos: number) {
  return `S/ ${(centimos / 100).toFixed(2)}`;
}

function jugadoresDe(sala: SalaHero) {
  return sala.participantes_sala?.[0]?.count ?? 0;
}

function premioDe(sala: SalaHero) {
  const comision = sala.comision_bp ?? 0;
  return Math.round(sala.cuota * sala.cupo * (1 - comision / 10000));
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

function ringEquipo(equipo: number | null) {
  return equipo === 1
    ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#111827]'
    : equipo === 2
      ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-[#111827]'
      : 'ring-2 ring-slate-500 ring-offset-2 ring-offset-[#111827]';
}

export default function HeroArena({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [salas, setSalas] = useState<SalaHero[]>([]);
  const [participantes, setParticipantes] = useState<Record<string, ParticipanteHero[]>>({});
  const [cargando, setCargando] = useState(true);
  const refresco = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('salas')
      .select('*, participantes_sala(count)')
      .in('estado', ESTADOS_ACTIVOS)
      .order('created_at', { ascending: false });

    const filas = (data ?? []) as unknown as SalaHero[];
    setSalas(filas);

    const ids = filas.map((s) => s.id);
    if (ids.length === 0) {
      setParticipantes({});
      setCargando(false);
      return;
    }

    const { data: parts } = await supabase
      .from('participantes_sala')
      .select(
        'sala_id, user_id, equipo, profiles(nick, steam_avatar_url, steam_nombre, mmr, roles_preferidos)'
      )
      .in('sala_id', ids)
      .order('created_at', { ascending: true });

    const mapa: Record<string, ParticipanteHero[]> = {};
    ((parts ?? []) as unknown as ParticipanteHero[]).forEach((p) => {
      if (!mapa[p.sala_id]) mapa[p.sala_id] = [];
      mapa[p.sala_id].push(p);
    });
    setParticipantes(mapa);
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    cargar();

    const refrescar = () => {
      if (refresco.current) clearTimeout(refresco.current);
      refresco.current = setTimeout(() => cargar(), 300);
    };

    const channel = supabase
      .channel('hero-salas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, refrescar)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participantes_sala' },
        refrescar
      )
      .subscribe();

    return () => {
      if (refresco.current) clearTimeout(refresco.current);
      supabase.removeChannel(channel);
    };
  }, [cargar]);

  const totalJugadores = useMemo(
    () => salas.reduce((total, sala) => total + jugadoresDe(sala), 0),
    [salas]
  );
  const enJuego = useMemo(
    () => salas.reduce((total, sala) => total + sala.cuota * jugadoresDe(sala), 0),
    [salas]
  );

  const destacada = useMemo(() => {
    if (salas.length === 0) return null;
    const elegida = salas.find((s) => s.destacada === true);
    if (elegida) return elegida;
    const conJugadores = salas.filter((s) => jugadoresDe(s) > 0);
    const jugables = conJugadores.filter((s) => s.estado !== 'en_juego');
    const pool = jugables.length > 0 ? jugables : conJugadores.length > 0 ? conJugadores : salas;
    return [...pool].sort(
      (a, b) => jugadoresDe(b) / b.cupo - jugadoresDe(a) / a.cupo
    )[0];
  }, [salas]);

  const roster = destacada ? participantes[destacada.id] ?? [] : [];
  const cupoDestacada = destacada?.cupo ?? 0;
  const jugadoresDestacada = destacada ? jugadoresDe(destacada) : 0;

  const alMoverCursor = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`);
  };

  return (
    <section
      onPointerMove={alMoverCursor}
      className="arena-hero relative overflow-hidden bg-[#0a0e17]"
    >
      <div className="arena-grid pointer-events-none absolute inset-0" />
      <div className="arena-aurora arena-aurora--radiant" aria-hidden="true" />
      <div className="arena-aurora arena-aurora--dire" aria-hidden="true" />
      <div className="arena-spotlight" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {PARTICULAS.map((p, i) => (
          <span
            key={i}
            className="arena-particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duracion}s`,
            }}
          />
        ))}
      </div>
      <div className="arena-hero-line absolute inset-x-0 bottom-0 h-px" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-5 px-4 py-6 sm:gap-8 sm:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Salas 1v1 y 5v5 · Pagos con Yape o Plin
          </span>

          <h1 className="font-display mt-4 text-4xl font-extrabold tracking-tight sm:mt-5 sm:text-6xl">
            Apuestas{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-white to-rose-300 bg-clip-text text-transparent">
              Dota 2
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:mt-4 sm:text-base lg:mx-0">
            Salas de juego con premios en efectivo. Elige tu modalidad, arma tu equipo y juega.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3 sm:mt-6 lg:justify-start">
            {isAuthenticated ? (
              <Link
                href="/salas"
                className="arena-cta-shine rounded-xl bg-prism-500 px-6 py-2.5 text-sm font-bold text-white shadow-arena-glow transition hover:bg-prism-400"
              >
                Ver salas activas
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="arena-cta-shine rounded-xl bg-prism-500 px-6 py-2.5 text-sm font-bold text-white shadow-arena-glow transition hover:bg-prism-400"
                >
                  Crear cuenta
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-slate-100 backdrop-blur transition hover:bg-white/10"
                >
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-500 sm:mt-5 lg:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Radiant
            </span>
            <span className="hidden h-3 w-px bg-white/10 sm:block" />
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Dire
            </span>
            <span className="hidden h-3 w-px bg-white/10 sm:block" />
            <span>MMR y roles en vivo</span>
            <span className="hidden h-3 w-px bg-white/10 sm:block" />
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#fbbf24]" />
              Premios en efectivo
            </span>
          </div>
        </div>

        <aside className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div
            className="pointer-events-none absolute -inset-5 rounded-[2rem] bg-[radial-gradient(circle_at_60%_40%,rgba(99,102,241,0.28),transparent_65%)] blur-2xl"
            aria-hidden="true"
          />
          <div className="arena-card relative overflow-hidden rounded-3xl border border-white/10 bg-[#111827]/90 p-4 shadow-arena backdrop-blur-xl sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Sala destacada
              </span>
              {destacada && (
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${estadoBadge(destacada.estado)}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                  {estadoTexto(destacada.estado)}
                </span>
              )}
            </div>

            {cargando ? (
              <div className="mt-3 space-y-3" aria-hidden="true">
                <div className="h-6 w-2/3 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-white/5" />
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="h-16 animate-pulse rounded-xl bg-white/5" />
                  <div className="h-16 animate-pulse rounded-xl bg-white/5" />
                </div>
                <div className="h-10 animate-pulse rounded-xl bg-white/5" />
              </div>
            ) : destacada ? (
              <>
                <div className="mt-2.5 flex min-w-0 items-center gap-2">
                  <Image
                    src="/dota2.svg"
                    alt=""
                    width={20}
                    height={20}
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  />
                  <p className="min-w-0 truncate font-display text-xl font-bold text-white">
                    {destacada.nombre}
                  </p>
                </div>
                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  {destacada.modalidad === '1v1' ? '1 vs 1' : '5 vs 5'} ·{' '}
                  {jugadoresDestacada}/{cupoDestacada} jugadores
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white/[0.03] px-3 py-2 ring-1 ring-inset ring-white/5">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Cuota
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-white">
                      {soles(destacada.cuota)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] px-3 py-2 ring-1 ring-inset ring-white/5">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Premio estimado
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-amber-300">
                      {soles(premioDe(destacada))}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <span>Jugadores</span>
                    <span className="tabular-nums text-slate-400">
                      {jugadoresDestacada}/{cupoDestacada}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                    {Array.from({ length: cupoDestacada }).map((_, i) => {
                      const p = roster[i];

                      if (!p) {
                        return (
                          <span
                            key={`libre-${i}`}
                            className="mx-auto h-6 w-6 rounded-full border-2 border-dashed border-white/10 bg-white/[0.02]"
                            title="Slot libre"
                            aria-hidden="true"
                          />
                        );
                      }

                      const nick = p.profiles?.nick ?? 'Usuario';
                      return (
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
                          className="flex justify-center"
                        >
                          <Link
                            href={`/jugadores/${p.user_id}`}
                            aria-label={`Ver perfil de ${nick}`}
                            className="block rounded-full transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]"
                          >
                            <Avatar
                              nick={p.profiles?.nick}
                              src={p.profiles?.steam_avatar_url}
                              size="xs"
                              ringClass={ringEquipo(p.equipo)}
                            />
                          </Link>
                        </PerfilHover>
                      );
                    })}
                  </div>
                  {jugadoresDestacada === 0 && (
                    <p className="mt-2 text-[11px] text-slate-500">Sé el primero en unirte</p>
                  )}
                </div>

                <Link
                  href={isAuthenticated ? `/salas/${destacada.id}` : '/login'}
                  className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-prism-500 px-4 py-2.5 text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400"
                >
                  {isAuthenticated ? 'Entrar a la sala' : 'Inicia sesión para entrar'}
                  <span aria-hidden="true">→</span>
                </Link>
                <p className="mt-2 hidden text-center text-[10px] text-slate-500 sm:block">
                  Pago por Yape o Plin · Retiros con aprobación
                </p>
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="font-display text-base font-bold text-white">
                  No hay salas activas ahora
                </p>
                <p className="mx-auto mt-1 max-w-[16rem] text-xs text-slate-400">
                  Crea una cuenta y arma la primera sala 1v1 o 5v5.
                </p>
                <Link
                  href={isAuthenticated ? '/salas' : '/register'}
                  className="mt-4 inline-flex rounded-xl bg-prism-500 px-4 py-2 text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400"
                >
                  {isAuthenticated ? 'Ver salas' : 'Crear cuenta'}
                </Link>
              </div>
            )}
          </div>
        </aside>

        <div className="relative col-span-full grid grid-cols-4 gap-2 border-t border-white/10 pt-4 sm:gap-3 sm:pt-5">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="sm:hidden">Salas</span>
              <span className="hidden sm:inline">Salas activas</span>
            </p>
            <p className="font-display mt-1 text-sm font-bold tabular-nums text-white min-[380px]:text-base sm:text-lg">
              {cargando ? '—' : salas.length}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Jugadores
            </p>
            <p className="font-display mt-1 text-sm font-bold tabular-nums text-white min-[380px]:text-base sm:text-lg">
              {cargando ? '—' : totalJugadores}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              En juego
            </p>
            <p className="font-display mt-1 whitespace-nowrap text-sm font-bold tabular-nums text-amber-300 min-[380px]:text-base sm:text-lg">
              {cargando ? '—' : soles(enJuego)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Pagos
            </p>
            <p className="font-display mt-1 whitespace-nowrap text-sm font-bold text-white min-[380px]:text-base sm:text-lg">
              Yape / Plin
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
