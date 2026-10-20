import Image from 'next/image';
import { rangoMmr } from '@/lib/mmr';

type MedallaSize = 'sm' | 'md' | 'lg' | 'xl';

const PIXELES: Record<MedallaSize, number> = {
  sm: 32,
  md: 56,
  lg: 112,
  xl: 144,
};

const CLASES_TAMANO: Record<MedallaSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-14 w-14',
  lg: 'h-28 w-28',
  xl: 'h-36 w-36',
};

type MedallaMmrProps = {
  mmr: number | null | undefined;
  size?: MedallaSize;
  mostrarNombre?: boolean;
  className?: string;
};

/**
 * Medalla de rango de Dota 2 correspondiente al MMR.
 * Las imágenes son locales (public/medallas) para no depender de CDNs externos.
 */
export default function MedallaMmr({
  mmr,
  size = 'md',
  mostrarNombre = true,
  className = '',
}: MedallaMmrProps) {
  const rango = rangoMmr(mmr);
  const px = PIXELES[size];

  if (!rango) {
    return (
      <div className={`flex items-center gap-3 ${className}`.trim()}>
        <div
          className={`flex shrink-0 items-center justify-center rounded-full border border-dashed border-white/15 bg-white/5 text-lg font-bold text-slate-500 ${CLASES_TAMANO[size]}`}
          aria-hidden="true"
        >
          ?
        </div>
        {mostrarNombre && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-300">Sin MMR</p>
            <p className="text-xs text-slate-500">Sin medalla</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <Image
        src={rango.icono}
        alt={`Medalla ${rango.nombre}`}
        width={px}
        height={px}
        className={`${CLASES_TAMANO[size]} shrink-0 object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.12)]`}
        sizes={`${px}px`}
      />
      {mostrarNombre && (
        <div className="min-w-0">
          <p className={`font-display text-sm font-bold ${rango.color}`}>{rango.nombre}</p>
          <p className="text-xs text-slate-400">MMR {mmr}</p>
        </div>
      )}
    </div>
  );
}
