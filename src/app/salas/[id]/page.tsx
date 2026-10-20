'use client';

import { useEffect, useState, useCallback, useRef, Suspense, type ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';
import ChatPanel from '@/components/ChatPanel';
import Avatar from '@/components/Avatar';
import PerfilHover from '@/components/PerfilHover';
import { intentarCierreAutomatico } from '@/lib/dotaAutoClose';
import {
  etiquetaRol,
  formatearMmr,
  ICONOS_ROL,
  ROLES_DOTA,
  resumenRolesConIconos,
} from '@/lib/balance';
import type { Lobby, Participante, RolDota, Sala } from '@/lib/types';

type TonoEquipo = 'radiant' | 'dire' | 'neutral';

/**
 * Paleta de equipos para Arena Dark.
 * Evita rellenos saturados: usa superficies tenues, un acento lateral y chips con ring.
 */
const TONOS_EQUIPO: Record<
  TonoEquipo,
  {
    contenedor: string;
    cabecera: string;
    acento: string;
    icono: string;
    titulo: string;
    descripcion: string;
    contador: string;
    boton: string;
    panel: string;
    panelTitulo: string;
    panelContador: string;
  }
> = {
  radiant: {
    contenedor: 'border-emerald-400/15',
    cabecera: 'border-b border-emerald-400/10 bg-emerald-500/[0.05]',
    acento: 'bg-emerald-400/60',
    icono: 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/15',
    titulo: 'text-emerald-100',
    descripcion: 'text-emerald-200/50',
    contador: 'bg-emerald-500/10 text-emerald-100 ring-emerald-400/20',
    boton:
      'bg-emerald-500/10 text-emerald-100 ring-1 ring-inset ring-emerald-400/20 hover:bg-emerald-500/20',
    panel: 'border-emerald-400/15 bg-emerald-500/[0.04]',
    panelTitulo: 'text-emerald-200',
    panelContador: 'bg-emerald-500/10 text-emerald-100 ring-1 ring-inset ring-emerald-400/20',
  },
  dire: {
    contenedor: 'border-rose-400/15',
    cabecera: 'border-b border-rose-400/10 bg-rose-500/[0.05]',
    acento: 'bg-rose-400/60',
    icono: 'bg-rose-500/10 text-rose-200 ring-rose-400/15',
    titulo: 'text-rose-100',
    descripcion: 'text-rose-200/50',
    contador: 'bg-rose-500/10 text-rose-100 ring-rose-400/20',
    boton: 'bg-rose-500/10 text-rose-100 ring-1 ring-inset ring-rose-400/20 hover:bg-rose-500/20',
    panel: 'border-rose-400/15 bg-rose-500/[0.04]',
    panelTitulo: 'text-rose-200',
    panelContador: 'bg-rose-500/10 text-rose-100 ring-1 ring-inset ring-rose-400/20',
  },
  neutral: {
    contenedor: 'border-white/10',
    cabecera: 'border-b border-white/5 bg-white/[0.02]',
    acento: 'bg-slate-400/40',
    icono: 'bg-white/5 text-slate-300 ring-white/10',
    titulo: 'text-slate-100',
    descripcion: 'text-slate-400',
    contador: 'bg-white/5 text-slate-300 ring-white/10',
    boton: 'bg-white/5 text-slate-200 ring-1 ring-inset ring-white/10 hover:bg-white/10',
    panel: 'border-white/10 bg-white/[0.02]',
    panelTitulo: 'text-slate-300',
    panelContador: 'bg-white/5 text-slate-300 ring-white/10',
  },
};

function IconoRadiant() {
  return (
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
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" />
      <path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12" />
    </svg>
  );
}

function IconoDire() {
  return (
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
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
    </svg>
  );
}

function IconoEspera() {
  return (
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
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22" />
      <path d="M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2" />
    </svg>
  );
}

function Columna({
  equipo,
  titulo,
  descripcion,
  jugadores,
  capacidad,
  horizontal = false,
  columnas,
  compacta = false,
  tono,
  icono,
  esParticipante,
  miEquipo,
  userId,
  puedeMoverse,
  cambiandoEquipo,
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
  tono: TonoEquipo;
  icono: ReactNode;
  esParticipante: boolean;
  miEquipo: number | null;
  userId: string;
  puedeMoverse: boolean;
  cambiandoEquipo: boolean;
  onCambiarEquipo: (equipo: number | null) => void;
}) {
  const esMiEquipo = esParticipante && miEquipo === equipo;
  const lleno = equipo !== null && jugadores.length >= capacidad;
  const t = TONOS_EQUIPO[tono];

  return (
    <div
      className={`arena-card flex flex-col overflow-hidden rounded-xl border bg-[#111827] shadow-arena-soft ${t.contenedor}`}
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
        className={`flex-1 p-1.5 ${
          horizontal
            ? `grid gap-1.5 ${columnas ?? 'sm:grid-cols-2 lg:grid-cols-5'}`
            : 'space-y-1'
        }`}
      >
        {Array.from({ length: capacidad }).map((_, i) => {
          const p = jugadores[i];

          if (!p) {
            return (
              <div
                key={`libre-${i}`}
                className="flex min-h-10 items-center justify-center rounded-lg border-2 border-dashed border-white/10 text-xs text-slate-500"
              >
                Libre
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
              <PerfilHover
                key={p.user_id}
                usuario={usuarioHover}
                className="block"
                abrirConClick
              >
                <Link
                  href={`/jugadores/${p.user_id}`}
                  aria-label={`Ver perfil de ${nick}`}
                  className={`flex min-h-10 items-center gap-1.5 rounded-lg border px-1.5 py-0.5 transition hover:border-prism-400/40 hover:bg-white/[0.06] ${
                    esTuyo ? 'border-prism-400/60 bg-prism-500/10' : 'border-white/5 bg-white/[0.03]'
                  }`}
                >
                  <Avatar
                    nick={p.profiles?.nick}
                    src={p.profiles?.steam_avatar_url}
                    size="sm"
                    ringClass="ring-2 ring-white/20"
                    title={detalle}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-100">
                      {p.es_capitan ? '⭐ ' : ''}
                      {nick}
                      {esTuyo ? ' (tú)' : ''}
                    </p>
                    <div className="flex min-w-0 items-center justify-between gap-1">
                      <p
                        className={`truncate text-[11px] font-bold ${
                          mmr != null ? 'text-prism-300' : 'text-slate-500'
                        }`}
                      >
                        {mmr != null ? `MMR ${formatearMmr(mmr)}` : 'Sin MMR'}
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
                  </div>
                </Link>
              </PerfilHover>
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
                className={`flex min-h-10 items-center gap-2 rounded-lg border px-2 py-0.5 transition hover:border-prism-400/40 hover:bg-white/[0.06] ${
                  esTuyo ? 'border-prism-400/60 bg-prism-500/10' : 'border-white/5 bg-white/[0.03]'
                }`}
              >
                <Avatar
                  nick={p.profiles?.nick}
                  src={p.profiles?.steam_avatar_url}
                  ringClass="ring-2 ring-white/20"
                  title={detalle}
                />
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {p.es_capitan ? '⭐ ' : ''}
                      {nick}
                      {esTuyo ? ' (tú)' : ''}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {resumenRolesConIconos(roles)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-sm font-extrabold ${
                      mmr != null
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

function TableroPicks({
  sala,
  participantes,
  userId,
  segundosTurno,
  procesando,
  onElegirMoneda,
  onElegirLado,
  onPickear,
}: {
  sala: Sala;
  participantes: Participante[];
  userId: string;
  segundosTurno: number | null;
  procesando: boolean;
  onElegirMoneda: (opcion: 'pickear_primero' | 'lado') => void;
  onElegirLado: (equipo: number) => void;
  onPickear: (userId: string) => void;
}) {
  const estado = sala.picks_estado ?? 'inactivo';
  const nombre = (id?: string | null) =>
    participantes.find((p) => p.user_id === id)?.profiles?.nick ?? '—';
  const ordenar = (a: Participante, b: Participante) =>
    (a.pick_orden ?? 999) - (b.pick_orden ?? 999);

  const pool = participantes.filter((p) => p.equipo === null && !p.es_capitan);
  const radiant = participantes.filter((p) => p.equipo === 1).sort(ordenar);
  const dire = participantes.filter((p) => p.equipo === 2).sort(ordenar);

  const deboDecidir = estado === 'eleccion' && sala.pick_decision_user_id === userId;
  const miTurno = estado === 'en_curso' && sala.pick_turno_user_id === userId;

  function Ficha({ p }: { p: Participante }) {
    const perfil = p.profiles;
    return (
      <div
        className={`rounded-lg border px-2 py-1.5 ${
          p.user_id === userId
            ? 'border-prism-400/60 bg-prism-500/10'
            : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        <p className="truncate text-sm font-medium text-slate-100">
          {p.es_capitan ? '⭐ ' : ''}
          {perfil?.nick ?? 'Usuario'}
        </p>
        <p className="text-xs font-bold text-prism-300">
          {perfil?.mmr != null ? `MMR ${formatearMmr(perfil.mmr)}` : 'Sin MMR'}
        </p>
        <p className="truncate text-[10px] text-slate-500">
          {resumenRolesConIconos(perfil?.roles_preferidos)}
        </p>
      </div>
    );
  }

  return (
    <section className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-white">
          {sala.cupo === 2 ? 'Sorteo de lado' : 'Fase de picks'}
        </h2>
        <span className="rounded-full bg-prism-500/15 px-3 py-1 text-xs font-semibold text-prism-200 ring-1 ring-inset ring-prism-500/30">
          {sala.cupo === 2
            ? estado === 'eleccion'
              ? 'Sorteo'
              : 'Completado'
            : estado === 'eleccion'
              ? 'Moneda'
              : estado === 'en_curso'
                ? `Pick ${Math.min(8, participantes.filter((p) => p.equipo !== null && !p.es_capitan).length + 1)}/8`
                : 'Completado'}
        </span>
      </div>

      {estado === 'eleccion' && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-200">
            {sala.cupo === 2 ? (
              <>
                🪙 El sorteo eligió a <strong>{nombre(sala.pick_ganador_moneda)}</strong>. Elegirá su
                lado (Radiant o Dire); el otro jugador irá al lado contrario.
              </>
            ) : (
              <>
                🪙 La moneda eligió a <strong>{nombre(sala.pick_ganador_moneda)}</strong>. El ganador
                decide si pickea primero o elige lado; el otro completa la decisión.
              </>
            )}
          </p>

          {deboDecidir && sala.pick_decision_tipo === 'moneda' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => onElegirMoneda('pickear_primero')}
                disabled={procesando}
                className="rounded-lg bg-prism-500 px-4 py-2 text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:opacity-50"
              >
                Quiero pickear primero
              </button>
              <button
                onClick={() => onElegirMoneda('lado')}
                disabled={procesando}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Quiero elegir lado
              </button>
            </div>
          )}

          {deboDecidir && sala.pick_decision_tipo === 'lado' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <p className="w-full text-sm text-amber-200">
                {sala.cupo === 2
                  ? 'Elige tu lado (el otro jugador irá al contrario):'
                  : 'Elige tu lado:'}
              </p>
              <button
                onClick={() => onElegirLado(1)}
                disabled={procesando}
                className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-50"
              >
                Radiant
              </button>
              <button
                onClick={() => onElegirLado(2)}
                disabled={procesando}
                className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-50"
              >
                Dire
              </button>
            </div>
          )}

          {!deboDecidir && (
            <p className="mt-3 text-sm text-amber-300">
              Esperando la decisión de <strong>{nombre(sala.pick_decision_user_id)}</strong>…
            </p>
          )}
        </div>
      )}

      {estado === 'en_curso' && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0a0e17] px-4 py-2 text-white">
            <p className="text-sm">
              Turno de <strong>{nombre(sala.pick_turno_user_id)}</strong>
              {miTurno ? ' (tú)' : ''}
            </p>
            <p className="text-sm font-semibold">
              ⏱ {segundosTurno !== null ? `${segundosTurno} s` : '—'}
            </p>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div className="rounded-xl border-2 border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-bold uppercase text-slate-400">
                Disponibles ({pool.length})
              </p>
              <div className="mt-2 space-y-1.5">
                {pool.length === 0 && (
                  <p className="text-sm text-slate-500">No quedan jugadores por elegir.</p>
                )}
                {pool.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <Ficha p={p} />
                    </div>
                    {miTurno && (
                      <button
                        onClick={() => onPickear(p.user_id)}
                        disabled={procesando}
                        className="shrink-0 rounded bg-prism-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-prism-400 disabled:opacity-50"
                      >
                        Pickear
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-xl border p-3 ${TONOS_EQUIPO.radiant.panel}`}>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-xs font-bold uppercase tracking-wide ${TONOS_EQUIPO.radiant.panelTitulo}`}
                >
                  Radiant
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${TONOS_EQUIPO.radiant.panelContador}`}
                >
                  {radiant.length}/5
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {radiant.map((p) => (
                  <Ficha key={p.user_id} p={p} />
                ))}
              </div>
            </div>

            <div className={`rounded-xl border p-3 ${TONOS_EQUIPO.dire.panel}`}>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-xs font-bold uppercase tracking-wide ${TONOS_EQUIPO.dire.panelTitulo}`}
                >
                  Dire
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${TONOS_EQUIPO.dire.panelContador}`}
                >
                  {dire.length}/5
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {dire.map((p) => (
                  <Ficha key={p.user_id} p={p} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {estado === 'terminado' && (
        <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          Picks completados. Los equipos están 5/5; el admin definirá el lobby y pondrá la partida
          en juego.
        </p>
      )}
    </section>
  );
}

function SalaContenido() {
  useArenaBody();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const salaId = params.id as string;

  const [sala, setSala] = useState<Sala | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [miEquipo, setMiEquipo] = useState<number | null>(null);
  const [esParticipante, setEsParticipante] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [cambiandoEquipo, setCambiandoEquipo] = useState(false);
  const [procesandoPicks, setProcesandoPicks] = useState(false);
  const [segundosTurno, setSegundosTurno] = useState<number | null>(null);
  const [rolesSala, setRolesSala] = useState<RolDota[]>([]);
  const [guardandoRoles, setGuardandoRoles] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [segundosSalida, setSegundosSalida] = useState(5);
  const eraParticipante = useRef(false);
  const autoPickEnviado = useRef(false);
  const cierreAutoEnviado = useRef(false);
  const guardadoRolesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rolesSaveSeq = useRef(0);

  const miPerfil = user
    ? (participantes.find((p) => p.user_id === user.id)?.profiles ?? null)
    : null;
  const rolesGuardadosKey = (miPerfil?.roles_preferidos ?? []).join(',');

  const cargarSala = useCallback(async () => {
    if (!salaId || !user) return;

    const { data: salaData } = await supabase
      .from('salas')
      .select('*')
      .eq('id', salaId)
      .single();

    if (salaData) setSala(salaData as unknown as Sala);

    const { data: partData } = await supabase
      .from('participantes_sala')
      .select(
        'user_id, equipo, es_capitan, pick_orden, profiles(nick, steam_avatar_url, steam_nombre, mmr, roles_preferidos)'
      )
      .eq('sala_id', salaId)
      .order('created_at', { ascending: true });

    if (partData) {
      const partsConDota = partData as unknown as Participante[];

      setParticipantes(partsConDota);
      const esPart = partsConDota.some((p) => p.user_id === user.id);

      // Si estaba dentro y deja de estarlo (expulsión), sale de la sala al instante
      if (eraParticipante.current && !esPart) {
        eraParticipante.current = false;
        window.dispatchEvent(new Event('saldo:refresh'));
        router.push('/');
        return;
      }

      eraParticipante.current = esPart;
      setEsParticipante(esPart);
      if (esPart) {
        const yo = partsConDota.find((p) => p.user_id === user.id);
        setMiEquipo(yo?.equipo ?? null);
      } else {
        setMiEquipo(null);
      }
    }

    const { data: lobbyData } = await supabase
      .from('lobbies')
      .select('*')
      .eq('sala_id', salaId)
      .maybeSingle();

    setLobby((lobbyData as unknown as Lobby) ?? null);
    setLoading(false);
  }, [salaId, user, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    if (user && salaId) cargarSala();
    if (user) {
      supabase.rpc('es_admin').then(({ data }: { data: boolean | null }) => {
        setIsAdmin(data === true);
      });
    }
  }, [user, salaId, cargarSala]);

  // Cambios en vivo: equipos, estado de la sala y lobby
  useEffect(() => {
    if (!salaId || !user) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const refrescar = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cargarSala(), 250);
    };

    const channel = supabase
      .channel(`sala-jugador-${salaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participantes_sala',
          filter: `sala_id=eq.${salaId}`,
        },
        refrescar
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participantes_sala',
          filter: `sala_id=eq.${salaId}`,
        },
        refrescar
      )
      .on(
        // Sin filtro: los DELETE no siempre incluyen sala_id; solo recarga esta sala
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'participantes_sala' },
        refrescar
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'salas', filter: `id=eq.${salaId}` },
        refrescar
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobbies', filter: `sala_id=eq.${salaId}` },
        refrescar
      )
      .on(
        // Roles/MMR de los jugadores: las tarjetas se actualizan en vivo.
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        refrescar
      )
      .subscribe();

    // Respaldo por si Realtime no está habilitado en Supabase
    const interval = setInterval(() => cargarSala(), 5000);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [salaId, user, cargarSala]);

  // Cuenta regresiva del turno de picks y auto-pick a los 60 s
  useEffect(() => {
    const estado = sala?.picks_estado ?? 'inactivo';
    const expira = sala?.pick_turno_expira_at;

    if (!salaId || estado !== 'en_curso' || !expira) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpieza del contador
      setSegundosTurno(null);
      return;
    }

    autoPickEnviado.current = false;
    const expiraMs = new Date(expira).getTime();

    const actualizar = () => {
      const restante = Math.max(0, Math.ceil((expiraMs - Date.now()) / 1000));
      setSegundosTurno(restante);

      if (restante === 0 && !autoPickEnviado.current) {
        autoPickEnviado.current = true;
        supabase
          .rpc('auto_pickear_si_vencido', { p_sala: salaId, p_forzar: false })
          .then(({ error: rpcError }) => {
            if (rpcError) autoPickEnviado.current = false;
            else cargarSala();
          });
      }
    };

    actualizar();
    const interval = setInterval(actualizar, 1000);
    return () => clearInterval(interval);
  }, [
    salaId,
    sala?.picks_estado,
    sala?.pick_turno_user_id,
    sala?.pick_turno_expira_at,
    cargarSala,
  ]);

  // Cierre automático: cualquier jugador con la sala abierta puede disparar la detección.
  useEffect(() => {
    if (!salaId || sala?.estado !== 'en_juego') return;

    cierreAutoEnviado.current = false;

    const revisar = async () => {
      if (cierreAutoEnviado.current) return;

      const resultado = await intentarCierreAutomatico(salaId);
      if (!resultado || cierreAutoEnviado.current) return;

      if (resultado.cerrada) {
        cierreAutoEnviado.current = true;
        setSuccess('Partida finalizada automáticamente. Revisa el resultado en tu historial.');
        void cargarSala();
      }
    };

    const inicial = setTimeout(() => {
      void revisar();
    }, 12000);
    const intervalo = setInterval(() => {
      void revisar();
    }, 90000);

    return () => {
      clearTimeout(inicial);
      clearInterval(intervalo);
    };
  }, [salaId, sala?.estado, cargarSala]);

  // Al terminar o cancelarse la sala, nadie puede quedarse dentro: se oculta
  // de los listados y volvemos al inicio automáticamente.
  const estadoSalaActual = sala?.estado;

  useEffect(() => {
    if (estadoSalaActual !== 'terminada' && estadoSalaActual !== 'cancelada') {
      return;
    }

    window.dispatchEvent(new Event('saldo:refresh'));

    const intervalo = setInterval(() => {
      setSegundosSalida((restante) => Math.max(0, restante - 1));
    }, 1000);
    const salida = setTimeout(() => {
      router.replace('/');
    }, 5000);

    return () => {
      clearInterval(intervalo);
      clearTimeout(salida);
    };
  }, [estadoSalaActual, router]);

  // Mantiene la selección local sincronizada con los roles guardados.
  useEffect(() => {
    const roles = rolesGuardadosKey ? (rolesGuardadosKey.split(',') as RolDota[]) : [];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza roles guardados
    setRolesSala(roles);
  }, [rolesGuardadosKey]);

  // Limpia el guardado pendiente si se sale de la sala.
  useEffect(() => {
    return () => {
      if (guardadoRolesTimeout.current) clearTimeout(guardadoRolesTimeout.current);
    };
  }, []);

  async function unirseASala() {
    setError(null);
    setSuccess(null);
    setJoining(true);

    const { error: rpcError } = await supabase.rpc('unirse_a_sala', {
      p_sala: salaId,
    });

    if (rpcError) {
      const errores: Record<string, string> = {
        'No autenticado': 'Debes iniciar sesión',
        'Cuenta no disponible': 'Tu cuenta está baneada',
        'La sala no existe': 'La sala no existe',
        'La sala no está abierta': 'La sala ya no está abierta',
        'Ya estás en esta sala': 'Ya estás en esta sala',
        'La sala está llena': 'La sala está llena',
        'Saldo insuficiente': 'No tienes saldo suficiente',
        'Debes vincular tu cuenta de Steam primero': 'Vincula tu cuenta de Steam en tu perfil para poder jugar',
        'Completa tu MMR': 'Completa tu MMR en Mi perfil antes de unirte a una sala',
      };
      const traducido = Object.entries(errores).find(([clave]) =>
        rpcError.message.includes(clave)
      )?.[1];
      setError(traducido ?? rpcError.message);
    } else {
      setSuccess('Te uniste a la sala. Estás en la lista de espera.');
      window.dispatchEvent(new Event('saldo:refresh'));
      cargarSala();
    }
    setJoining(false);
  }

  async function salirDeSala() {
    setError(null);
    setSuccess(null);
    eraParticipante.current = false;

    const { error: rpcError } = await supabase.rpc('salir_de_sala', {
      p_sala: salaId,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      window.dispatchEvent(new Event('saldo:refresh'));
      router.push('/');
    }
  }

  async function cambiarEquipo(equipo: number | null) {
    setError(null);
    setSuccess(null);
    setCambiandoEquipo(true);

    const { error: rpcError } = await supabase.rpc('unirse_a_equipo', {
      p_sala: salaId,
      p_equipo: equipo,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess(
        equipo === null
          ? 'Estás en la lista de espera'
          : equipo === 1
            ? 'Estás en Radiant'
            : 'Estás en Dire'
      );
      cargarSala();
    }
    setCambiandoEquipo(false);
  }

  function alternarRolSala(rol: RolDota) {
    const next = rolesSala.includes(rol)
      ? rolesSala.filter((r) => r !== rol)
      : rolesSala.length >= 3
        ? rolesSala
        : [...rolesSala, rol];

    if (next === rolesSala) return;

    const version = ++rolesSaveSeq.current;
    setRolesSala(next);
    setGuardandoRoles(true);

    if (guardadoRolesTimeout.current) clearTimeout(guardadoRolesTimeout.current);
    guardadoRolesTimeout.current = setTimeout(() => {
      guardarRolesSala(next, version);
    }, 300);
  }

  async function guardarRolesSala(next: RolDota[], version: number) {
    if (!user || version !== rolesSaveSeq.current) return;

    setGuardandoRoles(true);
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc('guardar_roles_preferidos', {
      p_roles: next,
    });

    if (version !== rolesSaveSeq.current) return;

    if (rpcError) {
      setError('No se pudieron guardar tus roles: ' + rpcError.message);
      setRolesSala(rolesGuardadosKey ? (rolesGuardadosKey.split(',') as RolDota[]) : []);
      cargarSala();
    } else {
      setParticipantes((prev) =>
        prev.map((p) =>
          p.user_id === user.id
            ? {
                ...p,
                profiles: p.profiles
                  ? { ...p.profiles, roles_preferidos: next }
                  : p.profiles,
              }
            : p
        )
      );
    }

    setGuardandoRoles(false);
  }

  async function elegirMoneda(opcion: 'pickear_primero' | 'lado') {
    setError(null);
    setSuccess(null);
    setProcesandoPicks(true);

    const { error: rpcError } = await supabase.rpc('elegir_moneda', {
      p_sala: salaId,
      p_opcion: opcion,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      cargarSala();
    }
    setProcesandoPicks(false);
  }

  async function elegirLado(equipo: number) {
    setError(null);
    setSuccess(null);
    setProcesandoPicks(true);

    const { error: rpcError } = await supabase.rpc('elegir_lado', {
      p_sala: salaId,
      p_equipo: equipo,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      cargarSala();
    }
    setProcesandoPicks(false);
  }

  async function pickearJugador(userIdObjetivo: string) {
    setError(null);
    setSuccess(null);
    setProcesandoPicks(true);

    const { error: rpcError } = await supabase.rpc('pickear_jugador', {
      p_sala: salaId,
      p_user: userIdObjetivo,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      cargarSala();
    }
    setProcesandoPicks(false);
  }

  async function copiar(texto: string, campo: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(campo);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setError('No se pudo copiar. Cópialo manualmente.');
    }
  }

  async function compartirSala() {
    if (!sala) return;

    const url = `${window.location.origin}/salas/${sala.id}`;
    const texto = `Sala "${sala.nombre}" en Apuestas Dota`;

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: sala.nombre, text: texto, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiado('sala');
        setTimeout(() => setCopiado(null), 2000);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('No se pudo compartir el enlace');
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <p>Cargando sala...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!sala) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <div className="text-center">
          <p className="text-rose-300">La sala no existe</p>
          <Link href="/salas" className="mt-4 inline-block text-prism-300 hover:underline">
            Volver a salas
          </Link>
        </div>
      </div>
    );
  }

  if (sala.estado === 'terminada' || sala.estado === 'cancelada') {
    const terminada = sala.estado === 'terminada';

    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] px-4 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 text-center shadow-arena-soft">
          <div
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
              terminada
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            {terminada ? '✓' : '!'}
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-white">
            {terminada ? 'Partida finalizada' : 'Sala cancelada'}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {terminada
              ? 'Los premios ya fueron repartidos. Esta sala se cerró y ya no aparece en la lista.'
              : 'La sala fue cancelada y se reembolsó a los participantes.'}
          </p>
          <p className="mt-4 text-sm text-slate-400">
            Volviendo al inicio en {segundosSalida} s…
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => router.replace('/')}
              className="rounded-lg bg-prism-500 px-4 py-2 text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400"
            >
              Ir al inicio ahora
            </button>
            {terminada && (
              <Link
                href="/salas/historial"
                className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Ver historial
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const userId = user.id;
  const limiteEquipo = Math.max(1, Math.floor(sala.cupo / 2));
  const espera = participantes.filter((p) => p.equipo === null);
  const radiant = participantes.filter((p) => p.equipo === 1);
  const dire = participantes.filter((p) => p.equipo === 2);

  const pozo = sala.cuota * sala.cupo;
  const comision = Math.floor((pozo * sala.comision_bp) / 10000);
  const premio = Math.floor((pozo - comision) / limiteEquipo);

  const picksEstado = sala.picks_estado ?? 'inactivo';
  const enFasePicks = picksEstado === 'eleccion' || picksEstado === 'en_curso';
  const puedeMoverse =
    esParticipante &&
    picksEstado === 'inactivo' &&
    (sala.estado === 'abierta' || sala.estado === 'llena');
  const puedeUnirse = !esParticipante && sala.estado === 'abierta' && participantes.length < sala.cupo;
  const puedeEditarRoles =
    esParticipante &&
    picksEstado === 'inactivo' &&
    (sala.estado === 'abierta' || sala.estado === 'llena');

  const estadoTexto: Record<string, string> = {
    abierta: 'Abierta',
    llena: 'Llena',
    en_juego: 'En juego',
    terminada: 'Terminada',
    cancelada: 'Cancelada',
  };

  const columnaProps = {
    esParticipante,
    miEquipo,
    userId,
    puedeMoverse,
    cambiandoEquipo,
    onCambiarEquipo: cambiarEquipo,
  };

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo={sala.nombre} />

      <main className="mx-auto max-w-[1800px] px-4 py-4">
        {(error || success) && (
          <div className="mb-3 space-y-2">
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {success}
              </div>
            )}
          </div>
        )}

        <div
          className={`grid gap-4 ${
            esParticipante ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : ''
          }`}
        >
          <div className="space-y-3">
        {/* Cabecera de la sala */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-arena-soft">
          <div className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
                <span>Sala {sala.modalidad ?? (sala.cupo === 2 ? '1v1' : '5v5')}</span>
                <span>•</span>
                <span>{estadoTexto[sala.estado] ?? sala.estado}</span>
              </div>
              <h1 className="mt-0.5 text-lg font-bold text-white">{sala.nombre}</h1>
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-white">
                  Cuota S/ {(sala.cuota / 100).toFixed(2)}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-white">
                  {participantes.length}/{sala.cupo} jugadores
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-white">
                  Comisión {sala.comision_bp / 100}%
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:min-w-[190px]">
              <div className="rounded-xl bg-white/10 px-3 py-1.5 text-right">
                <p className="text-xs uppercase tracking-wide text-slate-300">Pozo total</p>
                <p className="text-lg font-bold text-white">S/ {(pozo / 100).toFixed(2)}</p>
                <p className="text-[11px] text-slate-300">
                  S/ {(premio / 100).toFixed(2)} por ganador
                </p>
              </div>
              <button
                onClick={compartirSala}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                {copiado === 'sala' ? 'Enlace copiado' : 'Compartir sala'}
              </button>
            </div>
          </div>
        </section>

        {/* Acciones de entrada */}
        {puedeUnirse && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-emerald-200">
                Hay espacio. Al unirte entras a la <strong>lista de espera</strong> y luego eliges
                equipo.
              </p>
              <button
                onClick={unirseASala}
                disabled={joining}
                className="rounded-lg bg-emerald-500 px-5 py-2 font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {joining ? 'Uniéndome...' : 'Unirme a la sala'}
              </button>
            </div>
          </div>
        )}

        {!esParticipante && sala.estado === 'llena' && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            La sala está llena. Espera a que el admin inicie la partida.
          </div>
        )}

        {/* Mis roles (solo informativo, se guarda automáticamente) */}
        {esParticipante && (
          <section className="arena-card flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/10 bg-[#111827] px-3 py-2 shadow-arena-soft">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Mis roles</span>
              <span className="text-[11px] text-slate-500">hasta 3, en orden</span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                {rolesSala.length}/3
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ROLES_DOTA.map((rol) => {
                const activo = rolesSala.includes(rol.id);
                const orden = rolesSala.indexOf(rol.id) + 1;
                return (
                  <button
                    key={rol.id}
                    type="button"
                    onClick={() => alternarRolSala(rol.id)}
                    disabled={!puedeEditarRoles}
                    aria-pressed={activo}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      activo
                        ? 'border-prism-400 bg-prism-500/15 text-prism-200'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span aria-hidden="true">{ICONOS_ROL[rol.id]}</span>
                    <span>{rol.nombre}</span>
                    {activo && (
                      <span className="rounded-full bg-prism-500 px-1.5 text-[9px] font-bold text-white">
                        {orden}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <span className="ml-auto text-[11px] text-slate-500">
              {!puedeEditarRoles
                ? 'Bloqueado durante picks/partida'
                : guardandoRoles
                  ? 'Guardando…'
                  : 'Se guarda automáticamente'}
            </span>
          </section>
        )}

        {/* Fase de picks o columnas */}
        {enFasePicks ? (
          <TableroPicks
            sala={sala}
            participantes={participantes}
            userId={userId}
            segundosTurno={segundosTurno}
            procesando={procesandoPicks}
            onElegirMoneda={elegirMoneda}
            onElegirLado={elegirLado}
            onPickear={pickearJugador}
          />
        ) : (
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white">Jugadores en la sala</h2>
              {puedeMoverse && (
                <p className="text-xs text-slate-500">
                  Elige una columna para moverte. Cada equipo admite {limiteEquipo}.
                </p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Columna
                {...columnaProps}
                equipo={1}
                titulo="Radiant"
                descripcion="Equipo verde"
                jugadores={radiant}
                capacidad={limiteEquipo}
                tono="radiant"
                icono={<IconoRadiant />}
              />
              <Columna
                {...columnaProps}
                equipo={2}
                titulo="Dire"
                descripcion="Equipo rojo"
                jugadores={dire}
                capacidad={limiteEquipo}
                tono="dire"
                icono={<IconoDire />}
              />
              <div className="md:col-span-2 xl:col-span-1">
                <Columna
                  {...columnaProps}
                  equipo={null}
                  titulo="Lista de espera"
                  descripcion="Jugadores sin equipo asignado"
                  jugadores={espera}
                  capacidad={sala.cupo}
                  horizontal
                  compacta
                  columnas="grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-2"
                  tono="neutral"
                  icono={<IconoEspera />}
                />
              </div>
            </div>
          </section>
        )}

        {/* Lobby */}
        {lobby &&
          (esParticipante || isAdmin) &&
          (sala.estado === 'en_juego' || sala.estado === 'terminada') && (
          <section className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-r from-prism-700 to-prism-600 p-4 text-white shadow-arena-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-prism-200">
                  {sala.estado === 'terminada' ? 'Partida finalizada' : 'Partida en curso'}
                </p>
                <h2 className="font-display text-xl font-bold">Lobby de Dota 2</h2>
              </div>
              <a
                href="steam://run/570"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
              >
                Abrir Dota 2
              </a>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-white/10 p-4">
                <p className="text-xs text-prism-200">Nombre del lobby</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="break-all text-lg font-bold">{lobby.nombre}</p>
                  <button
                    onClick={() => copiar(lobby.nombre, 'nombre')}
                    className="shrink-0 rounded bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
                  >
                    {copiado === 'nombre' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-white/10 p-4">
                <p className="text-xs text-prism-200">Clave del lobby</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="break-all text-lg font-bold">{lobby.clave}</p>
                  <button
                    onClick={() => copiar(lobby.clave, 'clave')}
                    className="shrink-0 rounded bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
                  >
                    {copiado === 'clave' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-prism-100">
              Entra a Dota 2, busca el lobby con estos datos y únete. El admin enviará la invitación
              dentro del juego.
            </p>
          </section>
        )}

        {esParticipante && sala.estado === 'en_juego' && !lobby && (
          <div className="mt-4 rounded-xl border border-prism-500/30 bg-prism-500/10 p-4 text-sm text-prism-200">
            La partida está en juego. El admin publicará los datos del lobby en un momento.
          </div>
        )}

        {esParticipante && picksEstado === 'inactivo' && (sala.estado === 'abierta' || sala.estado === 'llena') && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={salirDeSala}
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-6 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15"
            >
              Salir de la sala y recuperar S/ {(sala.cuota / 100).toFixed(2)}
            </button>
          </div>
        )}
          </div>

          {esParticipante && (
            <aside className="h-fit lg:sticky lg:top-20">
              <ChatPanel
                salaId={sala.id}
                titulo="Chat de la sala"
                descripcion="Solo jugadores dentro de esta sala"
                altura="h-[420px] lg:h-[calc(100vh-18rem)] min-h-[320px]"
              />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SalaDetallePage() {
  return (
    <Suspense
      fallback={
        <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
          <p>Cargando sala...</p>
        </div>
      }
    >
      <SalaContenido />
    </Suspense>
  );
}
