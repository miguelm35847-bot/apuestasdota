import Image from 'next/image';
import { estrellasDeMmr, rangoMmr, type RangoMmr } from '@/lib/mmr';

type MedallaSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const PIXELES: Record<MedallaSize, number> = {
  xs: 20,
  sm: 32,
  md: 56,
  lg: 112,
  xl: 144,
};

/**
 * Cuánto mide la estrella (px) y qué separación hay entre centros, por tamaño
 * de medalla. El arco y el hueco se calculan a partir de esto y del arte del
 * PNG de cada rango.
 */
const ARCOS: Record<MedallaSize, { estrella: number; paso: number }> = {
  xs: { estrella: 6, paso: 3.6 },
  sm: { estrella: 8, paso: 6 },
  md: { estrella: 13, paso: 12 },
  lg: { estrella: 19, paso: 25 },
  xl: { estrella: 24, paso: 32 },
};

/**
 * Margen transparente de cada PNG (medido sobre las imágenes de
 * `public/medallas`): `arriba` es la fracción del alto que hay antes del arte
 * y `ancho` la fracción del ancho que ocupa el arte. Sirve para pegar el arco
 * de estrellas al borde real de la medalla y para escalarlo a su tamaño.
 */
const ARTE: Record<string, { arriba: number; ancho: number }> = {
  'sin-calibrar': { arriba: 0.137, ancho: 0.555 },
  herald: { arriba: 0.137, ancho: 0.617 },
  guardian: { arriba: 0.141, ancho: 0.68 },
  crusader: { arriba: 0.129, ancho: 0.949 },
  archon: { arriba: 0.137, ancho: 0.766 },
  legend: { arriba: 0.137, ancho: 0.812 },
  ancient: { arriba: 0.137, ancho: 0.965 },
  divine: { arriba: 0.078, ancho: 0.957 },
  immortal: { arriba: 0.004, ancho: 0.965 },
};

const ARTE_POR_DEFECTO = { arriba: 0.137, ancho: 0.85 };

/** Estrella de 5 puntas, como la que dibuja el cliente de Dota sobre la medalla. */
const ESTRELLA_DOTA =
  'M12 2.5 14.35 8.76 21.03 9.06 15.8 13.24 17.58 19.69 12 16 6.42 19.69 8.2 13.24 2.97 9.06 9.65 8.76Z';

const TONO_ESTRELLA = {
  relleno: '#efb23c',
  brillo: '#ffdd8a',
  borde: '#6b3f0a',
};

/**
 * Medidas de la insignia para un tamaño y un rango: la medalla y el arco de
 * estrellas que va encima. El arco se escala con el ancho real del arte, así
 * Herald (estrecho) lleva estrellas más chicas que Immortal (alas anchas).
 */
function medidasInsignia(rangoId: string, size: MedallaSize) {
  const medalla = PIXELES[size];
  const arte = ARTE[rangoId] ?? ARTE_POR_DEFECTO;
  const escala = Math.min(1.05, Math.max(0.7, arte.ancho / 0.965));

  const estrella = Math.max(5, ARCOS[size].estrella * escala);
  // Nunca menos de 0.72 estrellas de separación, para que no se pisen.
  const paso = Math.max(ARCOS[size].paso * escala, estrella * 0.72);
  const arco = estrella * 0.42;
  // El borde real de la medalla está por debajo del borde del PNG.
  const hueco = Math.max(1, medalla * 0.03) - arte.arriba * medalla;

  return { medalla, estrella, paso, arco, hueco, banda: estrella + arco + hueco };
}

function EstrellaDota({ tamano }: { tamano: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      aria-hidden="true"
      className="block drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
    >
      <path
        d={ESTRELLA_DOTA}
        fill={TONO_ESTRELLA.relleno}
        stroke={TONO_ESTRELLA.borde}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Brillo de la mitad de arriba, para que no quede plana. */}
      <path
        d={ESTRELLA_DOTA}
        transform="translate(12 9.5) scale(0.56) translate(-12 -12)"
        fill={TONO_ESTRELLA.brillo}
        opacity="0.75"
      />
    </svg>
  );
}

/**
 * Estrellas conseguidas en **arco encima de la medalla**, como en Dota 2: la
 * del centro va más alta y las de los extremos bajan hasta rozar el arte.
 */
