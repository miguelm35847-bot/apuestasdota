import Image from 'next/image';
import { estrellasDeMmr, rangoMmr } from '@/lib/mmr';

type MedallaSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const PIXELES: Record<MedallaSize, number> = {
  xs: 20,
  sm: 32,
  md: 56,
  lg: 112,
  xl: 144,
};

const CLASES_TAMANO: Record<MedallaSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-8 w-8',
  md: 'h-14 w-14',
  lg: 'h-28 w-28',
  xl: 'h-36 w-36',
};

const CLASES_ESTRELLAS: Record<MedallaSize, string> = {
  xs: 'gap-0 text-[6px]',
  sm: 'gap-0 text-[8px]',
  md: 'gap-0.5 text-xs',
  lg: 'gap-0.5 text-sm',
  xl: 'gap-1 text-base',
};

type MedallaMmrProps = {
  mmr: number | null | undefined;
  size?: MedallaSize;
  mostrarNombre?: boolean;
  mostrarEstrellas?: boolean;
  className?: string;
};

function EstrellasMmr({
  cantidad,
  size,
}: {
  cantidad: number;
  size: MedallaSize;
}) {
  return (
    <span
      role="img"
      aria-label={`${cantidad} de 5 estrellas`}
      title={`${cantidad} de 5 estrellas`}
      className={`flex items-center justify-center leading-none ${CLASES_ESTRELLAS[size]}`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={i < cantidad ? 'text-amber-300' : 'text-slate-600'}
        >
          {i < cantidad ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

/**
 * Medalla de rango de Dota 2 correspondiente al MMR.
 * Las imágenes son locales (public/medallas) para no depender de CDNs externos.
 */
export default function MedallaMmr({
  mmr,
  size = 'md',
  mostrarNombre = true,
  mostrarEstrellas = true,
  className = '',
}: MedallaMmrProps) {
  const rango = rangoMmr(mmr);
  const px = PIXELES[size];

  if (!rango) {
    return (
      <div className={`flex items-center gap-3 ${className}`.trim()}>
        <Image
          src="/medallas/rank_0.png"
          alt="Medalla sin calibrar"
          width={px}
          height={px}
          className={`${CLASES_TAMANO[size]} shrink-0 object-contain opacity-80`}
          sizes={`${px}px`}
        />
        {mostrarNombre && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-300">Sin MMR</p>
            <p className="text-xs text-slate-500">Sin calibrar</p>
          </div>
        )}
      </div>
    );
  }

  const estrellas = estrellasDeMmr(mmr, rango);

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div className="flex shrink-0 flex-col items-center gap-1">
        {mostrarEstrellas && <EstrellasMmr cantidad={estrellas} size={size} />}
        <Image
          src={rango.icono}
          alt={`Medalla ${rango.nombre}`}
          width={px}
          height={px}
          className={`${CLASES_TAMANO[size]} object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.12)]`}
          sizes={`${px}px`}
        />
      </div>
      {mostrarNombre && (
        <div className="min-w-0">
          <p className={`font-display text-sm font-bold ${rango.color}`}>{rango.nombre}</p>
          <p className="text-xs text-slate-400">MMR {mmr}</p>
        </div>
      )}
    </div>
  );
}
