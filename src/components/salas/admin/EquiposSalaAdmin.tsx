'use client';

import Avatar from '@/components/Avatar';
import HeroEnSlot from '@/components/HeroEnSlot';
import MedallaMmr from '@/components/MedallaMmr';
import type { JugadorMoneda } from '@/components/MonedaSorteo';
import MonedaSorteo from '@/components/MonedaSorteo';
import PreferenciaLado from '@/components/PreferenciaLado';
import ResumenJugador from '@/components/ResumenJugador';
import { formatearMmr, promedioMmr, resumenRolesConIconos } from '@/lib/balance';
import type { Participante, Sala } from '@/lib/types';
import type { JugadorVivo } from '@/lib/vivo';
import Link from 'next/link';
import type { Confirmacion } from './tipos';

function FilaJugador({
  p,
  actual,
  estadoSala,
  mostrarMover,
  mostrarPreferencia,
  vivoPorNick,
  onMover,
  onExpulsar,
}: {
  p: Participante;
  actual: number | null | undefined;
  estadoSala: string;
  mostrarMover: boolean;
  mostrarPreferencia: boolean;
  vivoPorNick?: Map<string, JugadorVivo>;
  onMover: (userId: string, equipo: number | null) => void;
  onExpulsar: (p: Participante) => void;
}) {
  return (
    <div className="min-w-0 rounded-md border border-white/10 px-2 py-1">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/jugadores/${p.user_id}`}
          title={`Ver perfil de ${p.profiles?.nick ?? 'Usuario'}`}
          className="flex min-w-0 items-center gap-2 transition hover:bg-white/5"
        >
          {/* Avatar y, justo debajo, el héroe que está jugando. */}
          <span className="flex shrink-0 flex-col items-center gap-0.5">
            <Avatar nick={p.profiles?.nick} src={p.profiles?.steam_avatar_url} size="sm" />
            <HeroEnSlot
              jugador={vivoPorNick?.get(p.profiles?.nick ?? '') ?? null}
              className="mt-0.5"
            />
          </span>
          <div className="relative min-w-0 pr-4">
            {p.verificado_at && (
              <span
                title="Listo para la partida"
                aria-label="Listo para la partida"
                className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-[5px] bg-emerald-500/20 text-[10px] font-bold leading-none text-emerald-300 ring-1 ring-inset ring-emerald-400/40"
              >
                ✓
              </span>
            )}
            <span className="block truncate text-xs font-medium text-slate-100">
              {p.es_capitan ? '⭐ ' : ''}
              {p.profiles?.nick ?? 'Usuario'}
            </span>
            <span className="block truncate text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1 font-bold text-prism-300/90">
                <MedallaMmr
                  mmr={p.profiles?.mmr}
                  size="xs"
                  inline
                  className="shrink-0"
                />
                {p.profiles?.mmr != null ? `MMR ${formatearMmr(p.profiles.mmr)}` : 'Sin MMR'}
              </span>
              <span className="text-slate-500">
                {' · '}
                {resumenRolesConIconos(p.profiles?.roles_preferidos)}
              </span>
            </span>
            {mostrarPreferencia && (
              <PreferenciaLado equipo={p.preferencia_equipo} className="mt-1" />
            )}
          </div>
        </Link>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {mostrarMover && estadoSala !== 'en_juego' && actual !== null && (
            <button
              onClick={() => onMover(p.user_id, null)}
              className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/5"
              title="Mover a lista de espera"
            >
              Espera
            </button>
          )}
          {mostrarMover && estadoSala !== 'en_juego' && actual !== 1 && (
            <button
              onClick={() => onMover(p.user_id, 1)}
              className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-200 ring-1 ring-inset ring-emerald-400/20 transition hover:bg-emerald-500/20"
            >
              Radiant
            </button>
          )}
          {mostrarMover && estadoSala !== 'en_juego' && actual !== 2 && (
            <button
              onClick={() => onMover(p.user_id, 2)}
              className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-medium text-rose-200 ring-1 ring-inset ring-rose-400/20 transition hover:bg-rose-500/20"
            >
              Dire
            </button>
          )}
          {estadoSala !== 'en_juego' && (
            <button
              onClick={() => onExpulsar(p)}
              className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-medium text-rose-300 ring-1 ring-inset ring-rose-500/25 transition hover:bg-rose-500/20"
              title="Sacar de la sala y devolver la cuota"
            >
              Sacar
            </button>
          )}
        </div>
      </div>

      {/* El resumen de Dota 2 va fuera del enlace del perfil para no anidar
          dos <a> (el de Dotabuff dentro del del perfil). */}
      {actual === null && (
        <ResumenJugador userId={p.user_id} compacto className="mt-2" />
      )}
    </div>
  );
}

function Slots({
  jugadores,
  capacidad,
  equipos,
  estadoSala,
  mostrarMover,
  mostrarPreferencia,
  vivoPorNick,
  onMover,
  onExpulsar,
}: {
  jugadores: Participante[];
  capacidad: number;
  equipos: Record<string, number | null>;
  estadoSala: string;
  mostrarMover: boolean;
  mostrarPreferencia: boolean;
  vivoPorNick?: Map<string, JugadorVivo>;
  onMover: (userId: string, equipo: number | null) => void;
  onExpulsar: (p: Participante) => void;
}) {
  return (
    <>
      {Array.from({ length: capacidad }).map((_, i) => {
        const p = jugadores[i];

        return p ? (
          <FilaJugador
            key={p.user_id}
            p={p}
            actual={equipos[p.user_id]}
            estadoSala={estadoSala}
            mostrarMover={mostrarMover}
            mostrarPreferencia={mostrarPreferencia}
            vivoPorNick={vivoPorNick}
            onMover={onMover}
            onExpulsar={onExpulsar}
          />
        ) : (
          <div
            key={`libre-${i}`}
            className="flex h-[36px] items-center justify-center rounded-md border border-dashed border-white/10 text-[11px] text-slate-500"
          >
            Libre
          </div>
        );
      })}
    </>
  );
}

type PropsEquiposSalaAdmin = {
  sala: Sala;
  enFasePicks: boolean;
  nombreJugador: (id?: string | null) => string;
  estadoSala: string;
  picksEstado: NonNullable<Sala['picks_estado']>;
  forzarAutoPick: () => Promise<void>;
  procesandoPicks: boolean;
  setConfirmacion: (valor: Confirmacion | null) => void;
  tocaElegirCapitanes: boolean;
  participantes: Participante[];
  capitan1: string;
  setCapitan1: (valor: string) => void;
  capitan2: string;
  setCapitan2: (valor: string) => void;
  iniciarPicks: () => Promise<void>;
  capitanMoneda: JugadorMoneda | null;
  rivalCapitan: JugadorMoneda | null;
  mmrRadiant: ReturnType<typeof promedioMmr>;
  enRadiant: Participante[];
  slotsProps: Omit<Parameters<typeof Slots>[0], 'jugadores' | 'capacidad'>;
  mmrDire: ReturnType<typeof promedioMmr>;
  enDire: Participante[];
  sinEquipo: Participante[];
  balanceados: boolean;
};

export function EquiposSalaAdmin({
  sala,
  enFasePicks,
  nombreJugador,
  estadoSala,
  picksEstado,
  forzarAutoPick,
  procesandoPicks,
  setConfirmacion,
  tocaElegirCapitanes,
  participantes,
  capitan1,
  setCapitan1,
  capitan2,
  setCapitan2,
  iniciarPicks,
  capitanMoneda,
  rivalCapitan,
  mmrRadiant,
  enRadiant,
  slotsProps,
  mmrDire,
  enDire,
  sinEquipo,
  balanceados,
}: PropsEquiposSalaAdmin) {
  return (
    <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold text-white">Equipos</h2>
        <span className="text-xs text-slate-400">
          Mueve jugadores entre equipos y espera
        </span>
      </div>

      {sala.cupo === 2 && enFasePicks && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
          Sorteo 1v1: <strong>{nombreJugador(sala.pick_decision_user_id)}</strong> elige su
          lado (Radiant o Dire). El otro jugador irá al lado contrario.
        </div>
      )}

      {sala.cupo === 10 && estadoSala !== 'en_juego' && (
        <div className="mt-3 rounded-xl border border-prism-500/25 bg-prism-500/[0.06] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-prism-200">Fase de picks</h3>
            {picksEstado !== 'inactivo' && (
              <div className="flex flex-wrap gap-1.5">
                {picksEstado === 'en_curso' && (
                  <button
                    onClick={forzarAutoPick}
                    disabled={procesandoPicks}
                    className="rounded-md bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-inset ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-50"
                  >
                    Auto-pick ahora
                  </button>
                )}
                <button
                  onClick={() => setConfirmacion({ tipo: 'cancelar_picks' })}
                  disabled={procesandoPicks}
                  className="rounded-md bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200 ring-1 ring-inset ring-rose-500/25 transition hover:bg-rose-500/25 disabled:opacity-50"
                >
                  {picksEstado === 'terminado' ? 'Reiniciar picks' : 'Cancelar picks'}
                </button>
              </div>
            )}
          </div>

          {picksEstado === 'inactivo' && (
            <>
              {tocaElegirCapitanes && (
                <div className="mt-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">
                  ✅ Los {participantes.length} jugadores confirmaron que están listos.
                  Elige a los dos capitanes y guarda para lanzar la moneda.
                </div>
              )}
              <p className="mt-1 text-xs text-prism-300">
                Elige a los dos capitanes. Al guardarlos se lanza la moneda con sus avatares.
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-prism-200">Capitán 1</span>
                  <select
                    value={capitan1}
                    onChange={(e) => setCapitan1(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-100"
                  >
                    <option value="">Elegir jugador…</option>
                    {participantes.map((p) => (
                      <option key={p.user_id} value={p.user_id}>
                        {p.profiles?.nick ?? 'Usuario'} · {formatearMmr(p.profiles?.mmr)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-prism-200">Capitán 2</span>
                  <select
                    value={capitan2}
                    onChange={(e) => setCapitan2(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-100"
                  >
                    <option value="">Elegir jugador…</option>
                    {participantes.map((p) => (
                      <option key={p.user_id} value={p.user_id}>
                        {p.profiles?.nick ?? 'Usuario'} · {formatearMmr(p.profiles?.mmr)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                onClick={iniciarPicks}
                disabled={procesandoPicks || participantes.length !== 10}
                className={`mt-2 w-full rounded-lg py-1.5 text-sm font-semibold shadow-arena-glow transition disabled:opacity-50 ${tocaElegirCapitanes
                  ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                  : 'bg-prism-500 text-white hover:bg-prism-400'
                  }`}
              >
                {procesandoPicks ? 'Lanzando moneda…' : 'Guardar capitanes y lanzar moneda'}
              </button>
              {participantes.length !== 10 && (
                <p className="mt-1.5 text-xs text-prism-300">
                  La sala debe tener 10 jugadores para iniciar.
                </p>
              )}
            </>
          )}

          {picksEstado === 'eleccion' && (
            <div className="mt-2">
              <MonedaSorteo ganador={capitanMoneda} rival={rivalCapitan} />
              <p className="mt-2 text-sm text-prism-200">
                🪙 La moneda eligió a{' '}
                <strong>{nombreJugador(sala.pick_ganador_moneda)}</strong>.
              </p>
              <p className="mt-1 text-xs text-prism-300">
                Ahora <strong>{nombreJugador(sala.pick_decision_user_id)}</strong> elige desde su
                sala: <strong>Radiant</strong> (pickea primero) o <strong>LastPick</strong>{' '}
                (Dire y pickea segundo).
              </p>
            </div>
          )}

          {picksEstado === 'en_curso' && (
            <p className="mt-2 text-sm text-prism-200">
              Turno de <strong>{nombreJugador(sala.pick_turno_user_id)}</strong>. Si no
              pickea en 45 segundos, el sistema elegirá automáticamente al jugador de mayor
              MMR disponible.
            </p>
          )}

          {picksEstado === 'terminado' && (
            <p className="mt-2 text-sm text-emerald-300">
              Picks completados. Los equipos quedaron 5/5; ya puedes definir el lobby y poner
              la partida en juego.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.04] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-200">
                Radiant
              </p>
              <p className="truncate text-[11px] font-medium text-emerald-200/60">
                MMR prom: {formatearMmr(mmrRadiant)}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-emerald-100 ring-1 ring-inset ring-emerald-400/20">
              {enRadiant.length}/{Math.floor(sala.cupo / 2)}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <Slots
              {...slotsProps}
              jugadores={enRadiant}
              capacidad={Math.floor(sala.cupo / 2)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-rose-400/15 bg-rose-500/[0.04] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-200">Dire</p>
              <p className="truncate text-[11px] font-medium text-rose-200/60">
                MMR prom: {formatearMmr(mmrDire)}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-rose-100 ring-1 ring-inset ring-rose-400/20">
              {enDire.length}/{Math.floor(sala.cupo / 2)}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <Slots
              {...slotsProps}
              jugadores={enDire}
              capacidad={Math.floor(sala.cupo / 2)}
            />
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Lista de espera
          </p>
          <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-300 ring-1 ring-inset ring-white/10">
            {sinEquipo.length}/{sala.cupo}
          </span>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <Slots {...slotsProps} jugadores={sinEquipo} capacidad={sala.cupo} />
        </div>
      </div>

      {!balanceados && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-300">
          Los equipos no están balanceados: Radiant {enRadiant.length} vs Dire {enDire.length}
        </div>
      )}
    </div>
  );
}
