'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import type { ConteosPerfil, Pestaña } from './tipos';

const PESTAÑAS: { id: Pestaña; nombre: string; nombreCorto: string }[] = [
  { id: 'historial', nombre: 'Mis partidas', nombreCorto: 'Partidas' },
  { id: 'movimientos', nombre: 'Recargas y retiros', nombreCorto: 'Solicitudes' },
  { id: 'billetera', nombre: 'Billetera', nombreCorto: 'Billetera' },
];
export function IconoPestana({ id, className = 'h-4 w-4' }: { id: Pestaña; className?: string }) {
  if (id === 'historial') {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (id === 'movimientos') {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 7h11" />
        <path d="M14 4l3 3-3 3" />
        <path d="M17 17H6" />
        <path d="M10 20l-3-3 3-3" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 14h2" />
    </svg>
  );
}

export function EstadoPill({ estado }: { estado: string }) {
  const estilos: Record<string, string> = {
    aprobada: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    pagado: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    pendiente: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    solicitado: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    rechazada: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    rechazado: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${estilos[estado] ?? 'bg-white/5 text-slate-300 ring-white/10'
        }`}
    >
      {estado}
    </span>
  );
}

export function Aviso({ tono, children }: { tono: 'error' | 'success'; children: ReactNode }) {
  const esError = tono === 'error';
  return (
    <div
      role={esError ? 'alert' : 'status'}
      className={`mb-4 flex items-start gap-2.5 rounded-xl border p-3 text-sm ${esError
        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        }`}
    >
      <svg
        className="mt-0.5 h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {esError ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="m8.5 12.5 2.5 2.5 4.5-5" />
          </>
        )}
      </svg>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function PanelTab({
  titulo,
  descripcion,
  cargando,
  vacio,
  vacioTexto,
  vacioAccion,
  children,
  id,
}: {
  titulo: string;
  descripcion?: string;
  cargando: boolean;
  vacio: boolean;
  vacioTexto: string;
  vacioAccion?: { href: string; label: string };
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      role={id ? 'tabpanel' : undefined}
      aria-labelledby={id ? `${id}-tab` : undefined}
      className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft sm:p-6"
    >
      <div className="mb-4">
        <h3 className="font-display text-lg font-bold text-white">{titulo}</h3>
        {descripcion && <p className="mt-0.5 text-sm text-slate-400">{descripcion}</p>}
      </div>

      {cargando ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : vacio ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
          <p className="text-sm text-slate-400">{vacioTexto}</p>
          {vacioAccion && (
            <Link
              href={vacioAccion.href}
              className="mt-3 inline-flex rounded-lg border border-prism-500/30 bg-prism-500/10 px-4 py-2 text-sm font-semibold text-prism-200 transition hover:bg-prism-500/20"
            >
              {vacioAccion.label}
            </Link>
          )}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

type PropsNavegacionPerfil = {
  pestaña: Pestaña;
  setPestaña: (pestaña: Pestaña) => void;
  conteos: ConteosPerfil;
};

export function NavegacionPerfil({
  pestaña,
  setPestaña,
  conteos,
}: PropsNavegacionPerfil) {
  return (
    <div className="sticky top-16 z-20 -mx-4 mt-6 border-b border-white/10 bg-[#0a0e17]/85 px-4 py-3 backdrop-blur lg:top-[72px]">
      <div
        role="tablist"
        aria-label="Secciones del perfil"
        className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/5 p-1 sm:flex"
      >
        {PESTAÑAS.map((p) => {
          const activo = pestaña === p.id;
          const cantidad =
            p.id === 'historial'
              ? conteos.partidas
              : p.id === 'movimientos'
                ? conteos.movimientos
                : conteos.billetera;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`panel-${p.id}-tab`}
              aria-selected={activo}
              aria-controls={`panel-${p.id}`}
              onClick={() => setPestaña(p.id)}
              className={`flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 py-2.5 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-500/40 sm:flex-1 sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm ${activo
                ? 'bg-prism-500 text-white shadow-arena-glow'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
            >
              <IconoPestana id={p.id} />
              <span className="truncate sm:hidden">{p.nombreCorto}</span>
              <span className="hidden sm:inline">{p.nombre}</span>
              {cantidad > 0 && (
                <span
                  className={`rounded-full px-1 py-0.5 text-[9px] font-bold tabular-nums sm:px-1.5 sm:text-[10px] ${activo ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'
                    }`}
                >
                  {cantidad}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
