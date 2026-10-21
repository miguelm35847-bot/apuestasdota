import type { ReactNode } from 'react';

/**
 * Cabecera compartida de las pantallas de administración.
 * Mantiene el mismo jerarquía visual en Panel, Recargas, Retiros y Jugadores.
 */
export default function AdminPageHeader({
  titulo,
  descripcion,
  badge,
  accion,
  kicker = 'KódigoDota · Administración',
}: {
  titulo: string;
  descripcion?: string;
  badge?: ReactNode;
  accion?: ReactNode;
  kicker?: string;
}) {
  return (
    <header className="mb-5 mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-prism-300/90">
          {kicker}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-[1.35rem] font-bold tracking-tight text-white sm:text-[1.7rem]">
            {titulo}
          </h1>
          {badge}
        </div>
        {descripcion && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">{descripcion}</p>
        )}
      </div>
      {accion && <div className="flex shrink-0 flex-wrap items-center gap-2">{accion}</div>}
    </header>
  );
}
