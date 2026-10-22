'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useSalas } from '@/components/SalasProvider';
import Toast from '@/components/Toast';
import Avatar from '@/components/Avatar';
import FormularioCrearSala from '@/components/FormularioCrearSala';
import PerfilHover from '@/components/PerfilHover';
import HeroEnSlot from '@/components/HeroEnSlot';
import VivoMarcador from '@/components/VivoMarcador';
import { jugadorVivoDe, partidaVivaMock } from '@/lib/vivoMock';

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
  const { salas: todasLasSalas, participantes, loading } = useSalas();
  const salas = todasLasSalas.slice(0, 10);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [showCrear, setShowCrear] = useState(false);
  const [destacandoId, setDestacandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc('es_admin').then(({ data }: { data: boolean | null }) => {
      setEsAdmin(data === true);
    });
  }, [user]);

  async function alternarDestacada(sala: { id: string; destacada?: boolean | null; nombre: string }) {
    setAviso(null);
    setDestacandoId(sala.id);

    const { error: rpcError } = await supabase.rpc('admin_destacar_sala', {
      p_sala: sala.id,
      p_destacar: !sala.destacada,
    });

    if (rpcError) {
      const detalle = rpcError.message.includes('Could not find the function')
        ? 'falta ejecutar el SQL de admin_destacar_sala en Supabase'
        : rpcError.message;
      setAviso({ mensaje: 'No se pudo actualizar la sala destacada: ' + detalle, tipo: 'error' });
    } else {
      setAviso({
        mensaje: sala.destacada
          ? `Ya no es la sala destacada.`
          : `“${sala.nombre}” ahora es la sala destacada del hero.`,
        tipo: 'success',
      });
    }

    setDestacandoId(null);
  }

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
        <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Salas activas
        </h2>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            En vivo
          </span>
          {esAdmin && (
            <button
              onClick={() => setShowCrear(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#070a10] shadow-[0_0_28px_-14px_rgba(255,255,255,0.7)] transition hover:bg-slate-200"
            >
              <span aria-hidden="true">+</span>
              Crear sala
            </button>
          )}
        </div>
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
        <div className="grid gap-4 2xl:grid-cols-2">
          {salas.map((sala, index) => {
            const count = sala.participantes_sala?.[0]?.count ?? 0;
            const parts = participantes[sala.id] ?? [];
            const estoyDentro = !!user && parts.some((p) => p.user_id === user.id);
            const puedeUnirse = sala.estado === 'abierta' && count < sala.cupo && !estoyDentro;
            const esRadiant = index % 2 === 0;

            // Partida en vivo de la sala (MOCK hasta que llegue el league_id).
            const partidaViva =
              sala.estado === 'en_juego' ? partidaVivaMock(parts) : null;

            // Mismo cálculo que la sala y el hero: pozo menos comisión, dividido
            // entre los ganadores de cada equipo.
            const pozo = sala.cuota * sala.cupo;
            const comision = Math.floor((pozo * (sala.comision_bp ?? 0)) / 10000);
            const premioPorGanador = Math.floor((pozo - comision) / (sala.cupo === 2 ? 1 : 5));

            return (
              <div
                key={sala.id}
                className={`arena-card group relative flex flex-col overflow-hidden rounded-2xl border bg-[#0a0f17] p-4 shadow-arena-soft transition hover:-translate-y-0.5 hover:border-white/20 hover:shadow-arena ${
                  sala.destacada ? 'border-amber-400/25' : 'border-white/10'
                }`}
              >
                <div
                  className={`pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl ${
                    esRadiant ? 'bg-emerald-500/15' : 'bg-rose-500/15'
                  }`}
                  aria-hidden="true"
                />
                <div
                  className={`pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full blur-3xl ${
                    esRadiant ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                  }`}
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute -right-8 top-1/2 h-56 w-56 -translate-y-1/2 opacity-[0.06]"
                  aria-hidden="true"
                >
                  <Image
                    src="/dota2.svg"
                    alt=""
                    width={224}
                    height={224}
                    className="h-56 w-56"
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  aria-hidden="true"
                />
                <div className="relative flex-1">
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
                      <h3 className="font-display text-base font-bold tracking-tight text-white sm:text-lg">
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

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-1.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        Cuota
                      </p>
                      <p className="font-display text-sm font-bold text-white">
                        S/ {(sala.cuota / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-1.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        Por ganador
                      </p>
                      <p className="font-display text-sm font-bold text-amber-300">
                        S/ {(premioPorGanador / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-start gap-1">
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
                            className="flex flex-col items-center gap-0.5 rounded-lg p-0.5 transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]"
                          >
                            <Avatar
                              nick={p.profiles?.nick ?? '?'}
                              src={p.profiles?.steam_avatar_url}
                              size="xs"
                              ringClass={ringEquipo(p.equipo)}
                              title={`${p.profiles?.nick ?? 'Usuario'}${
                                p.profiles?.mmr != null ? ` · MMR ${p.profiles.mmr}` : ''
                              }${
                                p.equipo === 1 ? ' · Radiant' : p.equipo === 2 ? ' · Dire' : ' · Espera'
                              }`}
                            />
                            {/* Héroe que está jugando: justo debajo del avatar. */}
                            <HeroEnSlot
                              jugador={jugadorVivoDe(partidaViva, p.profiles?.nick)}
                              className="mt-0.5"
                            />
                          </Link>
                        </PerfilHover>
                      ) : (
                        <div
                          key={`libre-${i}`}
                          className="flex flex-col items-center gap-0.5"
                          title="Slot libre"
                        >
                          <span className="h-6 w-6 rounded-full border-2 border-dashed border-white/10 bg-white/[0.02]" />
                          {/* espacio del icono de héroe para alinear la fila */}
                          <span className="h-[18px] w-[18px]" />
                        </div>
                      );
                    })}
                    <span className="ml-1 self-center rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-300">
                      {count}/{sala.cupo}
                    </span>
                  </div>

                  {/* Marcador en vivo de la partida de esta sala. */}
                  {partidaViva && (
                    <div className="mt-3">
                      <VivoMarcador partida={partidaViva} compacto />
                    </div>
                  )}

                  {esAdmin && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-2.5">
                      <button
                        onClick={() => alternarDestacada(sala)}
                        disabled={destacandoId === sala.id}
                        className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
                        title={
                          sala.destacada
                            ? 'Quitar el destaque del hero'
                            : 'Mostrar esta sala en el hero del landing'
                        }
                      >
                        {destacandoId === sala.id
                          ? '...'
                          : sala.destacada
                            ? '★ Quitar destacado'
                            : '☆ Destacar'}
                      </button>
                      <Link
                        href={`/admin/salas/${sala.id}`}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10"
                        title="Gestionar la sala (equipos, lobby, verificación, cierre)"
                      >
                        Gestionar →
                      </Link>
                    </div>
                  )}
                </div>

                <div className="relative mt-3">
                  {!isAuthenticated ? (
                    <Link
                      href="/login"
                      className="block w-full rounded-xl bg-white py-2.5 text-center text-sm font-bold text-[#070a10] shadow-[0_0_32px_-16px_rgba(255,255,255,0.7)] transition hover:bg-slate-200"
                    >
                      Inicia sesión para unirte
                    </Link>
                  ) : estoyDentro ? (
                    <Link
                      href={`/salas/${sala.id}`}
                      className="block w-full rounded-xl bg-emerald-500 py-2.5 text-center text-sm font-bold text-[#04120c] shadow-[0_12px_30px_-16px_rgba(16,185,129,0.8)] transition hover:bg-emerald-400"
                    >
                      Ir a mi sala
                    </Link>
                  ) : puedeUnirse ? (
                    <button
                      onClick={() => unirseASala(sala.id)}
                      disabled={procesando === sala.id}
                      className="w-full rounded-xl bg-white py-2.5 text-sm font-bold text-[#070a10] shadow-[0_0_32px_-16px_rgba(255,255,255,0.7)] transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {procesando === sala.id ? 'Uniéndose...' : 'Unirse'}
                    </button>
                  ) : (
                    <Link
                      href={`/salas/${sala.id}`}
                      className="block w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-center text-sm font-semibold text-slate-100 transition hover:bg-white/10"
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

      {showCrear && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crear-sala-title"
        >
          <div className="arena-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="crear-sala-title"
                  className="font-display text-xl font-bold tracking-tight text-white"
                >
                  Nueva sala
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  La sala aparece de inmediato en el landing para que se unan los jugadores.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCrear(false)}
                aria-label="Cerrar"
                className="rounded-full p-2 text-2xl leading-none text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                ×
              </button>
            </div>

            <FormularioCrearSala
              mostrarCancelar
              onCancelar={() => setShowCrear(false)}
              onCreada={() => {
                setShowCrear(false);
                setAviso({ mensaje: 'Sala creada. Ya aparece en el landing.', tipo: 'success' });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
