'use client';

import { JugadorVivo, urlIconoHeroe } from '@/lib/vivo';

type Props = {
  jugador: JugadorVivo | null;
  className?: string;
};

/**
 * Héroe que está jugando un jugador.
 * Se coloca justo debajo de su avatar para saber de un vistazo quién juega
 * qué (información que luego servirá para las apuestas por partida).
 */
export default function HeroEnSlot({ jugador, className = '' }: Props) {
  if (!jugador) return null;

  return (
    <span className={`inline-flex shrink-0 ${className}`.trim()} title={jugador.heroNombre}>
      {/* eslint-disable-next-line @next/next/no-img-element -- icono de héroe del CDN de Valve */}
      <img
        src={urlIconoHeroe(jugador.heroSlug)}
        alt={jugador.heroNombre}
        width={18}
        height={18}
        className="h-[18px] w-[18px] rounded-full bg-white/5 object-cover ring-1 ring-white/20"
        loading="lazy"
      />
    </span>
  );
}