function EstrellasEnArco({
  cantidad,
  rangoId,
  size,
}: {
  cantidad: number;
  rangoId: string;
  size: MedallaSize;
}) {
  const { medalla, estrella, paso, arco, hueco, banda } = medidasInsignia(rangoId, size);
  const cuantas = Math.min(5, Math.max(1, cantidad));

  return (
    <span
      role="img"
      aria-label={`${cuantas} de 5 estrellas`}
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: medalla, height: banda }}
    >
      {Array.from({ length: cuantas }).map((_, i) => {
        // -1 en la estrella de la izquierda, 0 en la del centro y 1 en la derecha.
        const dx = cuantas === 1 ? 0 : (i / (cuantas - 1)) * 2 - 1;
        const centroX = medalla / 2 + (dx * paso * (cuantas - 1)) / 2;
        // Parábola: el centro sube y los extremos bajan hasta el borde del arco.
        const centroY = banda - hueco - estrella / 2 - (1 - dx * dx) * arco;

        return (
          <span
            key={i}
            className="absolute"
            style={{
              left: centroX - estrella / 2,
              top: centroY - estrella / 2,
              width: estrella,
              height: estrella,
            }}
          >
            <EstrellaDota tamano={estrella} />
          </span>
        );
      })}
    </span>
  );
}

type InsigniaProps = {
  icono: string;
  alt: string;
  rangoId: string;
  size: MedallaSize;
  /** Estrellas conseguidas (1-5); sin valor no se dibuja el arco. */
  estrellas?: number;
  title?: string;
  atenuada?: boolean;
};

/**
 * La insignia completa: el arco de estrellas arriba y la medalla debajo. El
 * contenedor reserva el alto del arco para que no se monte sobre el texto de
 * al lado.
 */
function Insignia({
  icono,
  alt,
  rangoId,
  size,
  estrellas,
  title,
  atenuada = false,
}: InsigniaProps) {
  const { medalla, banda } = medidasInsignia(rangoId, size);
  // A 20 px las estrellas quedan como motas: en ese tamaño va solo la medalla.
  const conArco = Boolean(estrellas) && PIXELES[size] >= 32;
  const alto = (conArco ? banda : 0) + medalla;

  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: medalla, height: alto }}
      title={title}
    >
      {conArco ? (
        <EstrellasEnArco cantidad={estrellas ?? 0} rangoId={rangoId} size={size} />
      ) : null}
      <Image
        src={icono}
        alt={alt}
        width={medalla}
        height={medalla}
        sizes={`${medalla}px`}
        className={`absolute bottom-0 left-0 object-contain ${
          atenuada ? 'opacity-80' : 'drop-shadow-[0_0_18px_rgba(255,255,255,0.12)]'
        }`}
        style={{ width: medalla, height: medalla }}
      />
    </span>
  );
}

type MedallaMmrProps = {
  mmr: number | null | undefined;
  size?: MedallaSize;
  mostrarNombre?: boolean;
  mostrarEstrellas?: boolean;
  /** Versión compacta para meterla dentro de `<p>` o `<span>` junto a texto. */
  inline?: boolean;
  className?: string;
};

/**
 * Medalla de rango de Dota 2 correspondiente al MMR, con el arco de estrellas
 * encima tal como se ve en el juego. Las imágenes son locales
 * (public/medallas) para no depender de CDNs externos.
 */
export default function MedallaMmr({
  mmr,
  size = 'md',
  mostrarNombre = true,
  mostrarEstrellas = true,
  inline = false,
  className = '',
}: MedallaMmrProps) {
  const rango: RangoMmr | null = rangoMmr(mmr);
  // Immortal no lleva estrellas: en Dota muestra la posición del leaderboard.
  const estrellas =
    rango && mostrarEstrellas && rango.estrellas ? estrellasDeMmr(mmr, rango) : 0;

  const insignia = rango ? (
    <Insignia
      icono={rango.icono}
      alt={inline ? '' : `Medalla ${rango.nombre}`}
      rangoId={rango.id}
      size={size}
      estrellas={mostrarEstrellas ? estrellas : undefined}
      title={`Medalla ${rango.nombre}${estrellas > 0 ? ` · ${estrellas} de 5 estrellas` : ''}`}
    />
  ) : (
    <Insignia
      icono="/medallas/rank_0.png"
      alt={inline ? '' : 'Medalla sin calibrar'}
      rangoId="sin-calibrar"
      size={size}
      atenuada
      title="Sin MMR"
    />
  );

  if (inline) {
    return (
      <span className={`inline-block shrink-0 align-middle ${className}`.trim()}>{insignia}</span>
    );
  }

  if (!rango) {
    return (
      <div className={`flex items-center gap-3 ${className}`.trim()}>
        {insignia}
        {mostrarNombre && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-300">Sin MMR</p>
            <p className="text-xs text-slate-500">Sin calibrar</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      {insignia}
      {mostrarNombre && (
        <div className="min-w-0">
          <p className={`font-display text-sm font-bold ${rango.color}`}>{rango.nombre}</p>
          <p className="text-xs text-slate-400">MMR {mmr}</p>
        </div>
      )}
    </div>
  );
}
