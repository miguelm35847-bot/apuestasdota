'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type ItemAdmin = {
  href: string;
  nombre: string;
  icono: ReactNode;
};

const ICONO_CLASE = 'h-4 w-4 shrink-0';

const ITEMS: ItemAdmin[] = [
  {
    href: '/admin',
    nombre: 'Panel',
    icono: (
      <svg
        className={ICONO_CLASE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: '/admin/recargas',
    nombre: 'Recargas',
    icono: (
      <svg
        className={ICONO_CLASE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v12" />
        <path d="M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    ),
  },
  {
    href: '/admin/retiros',
    nombre: 'Retiros',
    icono: (
      <svg
        className={ICONO_CLASE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 21V9" />
        <path d="M7 14l5-5 5 5" />
        <path d="M5 3h14" />
      </svg>
    ),
  },
  {
    href: '/admin/jugadores',
    nombre: 'Jugadores',
    icono: (
      <svg
        className={ICONO_CLASE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/salas',
    nombre: 'Salas',
    icono: (
      <svg
        className={ICONO_CLASE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 4v6" />
      </svg>
    ),
  },
];

/**
 * Sub-navegación compartida de las pantallas de administración.
 * Mantiene la misma barra segmentada en Panel, Recargas, Retiros y Jugadores.
 */
export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones de administración"
      className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1"
    >
      {ITEMS.map((item) => {
        const activo = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? 'page' : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-500/40 ${
              activo
                ? 'bg-prism-500 text-white shadow-arena-glow'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {item.icono}
            {item.nombre}
          </Link>
        );
      })}
    </nav>
  );
}
