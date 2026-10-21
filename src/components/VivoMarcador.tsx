'use client';

import { PartidaViva, kadDe, relojDePartida, urlIconoHeroe } from '@/lib/vivo';

type Props = {
  partida: PartidaViva;
  /** Versión compacta para la sala destacada del hero. */
  compacto?: boolean;
  className?: string;
};

/**
 * Marcador en vivo de la partida: score, reloj y los héroes con sus
 * estadísticas de cada equipo.
 */
export default function VivoMarcador({ partida, compacto = false, className = '' }: Props) {
  const radiant = partida.radiant;
  const dire = partida.dire;

  return (
    <div
      className={`rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] p-2.5 ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          En vivo
        </span>
        <span className="font-display text-sm font-bold tabular-nums text-slate-200">
          ⏱ {relojDePartida(partida.duracionSegundos)}
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="font-display text-xl font-extrabold tabular-nums text-emerald-300">
            {radiant.score}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Radiant
          </span>
        </div>
        <span className="text-[10px] text-slate-600">vs</span>
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Dire
          </span>
          <span className="font-display text-xl font-extrabold tabular-nums text-rose-300">
            {dire.score}
          </span>
        </div>
      </div>

      {!compacto && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <ul className="space-y-1">
            {radiant.jugadores.map((jugador) => (
              <li key={jugador.accountId} className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- icono de héroe del CDN de Valve */}
                <img
                  src={urlIconoHeroe(jugador.heroSlug)}
                  alt=""
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] shrink-0 rounded-full bg-white/5 object-cover ring-1 ring-white/10"
                  loading="lazy"
                />
                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">
                  {jugador.nick}
                </span>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-400">
                  {kadDe(jugador)}
                </span>
              </li>
            ))}
          </ul>
          <ul className="space-y-1">
            {dire.jugadores.map((jugador) => (
              <li key={jugador.accountId} className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- icono de héroe del CDN de Valve */}
                <img
                  src={urlIconoHeroe(jugador.heroSlug)}
                  alt=""
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] shrink-0 rounded-full bg-white/5 object-cover ring-1 ring-white/10"
                  loading="lazy"
                />
                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">
                  {jugador.nick}
                </span>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-400">
                  {kadDe(jugador)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {compacto && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <ul className="flex flex-wrap items-center gap-0.5">
            {radiant.jugadores.map((jugador) => (
              <li key={jugador.accountId} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- icono de héroe del CDN de Valve */}
                <img
                  src={urlIconoHeroe(jugador.heroSlug)}
                  alt={jugador.heroNombre}
                  title={`${jugador.nick} · ${kadDe(jugador)}`}
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded-full bg-white/5 object-cover ring-1 ring-emerald-400/30"
                  loading="lazy"
                />
                <span className="absolute -bottom-0.5 -right-0.5 rounded bg-[#0a0f17] px-0.5 text-[8px] font-bold leading-none text-emerald-300">
                  {jugador.kills}
                </span>
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap items-center gap-0.5">
            {dire.jugadores.map((jugador) => (
              <li key={jugador.accountId} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- icono de héroe del CDN de Valve */}
                <img
                  src={urlIconoHeroe(jugador.heroSlug)}
                  alt={jugador.heroNombre}
                  title={`${jugador.nick} · ${kadDe(jugador)}`}
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded-full bg-white/5 object-cover ring-1 ring-rose-400/30"
                  loading="lazy"
                />
                <span className="absolute -bottom-0.5 -right-0.5 rounded bg-[#0a0f17] px-0.5 text-[8px] font-bold leading-none text-rose-300">
                  {jugador.kills}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
