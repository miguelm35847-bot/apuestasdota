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

/** Estrella de 5 puntas, como la que dibuja el cliente de Dota sobre la medalla. */
const ESTRELLA_DOTA =
  'M12 2.5 14.35 8.76 21.03 9.06 15.8 13.24 17.58 19.69 12 16 6.42 19.69 8.2 13.24 2.97 9.06 9.65 8.76Z';

const CLASES_ESTRELLAS: Record<MedallaSize, string> = {
  xs: 'gap-0',
  sm: 'gap-[1px]',
  md: 'gap-0.5',
  lg: 'gap-1',
  xl: 'gap-1',
};

const TAMANO_ESTRELLA: Record<MedallaSize, string> = {
  xs: 'h-[7px] w-[7px]',
  sm: 'h-2.5 w-2.5',
  md: 'h-3.5 w-3.5',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

type MedallaMmrProps = {
  mmr: number | null | undefined;
  size?: MedallaSize;
  mostrarNombre?: boolean;
  mostrarEstrellas?: boolean;
  /** Versión en línea (solo la imagen) para meterla dentro de `<p>` o `<span>`. */
  inline?: boolean;
  className?: string;
};

function EstrellaDota({ activa, size }: { activa: boolean; size: MedallaSize }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${TAMANO_ESTRELLA[size]} shrink-0 ${
        activa ? 'drop-shadow-[0_0_3px_rgba(244,192,74,0.5)]' : ''
      }`}
    >
      <path
        d={ESTRELLA_DOTA}
        fill={activa ? '#f4c04a' : '#1b2333'}
        stroke={activa ? '#8a5a12' : '#3b4759'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {activa && (
        <path
          d={ESTRELLA_DOTA}
          transform="translate(12 12) scale(0.52) translate(-12 -12)"
          fill="#ffeaa6"
        />
      )}
    </svg>
  );
}

/**
 * Fila de 5 estrellas como en Dota 2: las conseguidas en dorado y el resto
 * apagadas. Va **debajo** de la medalla, igual que en el cliente del juego.
 */
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
      className={`flex items-center justify-center ${CLASES_ESTRELLAS[size]}`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <EstrellaDota key={i} activa={i < cantidad} size={size} />
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
  inline = false,
  className = '',
}: MedallaMmrProps) {
  const rango = rangoMmr(mmr);
  const px = PIXELES[size];

  // Versión en línea: solo la imagen, en un `<span>` para poder usarla dentro
  // de un `<p>` o de otro `<span>` sin romper el HTML.
  if (inline) {
    return (
      <span
        className={`inline-flex shrink-0 items-center ${className}`.trim()}
        title={rango ? `Medalla ${rango.nombre}` : 'Sin MMR'}
      >
        <Image
          src={rango?.icono ?? '/medallas/rank_0.png'}
          alt=""
          width={px}
          height={px}
          className={`${CLASES_TAMANO[size]} object-contain ${
            rango ? '' : 'opacity-80'
          }`}
          sizes={`${px}px`}
        />
      </span>
    );
  }

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
        <Image
          src={rango.icono}
          alt={`Medalla ${rango.nombre}`}
          width={px}
          height={px}
          className={`${CLASES_TAMANO[size]} object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.12)]`}
          sizes={`${px}px`}
        />
        {mostrarEstrellas && <EstrellasMmr cantidad={estrellas} size={size} />}
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
