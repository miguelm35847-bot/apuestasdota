'use client';

import { JugadorVivo, kadDe, urlIconoHeroe } from '@/lib/vivo';

type Props = {
  jugador: JugadorVivo | null;
  className?: string;
  /** Si es false solo muestra el K/D/A (el héroe va aparte, bajo el avatar). */
  mostrarIcono?: boolean;
};

/** Héroe y K/D/A de un jugador en la sala (solo si la partida está en vivo). */
export default function VivoJugador({
  jugador,
  className = '',
  mostrarIcono = true,
}: Props) {
  if (!jugador) return null;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`.trim()}>
      {mostrarIcono && (
        /* eslint-disable-next-line @next/next/no-img-element -- icono de héroe del CDN de Valve */
        <img
          src={urlIconoHeroe(jugador.heroSlug)}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 shrink-0 rounded-full bg-white/5 object-cover ring-1 ring-emerald-400/30"
          loading="lazy"
        />
      )}
      <span className="text-[10px] font-semibold tabular-nums text-slate-400">
        {kadDe(jugador)}
      </span>
    </span>
  );
}
