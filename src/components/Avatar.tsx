'use client';

import { useState } from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'nav' | 'lg' | 'xl';

const tamanos: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-8 w-8 text-xs',
  nav: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
  xl: 'h-16 w-16 text-xl',
};

const colores = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];

type AvatarProps = {
  nick?: string | null;
  src?: string | null;
  size?: AvatarSize;
  ringClass?: string;
  className?: string;
  title?: string;
};

/**
 * Avatar reutilizable: usa la imagen de Steam si existe y, si falla o no hay,
 * vuelve a mostrar la inicial del nick con un color estable.
 */
export default function Avatar({
  nick,
  src,
  size = 'md',
  ringClass = '',
  className = '',
  title,
}: AvatarProps) {
  const [falloImagen, setFalloImagen] = useState(false);
  const nombre = nick && nick.trim().length > 0 ? nick.trim() : '?';
  const inicial = nombre.charAt(0).toUpperCase() || '?';
  const color = colores[nombre.charCodeAt(0) % colores.length] ?? 'bg-slate-600';
  const clases = `flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ${tamanos[size]} ${color} ${ringClass} ${className}`;
  const descripcion = title ?? nombre;

  if (src && !falloImagen) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- el avatar externo de Steam no requiere optimización
      <img
        src={src}
        alt={`Avatar de ${nombre}`}
        title={descripcion}
        className={`${clases} object-cover`}
        onError={() => setFalloImagen(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={clases} title={descripcion}>
      {inicial}
    </div>
  );
}
