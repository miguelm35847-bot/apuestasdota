'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';
import Avatar from '@/components/Avatar';
import MedallaMmr from '@/components/MedallaMmr';
import ModalDonar from '@/components/ModalDonar';
import PlayerLinks from '@/components/PlayerLinks';
import Toast from '@/components/Toast';
import { etiquetaRol, ICONOS_ROL } from '@/lib/balance';
import type { RolDota } from '@/lib/types';

type PerfilJugador = {
  id: string;
  nick: string | null;
  steam_avatar_url: string | null;
  steam_nombre: string | null;
  mmr: number | null;
  roles_preferidos: RolDota[] | null;
  created_at: string | null;
};

type PartidaResumen = {
  dota_match_id: number | null;
  equipo_ganador: number;
  duracion_segundos: number | null;
  radiant_score: number | null;
  dire_score: number | null;
  cerrada_en: string | null;
  detectada_auto: boolean | null;
};

type FilaPartida = {
  sala_id: string;
  equipo: number | null;
  salas: {
    id: string;
    nombre: string;
    estado: string;
    modalidad: string | null;
    cupo: number;
    created_at: string;
    iniciada_at: string | null;
    partidas: PartidaResumen | null;
  } | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fechaPartida(fila: FilaPartida): string {
  return (
    fila.salas?.partidas?.cerrada_en ??
    fila.salas?.iniciada_at ??
    fila.salas?.created_at ??
    ''
  );
}

function fechaPartidaMs(fila: FilaPartida): number {
  const fecha = fechaPartida(fila);
  if (!fecha) return 0;
  const tiempo = new Date(fecha).getTime();
  return Number.isFinite(tiempo) ? tiempo : 0;
}

function formatearFecha(fecha: string): string {
  if (!fecha) return 'Sin fecha';
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatearDuracion(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${minutos}m ${resto.toString().padStart(2, '0')}s`;
}

function TarjetaPartida({ fila }: { fila: FilaPartida }) {
  const sala = fila.salas;
  const partida = sala?.partidas;

  if (!sala || !partida) return null;

  const gano = fila.equipo === partida.equipo_ganador;
  const modalidad = sala.modalidad ?? (sala.cupo === 2 ? '1v1' : '5v5');
  const miLado = fila.equipo === 1 ? 'Radiant' : fila.equipo === 2 ? 'Dire' : 'Sin equipo';
  const tieneMarcador = partida.radiant_score != null && partida.dire_score != null;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            gano
              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/25'
              : 'bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/25'
          }`}
          aria-hidden="true"
        >
          {gano ? '✓' : '✕'}
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-white">{sala.nombre}</p>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 ring-1 ring-inset ring-white/10">
              {modalidad}
            </span>
            {partida.detectada_auto && (
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
                Auto
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {formatearFecha(fechaPartida(fila))}
            <span className="mx-1.5 text-slate-600">·</span>
            {miLado}
            <span className="mx-1.5 text-slate-600">·</span>
            <span className={gano ? 'font-semibold text-emerald-300' : 'font-semibold text-rose-300'}>
              {gano ? 'Victoria' : 'Derrota'}
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 sm:justify-end">
        {tieneMarcador && (
          <span
            className="inline-flex items-center gap-1.5 tabular-nums"
            title="Marcador Radiant - Dire"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {partida.radiant_score}
            <span className="text-slate-600">-</span>
            {partida.dire_score}
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          </span>
        )}

        {partida.duracion_segundos != null && (
          <span className="tabular-nums">{formatearDuracion(partida.duracion_segundos)}</span>
        )}

        {partida.dota_match_id ? (
          <a
            href={`https://www.dotabuff.com/matches/${partida.dota_match_id}`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-prism-300 transition hover:text-prism-200 hover:underline"
          >
            #{partida.dota_match_id}
          </a>
        ) : (
          <span className="text-slate-500">Sin ID de partida</span>
        )}
      </div>
    </article>
  );
}

function PerfilJugadorContenido() {
  useArenaBody();
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [perfil, setPerfil] = useState<PerfilJugador | null>(null);
  const [filas, setFilas] = useState<FilaPartida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [donarAbierto, setDonarAbierto] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargarPerfil() {
      if (!id || !UUID_RE.test(id)) {
        if (activo) {
          setNoEncontrado(true);
          setCargando(false);
        }
        return;
      }

      setCargando(true);
      setError(null);
      setNoEncontrado(false);

      const [perfilRes, partidasRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'id, nick, steam_avatar_url, steam_nombre, mmr, roles_preferidos, created_at'
          )
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('participantes_sala')
          .select(
            `sala_id, equipo, salas!inner(
              id, nombre, estado, modalidad, cupo, created_at, iniciada_at,
              partidas!inner(
                dota_match_id, equipo_ganador, duracion_segundos,
                radiant_score, dire_score, cerrada_en, detectada_auto
              )
            )`
          )
          .eq('user_id', id)
          .eq('salas.estado', 'terminada'),
      ]);

      if (!activo) return;

      if (perfilRes.error) {
        setError('No se pudo cargar el perfil. Intenta nuevamente.');
        setCargando(false);
        return;
      }

      if (!perfilRes.data) {
        setNoEncontrado(true);
        setCargando(false);
        return;
      }

      setPerfil(perfilRes.data as PerfilJugador);

      if (partidasRes.error) {
        setError('No se pudieron cargar las últimas partidas.');
        setFilas([]);
      } else {
        setFilas((partidasRes.data ?? []) as unknown as FilaPartida[]);
      }

      setCargando(false);
    }

    void cargarPerfil();

    return () => {
      activo = false;
    };
  }, [id]);

  if (cargando) {
    return (
      <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
        <Navbar titulo="Perfil de jugador" />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="arena-card animate-pulse rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/10" />
              <div className="space-y-2">
                <div className="h-5 w-40 rounded bg-white/10" />
                <div className="h-3 w-56 rounded bg-white/5" />
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="h-20 rounded-xl bg-white/[0.03]" />
              <div className="h-20 rounded-xl bg-white/[0.03]" />
              <div className="h-20 rounded-xl bg-white/[0.03]" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (noEncontrado || !perfil) {
    return (
      <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
        <Navbar titulo="Perfil de jugador" />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-8 text-center shadow-arena-soft">
            <p className="text-4xl" aria-hidden="true">
              🕵️
            </p>
            <h1 className="font-display mt-3 text-2xl font-bold text-white">
              Jugador no encontrado
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              El perfil que buscas no existe o ya no está disponible.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-xl bg-prism-500 px-4 py-2 text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400"
            >
              Volver al inicio
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const nombre = perfil.nick?.trim() || perfil.steam_nombre?.trim() || 'Jugador';
  const esMiPerfil = Boolean(user && user.id === perfil.id);
  const roles = (perfil.roles_preferidos ?? []) as RolDota[];

  const partidas = filas
    .filter((fila) => {
      const partida = fila.salas?.partidas;
      return Boolean(partida && (fila.equipo === 1 || fila.equipo === 2));
    })
    .sort((a, b) => fechaPartidaMs(b) - fechaPartidaMs(a));

  const ganadas = partidas.filter(
    (fila) => fila.equipo === fila.salas?.partidas?.equipo_ganador
  ).length;
  const winrate = partidas.length > 0 ? Math.round((ganadas / partidas.length) * 100) : null;
  const miembroDesde = perfil.created_at
    ? new Date(perfil.created_at).toLocaleDateString('es-PE', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo={`Perfil de ${nombre}`} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-white"
          >
            <span aria-hidden="true">←</span>
            Volver al inicio
          </Link>
          {esMiPerfil ? (
            <Link
              href="/perfil"
              className="inline-flex items-center gap-1.5 rounded-lg border border-prism-500/30 bg-prism-500/10 px-3 py-1.5 text-sm font-semibold text-prism-200 transition hover:bg-prism-500/20"
            >
              Editar mi perfil
            </Link>
          ) : (
            user && (
              <button
                onClick={() => setDonarAbierto(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
              >
                <span aria-hidden="true">🎁</span>
                Donar saldo
              </button>
            )
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            {error}
          </div>
        )}

        <section className="arena-card overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-arena-soft">
          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar
                nick={nombre}
                src={perfil.steam_avatar_url}
                size="xl"
                ringClass="ring-2 ring-white/20"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold text-white">{nombre}</h1>
                  {esMiPerfil && (
                    <span className="rounded-full bg-prism-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-prism-200 ring-1 ring-inset ring-prism-500/30">
                      Tú
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-400">
                  {perfil.steam_nombre
                    ? `Steam: ${perfil.steam_nombre}`
                    : 'Cuenta de Dota 2'}
                </p>
                {miembroDesde && (
                  <p className="mt-0.5 text-xs text-slate-500">Miembro desde {miembroDesde}</p>
                )}

                <PlayerLinks userId={perfil.id} tamano="md" className="mt-2" />

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {roles.length > 0 ? (
                    roles.map((rol, indice) => (
                      <span
                        key={rol}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200"
                      >
                        <span aria-hidden="true">{ICONOS_ROL[rol]}</span>
                        <span>
                          {indice + 1}. {etiquetaRol(rol)}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">Sin roles preferidos</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-end">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
                <MedallaMmr mmr={perfil.mmr} size="lg" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Partidas
            </p>
            <p className="font-display mt-1 text-3xl font-bold tabular-nums text-white">
              {partidas.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Partidas terminadas</p>
          </div>

          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Victorias
            </p>
            <p className="font-display mt-1 text-3xl font-bold tabular-nums text-emerald-300">
              {ganadas}
            </p>
            <p className="mt-1 text-xs text-slate-500">Partidas ganadas</p>
          </div>

          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Winrate
            </p>
            <p className="font-display mt-1 text-3xl font-bold tabular-nums text-prism-300">
              {winrate !== null ? `${winrate}%` : '—'}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${winrate ?? 0}%` }}
              />
            </div>
          </div>
        </section>

        <section className="arena-card mt-4 rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-white">Últimas partidas</h2>
            <span className="text-xs text-slate-500">
              {partidas.length > 0
                ? `Mostrando ${Math.min(10, partidas.length)} de ${partidas.length}`
                : 'Sin partidas'}
            </span>
          </div>

          {partidas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-300">
                Todavía no tiene partidas terminadas
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Cuando se cierre una partida, aparecerá aquí con su resultado y marcador.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {partidas.slice(0, 10).map((fila) => (
                <TarjetaPartida key={fila.sala_id} fila={fila} />
              ))}
            </div>
          )}
        </section>
      </main>

      {donarAbierto && (
        <ModalDonar
          receptor={{
            id: perfil.id,
            nick: perfil.nick,
            steam_avatar_url: perfil.steam_avatar_url,
          }}
          onCerrar={() => setDonarAbierto(false)}
          onListo={(mensaje) => setToast(mensaje)}
        />
      )}

      <Toast mensaje={toast} tipo="success" onClose={() => setToast(null)} />
    </div>
  );
}

export default function PerfilJugadorPage() {
  return (
    <Suspense
      fallback={
        <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
          Cargando perfil...
        </div>
      }
    >
      <PerfilJugadorContenido />
    </Suspense>
  );
}
