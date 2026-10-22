'use client';

import { JugadorVivo, urlIconoHeroe } from '@/lib/vivo';

type Props = {
  jugador: JugadorVivo | null;
  className?: string;
};

/**
 * Héroe que está jugando un jugador, con sus kills encima.
 * Se coloca justo debajo de su avatar para saber de un vistazo quién juega
 * qué (información que luego servirá para las apuestas por partida).
 */
export default function HeroEnSlot({ jugador, className = '' }: Props) {
  if (!jugador) return null;

  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`.trim()}
      title={`${jugador.heroNombre} · ${jugador.kills}/${jugador.deaths}/${jugador.assists}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- icono de héroe del CDN de Valve */}
      <img
        src={urlIconoHeroe(jugador.heroSlug)}
        alt={jugador.heroNombre}
        width={18}
        height={18}
        className="h-[18px] w-[18px] rounded-full bg-white/5 object-cover ring-1 ring-emerald-400/40"
        loading="lazy"
      />
      <span className="absolute -bottom-1 -right-1 rounded bg-[#0a0f17] px-0.5 text-[8px] font-bold leading-none text-emerald-300">
        {jugador.kills}
      </span>
    </span>
  );
}
