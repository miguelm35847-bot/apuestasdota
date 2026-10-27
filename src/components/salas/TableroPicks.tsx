'use client';

import { TONOS_EQUIPO } from './tonosEquipo';
import MedallaMmr from '@/components/MedallaMmr';
import MonedaSorteo from '@/components/MonedaSorteo';
import PreferenciaLado from '@/components/PreferenciaLado';
import ResumenJugador from '@/components/ResumenJugador';
import {
  formatearMmr,
  resumenRolesConIconos
} from '@/lib/balance';
import type { Participante, Sala } from '@/lib/types';

function FichaPicks({ p, conResumen = false, userId }: { p: Participante; conResumen?: boolean; userId: string }) {
  const perfil = p.profiles;
  return (
    <div
      className={`rounded-lg border px-2 py-1.5 ${p.user_id === userId
        ? 'border-prism-400/60 bg-prism-500/10'
        : 'border-white/10 bg-white/[0.03]'
        }`}
    >
      <p className="truncate text-sm font-medium text-slate-100">
        {p.es_capitan ? '⭐ ' : ''}
        {perfil?.nick ?? 'Usuario'}
      </p>
      <p className="flex items-center gap-1.5 text-xs font-bold text-prism-300">
        <MedallaMmr
          mmr={perfil?.mmr}
          size="xs"
          inline
          className="shrink-0"
        />
        {perfil?.mmr != null ? `MMR ${formatearMmr(perfil.mmr)}` : 'Sin MMR'}
      </p>
      <p className="truncate text-[10px] text-slate-500">
        {resumenRolesConIconos(perfil?.roles_preferidos)}
      </p>
      <PreferenciaLado equipo={p.preferencia_equipo} className="mt-1" />
      {conResumen && <ResumenJugador key={p.user_id} userId={p.user_id} className="mt-1" />}
    </div>
  );
}

export function TableroPicks({
  sala,
  participantes,
  userId,
  segundosTurno,
  procesando,
  miPreferencia,
  onPreferencia,
  onElegirRadiantOLastPick,
  onElegirLado,
  onPickear,
}: {
  sala: Sala;
  participantes: Participante[];
  userId: string;
  segundosTurno: number | null;
  procesando: boolean;
  miPreferencia: number | null;
  onPreferencia: (equipo: number | null) => void;
  onElegirRadiantOLastPick: (opcion: 'radiant' | 'lastpick') => void;
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

  // 1v1: la moneda espera a que ambos confirmen que están listos.
  const verificacionPendiente = sala.verificacion_estado === 'pendiente';
  const listos = participantes.filter((p) => p.verificado_at).length;
  const aMoneda = (p: Participante | null) =>
    p
      ? {
        id: p.user_id,
        nick: p.profiles?.nick ?? null,
        steam_avatar_url: p.profiles?.steam_avatar_url ?? null,
      }
      : null;
  const jugadorMoneda = aMoneda(
    participantes.find((p) => p.user_id === sala.pick_decision_user_id) ?? null
  );
  const rivalMoneda = aMoneda(
    participantes.find((p) => p.user_id !== sala.pick_decision_user_id) ?? null
  );

  // 5v5: la moneda se lanza entre los dos capitanes elegidos por el admin.
  const capitanMoneda = aMoneda(
    participantes.find((p) => p.user_id === sala.pick_ganador_moneda) ?? null
  );
  const rivalCapitan = aMoneda(
    participantes.find(
      (p) =>
        p.user_id !== sala.pick_ganador_moneda &&
        (p.user_id === sala.pick_capitan1 || p.user_id === sala.pick_capitan2)
    ) ?? null
  );

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

      {/* Preferencia de lado: solo informativa y solo durante la fase de picks */}
      {participantes.some((p) => p.user_id === userId) && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-semibold text-slate-300">
            ¿A qué lado prefieres ir?{' '}
            <span className="font-normal text-slate-500">(solo informativo, no cambia el reparto)</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPreferencia(1)}
              disabled={procesando}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition disabled:opacity-50 ${miPreferencia === 1
                ? 'bg-emerald-500/25 text-emerald-100 ring-emerald-400/40'
                : 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/25 hover:bg-emerald-500/20'
                }`}
            >
              ☀ Radiant
            </button>
            <button
              type="button"
              onClick={() => onPreferencia(2)}
              disabled={procesando}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition disabled:opacity-50 ${miPreferencia === 2
                ? 'bg-rose-500/25 text-rose-100 ring-rose-400/40'
                : 'bg-rose-500/10 text-rose-200 ring-rose-400/25 hover:bg-rose-500/20'
                }`}
            >
              ☾ Dire
            </button>
            {miPreferencia !== null && (
              <button
                type="button"
                onClick={() => onPreferencia(null)}
                disabled={procesando}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      )}

      {estado === 'eleccion' && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          {sala.cupo === 2 ? (
            <>
              {verificacionPendiente ? (
                <p className="text-sm text-amber-200">
                  🪙 Esperando a que ambos confirmen que están listos (
                  {listos}/{participantes.length}). Cuando confirmen, la moneda decide el lado.
                </p>
              ) : (
                <>
                  <MonedaSorteo ganador={jugadorMoneda} rival={rivalMoneda} />

                  <p className="mt-2 text-center text-sm text-amber-200">
                    {nombre(sala.pick_decision_user_id)} elige su lado (Radiant o Dire); el otro
                    jugador irá al lado contrario.
                  </p>

                  {deboDecidir && sala.pick_decision_tipo === 'lado' && (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
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
                    <p className="mt-3 text-center text-sm text-amber-300">
                      Esperando a que <strong>{nombre(sala.pick_decision_user_id)}</strong> elija su
                      lado…
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <MonedaSorteo ganador={capitanMoneda} rival={rivalCapitan} />

              <p className="mt-2 text-center text-sm text-amber-200">
                🪙 La moneda eligió a <strong>{nombre(sala.pick_ganador_moneda)}</strong>. Elige{' '}
                <strong>Radiant</strong> (y pickeas primero) o <strong>LastPick</strong> (Dire y
                pickeas segundo).
              </p>

              {deboDecidir ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => onElegirRadiantOLastPick('radiant')}
                    disabled={procesando}
                    className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    ☀ Radiant · pickeo primero
                  </button>
                  <button
                    onClick={() => onElegirRadiantOLastPick('lastpick')}
                    disabled={procesando}
                    className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-50"
                  >
                    ☾ LastPick · Dire
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-center text-sm text-amber-300">
                  Esperando a que <strong>{nombre(sala.pick_decision_user_id)}</strong> elija
                  Radiant o LastPick…
                </p>
              )}
            </>
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
                      <FichaPicks userId={userId} p={p} conResumen />
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
                  <FichaPicks userId={userId} key={p.user_id} p={p} />
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
                  <FichaPicks userId={userId} key={p.user_id} p={p} />
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
