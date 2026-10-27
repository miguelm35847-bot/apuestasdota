'use client';

import { TONOS_EQUIPO, type TonoEquipo } from './tonosEquipo';
import Avatar from '@/components/Avatar';
import HeroEnSlot from '@/components/HeroEnSlot';
import MedallaMmr from '@/components/MedallaMmr';
import PerfilHover from '@/components/PerfilHover';
import ResumenJugador from '@/components/ResumenJugador';
import VivoJugador from '@/components/VivoJugador';
import {
  etiquetaRol,
  formatearMmr,
  ICONOS_ROL,
  resumenRolesConIconos
} from '@/lib/balance';
import type { Participante } from '@/lib/types';
import type { JugadorVivo } from '@/lib/vivo';
import Link from 'next/link';
import { type ReactNode } from 'react';

export function Columna({
  equipo,
  titulo,
  descripcion,
  jugadores,
  capacidad,
  horizontal = false,
  columnas,
  compacta = false,
  compactarVacios = false,
  tono,
  icono,
  esParticipante,
  miEquipo,
  userId,
  puedeMoverse,
  cambiandoEquipo,
  vivoPorNick,
  onCambiarEquipo,
}: {
  equipo: number | null;
  titulo: string;
  descripcion: string;
  jugadores: Participante[];
  capacidad: number;
  horizontal?: boolean;
  columnas?: string;
  compacta?: boolean;
  compactarVacios?: boolean;
  tono: TonoEquipo;
  icono: ReactNode;
  esParticipante: boolean;
  miEquipo: number | null;
  userId: string;
  puedeMoverse: boolean;
  cambiandoEquipo: boolean;
  vivoPorNick?: Map<string, JugadorVivo>;
  onCambiarEquipo: (equipo: number | null) => void;
}) {
  const esMiEquipo = esParticipante && miEquipo === equipo;
  const lleno = equipo !== null && jugadores.length >= capacidad;
  const t = TONOS_EQUIPO[tono];
  const slotsVisibles = compacta
    ? Math.max(jugadores.length, 1)
    : compactarVacios && jugadores.length === 0 ? 1 : capacidad;
  const textoVacio = compacta
    ? 'Esperando jugadores'
    : compactarVacios && jugadores.length === 0
      ? `${capacidad} ${capacidad === 1 ? 'cupo disponible' : 'cupos disponibles'}`
      : 'Libre';

  return (
    <div
      data-equipo={equipo ?? 'espera'}
      className={`arena-card @container flex flex-col overflow-hidden rounded-xl border bg-[#111827] shadow-arena-soft ${t.contenedor}`}
    >
      <div className={`relative px-3 py-2 ${t.cabecera}`}>
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-0.5 ${t.acento}`}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${t.icono}`}
            >
              {icono}
            </span>
            <span className={`truncate font-display font-bold ${t.titulo}`}>{titulo}</span>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ring-1 ring-inset ${t.contador}`}
          >
            {jugadores.length}/{capacidad}
          </span>
        </div>
        <p className={`mt-0.5 truncate pl-8 text-[11px] ${t.descripcion}`}>{descripcion}</p>
      </div>

      <div
        className={`flex-1 p-1.5 ${horizontal
          ? `grid gap-1.5 ${columnas ?? 'sm:grid-cols-2 lg:grid-cols-5'}`
          : 'space-y-1'
          }`}
      >
        {Array.from({ length: slotsVisibles }).map((_, i) => {
          const p = jugadores[i];

          if (!p) {
            return (
              <div
                key={`libre-${i}`}
                className={`flex min-h-10 items-center justify-center rounded-lg border-2 border-dashed border-white/10 text-xs text-slate-500 ${compacta ? 'col-span-full' : ''}`}
              >
                {textoVacio}
              </div>
            );
          }

          const mmr = p.profiles?.mmr;
          const roles = p.profiles?.roles_preferidos ?? [];
          const detalle =
            mmr != null
              ? `MMR ${formatearMmr(mmr)} · ${resumenRolesConIconos(roles)}`
              : `Sin MMR · ${resumenRolesConIconos(roles)}`;
          const nick = p.profiles?.nick ?? 'Usuario';
          const esTuyo = p.user_id === userId;

          const usuarioHover = {
            id: p.user_id,
            nick: p.profiles?.nick,
            steam_avatar_url: p.profiles?.steam_avatar_url,
            steam_nombre: p.profiles?.steam_nombre,
            mmr: p.profiles?.mmr,
            roles_preferidos: p.profiles?.roles_preferidos,
            equipo: p.equipo,
          };

          if (compacta) {
            return (
              <div
                key={p.user_id}
                className={`relative min-w-0 rounded-lg border p-2 transition hover:border-prism-400/40 ${esTuyo ? 'border-prism-400/60 bg-prism-500/10' : 'border-white/5 bg-white/[0.03]'
                  }`}
              >
                {p.verificado_at && (
                  <span
                    title="Listo para la partida"
                    aria-label="Listo para la partida"
                    className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-[5px] bg-emerald-500/20 text-[10px] font-bold leading-none text-emerald-300 ring-1 ring-inset ring-emerald-400/40"
                  >
                    ✓
                  </span>
                )}

                <PerfilHover
                  usuario={usuarioHover}
                  className="block"
                  abrirConClick
                >
                  <Link
                    href={`/jugadores/${p.user_id}`}
                    aria-label={`Ver perfil de ${nick}`}
                    className="flex min-h-10 min-w-0 items-start gap-1.5 pr-4 transition hover:opacity-90"
                  >
                    {/* Avatar y, justo debajo, el héroe que está jugando. */}
                    <span className="flex shrink-0 flex-col items-center gap-0.5">
                      <Avatar
                        nick={p.profiles?.nick}
                        src={p.profiles?.steam_avatar_url}
                        size="sm"
                        ringClass="ring-2 ring-white/20"
                        title={detalle}
                      />
                      <HeroEnSlot
                        jugador={vivoPorNick?.get(nick) ?? null}
                        className="mt-0.5"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-100">
                        {p.es_capitan ? '⭐ ' : ''}
                        {nick}
                        {esTuyo ? ' (tú)' : ''}
                      </p>
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <p
                          className={`flex shrink-0 items-center gap-1 text-[11px] font-bold ${mmr != null ? 'text-prism-300' : 'text-slate-500'
                            }`}
                        >
                          <MedallaMmr
                            mmr={mmr}
                            size="xs"
                            inline
                            className="shrink-0"
                          />
                          <span className="whitespace-nowrap">
                            {mmr != null ? `MMR ${formatearMmr(mmr)}` : 'Sin MMR'}
                          </span>
                        </p>
                        {roles.length > 0 && (
                          <span
                            className="flex shrink-0 items-center gap-0.5"
                            aria-label={`Roles: ${roles.map((r) => etiquetaRol(r)).join(', ')}`}
                          >
                            {roles.map((rol) => (
                              <span
                                key={rol}
                                title={etiquetaRol(rol)}
                                className="text-[11px] leading-none"
                              >
                                {ICONOS_ROL[rol]}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                      {/* K/D/A de la partida en vivo (el héroe va bajo el avatar). */}
                      <VivoJugador
                        jugador={vivoPorNick?.get(nick) ?? null}
                        mostrarIcono={false}
                        className="mt-0.5"
                      />
                    </div>
                  </Link>
                </PerfilHover>

                {/* El resumen va fuera del enlace del perfil: si no, el enlace a
                    Dotabuff quedaría anidado dentro de otro <a>. */}
                <ResumenJugador userId={p.user_id} compacto className="mt-1.5" />
              </div>
            );
          }

          return (
            <PerfilHover
              key={p.user_id}
              usuario={usuarioHover}
              className="block"
              abrirConClick
            >
              <Link
                href={`/jugadores/${p.user_id}`}
                aria-label={`Ver perfil de ${nick}`}
                className={`relative flex min-h-10 items-center gap-2 rounded-lg border px-2 py-0.5 pr-7 transition hover:border-prism-400/40 hover:bg-white/[0.06] ${esTuyo ? 'border-prism-400/60 bg-prism-500/10' : 'border-white/5 bg-white/[0.03]'
                  }`}
              >
                {p.verificado_at && (
                  <span
                    title="Listo para la partida"
                    aria-label="Listo para la partida"
                    className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-[5px] bg-emerald-500/20 text-[10px] font-bold leading-none text-emerald-300 ring-1 ring-inset ring-emerald-400/40"
                  >
                    ✓
                  </span>
                )}
                <span className="flex shrink-0 flex-col items-center gap-0.5">
                  <Avatar
                    nick={p.profiles?.nick}
                    src={p.profiles?.steam_avatar_url}
                    ringClass="ring-2 ring-white/20"
                    title={detalle}
                  />
                  <HeroEnSlot
                    jugador={vivoPorNick?.get(nick) ?? null}
                    className="mt-0.5"
                  />
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-100">
                      {p.es_capitan ? '⭐ ' : ''}
                      {nick}
                      {esTuyo ? ' (tú)' : ''}
                      <MedallaMmr
                        mmr={p.profiles?.mmr}
                        size="xs"
                        inline
                        className="shrink-0"
                      />
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {resumenRolesConIconos(roles)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-sm font-extrabold ${mmr != null
                      ? 'bg-prism-500/15 text-prism-200'
                      : 'bg-white/5 text-slate-500'
                      }`}
                  >
                    {mmr != null ? `MMR ${formatearMmr(mmr)}` : 'Sin MMR'}
                  </span>
                </div>
              </Link>
            </PerfilHover>
          );
        })}
      </div>

      {puedeMoverse && (
        <div className="border-t border-white/10 p-1.5">
          {esMiEquipo ? (
            <div className="rounded bg-white/5 py-1 text-center text-xs font-semibold text-slate-400">
              Estás aquí
            </div>
          ) : (
            <button
              onClick={() => onCambiarEquipo(equipo)}
              disabled={cambiandoEquipo || lleno}
              className={`w-full rounded-md py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${t.boton}`}
            >
              {lleno
                ? 'Equipo lleno'
                : equipo === null
                  ? 'Moverme a la espera'
                  : `Unirme a ${titulo}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
