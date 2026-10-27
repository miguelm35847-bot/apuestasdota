'use client';

import { EstadoPill, PanelTab } from './PerfilUI';
import type { SolicitudPerfil } from './tipos';

type PropsSolicitudesPerfil = {
  cargandoTab: boolean;
  movimientosSolicitudes: SolicitudPerfil[];
};

export function SolicitudesPerfil({
  cargandoTab,
  movimientosSolicitudes,
}: PropsSolicitudesPerfil) {
  return (
    <PanelTab
      id="panel-movimientos"
      titulo="Recargas y retiros"
      descripcion="Solicitudes enviadas desde tu cuenta."
      cargando={cargandoTab && movimientosSolicitudes.length === 0}
      vacio={movimientosSolicitudes.length === 0}
      vacioTexto="No tienes recargas ni retiros todavía."
      vacioAccion={{ href: '/recargar', label: 'Recargar saldo' }}
    >
      <div className="space-y-3">
        {movimientosSolicitudes.map((m) => (
          <article
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${m.tipo === 'Recarga'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-rose-500/15 text-rose-300'
                  }`}
                aria-hidden="true"
              >
                {m.tipo === 'Recarga' ? '↓' : '↑'}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-white">{m.tipo}</p>
                <p className="truncate text-xs text-slate-400">
                  {m.detalle} · {new Date(m.fecha).toLocaleDateString('es-PE')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <EstadoPill estado={m.estado} />
              <span
                className={`font-display text-lg font-bold tabular-nums ${m.monto >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
              >
                {m.monto >= 0 ? '+' : '-'}S/ {(Math.abs(m.monto) / 100).toFixed(2)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </PanelTab>
  );
}
