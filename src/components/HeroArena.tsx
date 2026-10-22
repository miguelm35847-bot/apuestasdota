'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import PerfilHover from '@/components/PerfilHover';
import { useSalas } from '@/components/SalasProvider';
import HeroEnSlot from '@/components/HeroEnSlot';
import VivoMarcador from '@/components/VivoMarcador';
import { jugadorVivoDe, partidaVivaMock } from '@/lib/vivoMock';
import type { SalaPublica } from '@/lib/salas';

const PARTICULAS = [
  { left: '8%', size: 3, delay: -1, duracion: 13 },
  { left: '18%', size: 2, delay: -7, duracion: 16 },
  { left: '29%', size: 4, delay: -3, duracion: 12 },
  { left: '41%', size: 2, delay: -11, duracion: 18 },
  { left: '55%', size: 3, delay: -5, duracion: 15 },
  { left: '68%', size: 2, delay: -9, duracion: 14 },
  { left: '79%', size: 4, delay: -2, duracion: 17 },
  { left: '91%', size: 2, delay: -8, duracion: 15 },
];

function soles(centimos: number) {
  return `S/ ${(centimos / 100).toFixed(2)}`;
}

function jugadoresDe(sala: SalaPublica) {
  return sala.participantes_sala?.[0]?.count ?? 0;
}

