import Image from 'next/image';

/**
 * Icono de Dota 2 sobre una ficha roja con degradado.
 * Se usa en las tarjetas de sala para que el logo tenga el mismo tratamiento
 * visual que la referencia de Kódigodota.
 */
export default function DotaTile({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[0.34rem] bg-[linear-gradient(135deg,#ff9a76_0%,#f0523a_48%,#a61b12_100%)] shadow-[0_0_14px_-3px_rgba(240,82,58,0.65),inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-inset ring-white/15 ${className}`}
    >
      <Image
        src="/dota2.svg"
        alt=""
        width={24}
        height={24}
        className="h-[82%] w-[82%] object-contain brightness-0"
      />
    </span>
  );
}
