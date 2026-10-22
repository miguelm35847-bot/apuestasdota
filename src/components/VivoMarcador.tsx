'use client';

import { PartidaViva, kadDe, relojDePartida, urlIconoHeroe } from '@/lib/vivo';

type Props = {
  partida: PartidaViva;
  /**
   * Versión compacta (hero y tarjetas del landing): solo el marcador y el
   * reloj. Los héroes de cada jugador ya van debajo de sus avatares.
   */
  compacto?: boolean;
  className?: string;
};

/**
 * Marcador en vivo de la partida: score y reloj. En la versión completa
 * (dentro de la sala) añade también los dos equipos con héroe y K/D/A.
 */
export default function VivoMarcador({ partida, compacto = false, className = '' }: Props) {
  const radiant = partida.radiant;
  const dire = partida.dire;

  return (
    <div
      className={`rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] ${
        compacto ? 'px-2.5 py-1.5' : 'p-2.5'
      } ${className}`.trim()}
    >
      {compacto ? (
        <div className="relative flex items-center justify-center">
          <span className="absolute left-0 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            En vivo
          </span>
          <span className="text-[11px] font-bold tabular-nums text-slate-200">
            ⏱ {relojDePartida(partida.duracionSegundos)}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            En vivo
          </span>
          <span className="text-[11px] font-bold tabular-nums text-slate-300">
            ⏱ {relojDePartida(partida.duracionSegundos)}
          </span>
        </div>
      )}

      <div className="mt-1 flex items-center gap-1.5">
        <span className="font-display text-lg font-extrabold leading-none tabular-nums text-emerald-300">
          {radiant.score}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Radiant
        </span>
        <span className="flex-1 text-center text-[10px] text-slate-600">vs</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Dire
        </span>
        <span className="font-display text-lg font-extrabold leading-none tabular-nums text-rose-300">
          {dire.score}
        </span>
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
    </div>
  );
}