/** Premio por ganador: el pozo menos la comisión, dividido entre los ganadores. */
function premioPorGanadorDe(sala: SalaPublica) {
  const comision = Math.floor((sala.cuota * sala.cupo * (sala.comision_bp ?? 0)) / 10000);
  const ganadores = sala.cupo === 2 ? 1 : 5;
  return Math.floor((sala.cuota * sala.cupo - comision) / ganadores);
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

function IconDota({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/dota2.svg"
      alt=""
      width={24}
      height={24}
      aria-hidden="true"
      className={`brightness-0 invert ${className}`}
    />
  );
}

function IconUsers({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCoin({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M15 9.2c-.7-.8-1.7-1.2-3-1.2-1.7 0-3 .9-3 2.2 0 1.4 1.2 2 3 2.4 1.9.4 3 1 3 2.4 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.4-3.1-1.2" />
    </svg>
  );
}

function IconWallet({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M4 8h15" />
      <path d="M15 13h6" />
      <circle cx="18" cy="13" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function HeroArena({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { salas, participantes, loading: cargando } = useSalas();

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

  const roster = useMemo(() => {
    const lista = destacada ? participantes[destacada.id] ?? [] : [];
    // Radiant a la izquierda y Dire a la derecha en cuanto hay equipos.
    return [...lista].sort((a, b) => (a.equipo ?? 3) - (b.equipo ?? 3));
  }, [destacada, participantes]);
  const cupoDestacada = destacada?.cupo ?? 0;
  const jugadoresDestacada = destacada ? jugadoresDe(destacada) : 0;

  // Partida en vivo de la sala destacada (MOCK hasta que llegue el league_id).
  const partidaViva = useMemo(
    () => (destacada?.estado === 'en_juego' ? partidaVivaMock(roster) : null),
    [destacada?.estado, roster]
  );

  const alMoverCursor = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`);
  };

  return (
    <section
      onPointerMove={alMoverCursor}
      className="arena-hero relative isolate overflow-hidden border-b border-white/[0.04] bg-[#05070c]"
    >
      <Image
        src="/hero-arena.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        aria-hidden="true"
        className="pointer-events-none -z-20 object-cover object-[center_25%] brightness-[1.8] contrast-[1.03]"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,7,12,0.62)_0%,rgba(5,7,12,0.25)_46%,rgba(5,7,12,0.06)_100%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_54%_60%_at_50%_42%,rgba(5,7,12,0.24),transparent_78%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,7,12,0.55)_0%,transparent_28%,transparent_62%,#070a10_100%)]"
        aria-hidden="true"
      />
      <div className="arena-spotlight -z-10" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
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

      <div className="relative mx-auto max-w-[1860px] px-4 sm:px-6 lg:px-8 xl:max-w-[1040px] 2xl:max-w-[1200px]">
        <div className="grid min-w-0 items-center gap-5 py-4 sm:gap-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(400px,440px)] lg:gap-10 lg:py-12 xl:grid-cols-[minmax(0,1fr)_minmax(440px,460px)] xl:gap-12 xl:py-10 2xl:grid-cols-[minmax(0,1fr)_minmax(500px,560px)] 2xl:gap-14">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3.5 py-1.5 text-[11px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md sm:text-xs">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Salas 1v1 y 5v5 · Yape / Plin
            </span>

            <div className="mt-4 flex items-center justify-center gap-3 lg:justify-start lg:gap-4">
              <IconDota className="h-10 w-10 shrink-0 drop-shadow-[0_0_22px_rgba(255,255,255,0.28)] sm:h-12 sm:w-12 lg:h-14 lg:w-14 xl:h-12 xl:w-12 2xl:h-14 2xl:w-14" />
              <h1 className="font-display bg-gradient-to-b from-white via-white to-slate-300 bg-clip-text text-[1.95rem] font-extrabold leading-[0.95] tracking-[-0.055em] text-transparent drop-shadow-[0_3px_22px_rgba(0,0,0,0.72)] min-[380px]:text-[2.2rem] sm:text-6xl lg:text-6xl xl:text-[3.5rem] 2xl:text-[4.25rem]">
                KódigoDota 2
              </h1>
            </div>

            <p className="mx-auto mt-3 max-w-xl font-display text-xs font-bold uppercase tracking-[0.12em] text-white min-[380px]:text-[13px] sm:text-base sm:tracking-[0.2em] lg:mx-0">
              Juega <span className="text-slate-500">·</span> Compite{' '}
              <span className="text-slate-500">·</span> Gana
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-3 sm:mt-5 lg:justify-start">
              {isAuthenticated ? (
                <Link
                  href="#salas"
                  className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#070a10] shadow-[0_0_45px_-14px_rgba(255,255,255,0.75)] transition hover:bg-slate-200"
                >
                  Ver salas activas
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#070a10] shadow-[0_0_45px_-14px_rgba(255,255,255,0.75)] transition hover:bg-slate-200"
                  >
                    Crear cuenta
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-xl border border-white/15 bg-black/30 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
                  >
                    Iniciar sesión
                  </Link>
                </>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-300 lg:hidden">
              <Link
                href="/como-jugar"
                className="inline-flex items-center gap-1.5 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 4h7a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4V4Z" />
                  <path d="M20 4h-3a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h3V4Z" />
                </svg>
                Cómo jugar
              </Link>
              <Link
                href="/como-jugar#reglas"
                className="inline-flex items-center gap-1.5 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 3 4.5 6v5.5c0 4.5 3 7.5 7.5 9.5 4.5-2 7.5-5 7.5-9.5V6L12 3Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Reglas
              </Link>
            </div>
          </div>

          <aside className="relative mx-auto w-full min-w-0 max-w-[560px] lg:mx-0 lg:max-w-none">
            <div
              className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(circle_at_55%_40%,rgba(99,102,241,0.26),transparent_68%)] blur-2xl"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-[1.65rem] border border-white/15 bg-[#080d15]/88 p-4 shadow-[0_34px_90px_-34px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-5">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.055] via-transparent to-white/[0.02]"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
                aria-hidden="true"
              />

              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
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
                  <div className="mt-4 space-y-3" aria-hidden="true">
                    <div className="h-7 w-2/3 animate-pulse rounded bg-white/10" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-white/5" />
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="h-16 animate-pulse rounded-xl bg-white/5" />
                      <div className="h-16 animate-pulse rounded-xl bg-white/5" />
                    </div>
                    <div className="h-11 animate-pulse rounded-xl bg-white/5" />
                  </div>
                ) : destacada ? (
                  <>
                    <div className="mt-3 flex min-w-0 items-center gap-2.5">
                      <IconDota className="h-6 w-6 shrink-0" />
                      <p className="min-w-0 font-display text-xl font-bold leading-tight text-white sm:text-2xl">
                        {destacada.nombre}
                      </p>
                    </div>
                    <p className="mt-1.5 text-[11px] font-medium text-slate-400 sm:text-xs">
                      {destacada.modalidad === '1v1' ? '1 vs 1' : '5 vs 5'} ·{' '}
                      {jugadoresDestacada}/{cupoDestacada} jugadores
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4">
                      <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3.5 py-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                          Cuota
                        </p>
                        <p className="mt-1 font-display text-lg font-bold text-white">
                          {soles(destacada.cuota)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3.5 py-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                          Premio por ganador
                        </p>
                        <p className="mt-1 font-display text-lg font-bold text-amber-300">
                          {soles(premioPorGanadorDe(destacada))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-4">
                      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        <span>Jugadores</span>
                        <span className="tabular-nums text-slate-300">
                          {jugadoresDestacada}/{cupoDestacada}
                        </span>
                      </div>
                      <div className="mt-2.5 grid grid-cols-5 gap-2 sm:grid-cols-10">
                        {Array.from({ length: cupoDestacada }).map((_, i) => {
                          const p = roster[i];

                          if (!p) {
                            return (
                              <span
                                key={`libre-${i}`}
                                className="flex flex-col items-center gap-0.5"
                                aria-hidden="true"
                              >
                                <span className="mx-auto h-7 w-7 rounded-full border-2 border-dashed border-white/12 bg-white/[0.02]" />
                                {/* espacio del icono de héroe para alinear la fila */}
                                <span className="h-[18px] w-[18px]" />
                              </span>
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
                                className="flex flex-col items-center gap-0.5 rounded-lg p-0.5 transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]"
                              >
                                <Avatar
                                  nick={p.profiles?.nick}
                                  src={p.profiles?.steam_avatar_url}
                                  size="xs"
                                  ringClass={ringEquipo(p.equipo)}
                                />
                                {/* Héroe que está jugando: va justo debajo del avatar. */}
                                <HeroEnSlot
                                  jugador={jugadorVivoDe(partidaViva, nick)}
                                  className="mt-0.5"
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

                    {partidaViva && (
                      <div className="mt-3">
                        <VivoMarcador partida={partidaViva} compacto />
                      </div>
                    )}

                    <Link
                      href={isAuthenticated ? `/salas/${destacada.id}` : '/login'}
                      className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#070a10] shadow-[0_0_38px_-16px_rgba(255,255,255,0.8)] transition hover:bg-slate-200 sm:mt-5"
                    >
                      {isAuthenticated ? 'Entrar a la sala' : 'Inicia sesión para entrar'}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </>
                ) : (
                  <div className="py-10 text-center">
                    <p className="font-display text-base font-bold text-white">
                      No hay salas activas ahora
                    </p>
                    <p className="mx-auto mt-1 max-w-[16rem] text-xs text-slate-400">
                      Crea una cuenta y arma la primera sala 1v1 o 5v5.
                    </p>
                    <Link
                      href={isAuthenticated ? '/salas' : '/register'}
                      className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#070a10] transition hover:bg-slate-200"
                    >
                      {isAuthenticated ? 'Ver salas' : 'Crear cuenta'}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[#05070c]/45 backdrop-blur-md [mask-image:radial-gradient(ellipse_120%_145%_at_50%_50%,black_42%,transparent_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
        <div className="relative mx-auto grid max-w-[1500px] grid-cols-2 px-2 sm:grid-cols-4 sm:px-6">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
            <IconDota className="h-5 w-5 shrink-0 opacity-65" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">
                Salas activas
              </p>
              <p className="font-display mt-0.5 text-lg font-bold tabular-nums text-white">
                {cargando ? '—' : salas.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
            <IconUsers className="h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">
                Jugadores
              </p>
              <p className="font-display mt-0.5 text-lg font-bold tabular-nums text-white">
                {cargando ? '—' : totalJugadores}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
            <IconCoin className="h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">
                En juego
              </p>
              <p className="font-display mt-0.5 whitespace-nowrap text-lg font-bold tabular-nums text-amber-300">
                {cargando ? '—' : soles(enJuego)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
            <IconWallet className="h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">
                Pagos
              </p>
              <p className="font-display mt-0.5 whitespace-nowrap text-lg font-bold text-white">
                Yape / Plin
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
