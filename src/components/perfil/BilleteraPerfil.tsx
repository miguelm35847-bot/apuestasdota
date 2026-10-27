'use client';

import { ETIQUETAS_MOVIMIENTO } from '@/lib/actividades';
import { PanelTab } from './PerfilUI';
import type { MovimientoMostrado } from './tipos';

type PropsBilleteraPerfil = {
  cargandoTab: boolean;
  movimientosBilletera: MovimientoMostrado[];
};

export function BilleteraPerfil({
  cargandoTab,
  movimientosBilletera,
}: PropsBilleteraPerfil) {
  return (
    <PanelTab
      id="panel-billetera"
      titulo="Movimientos de billetera"
      descripcion="Ajustes, premios y pérdidas de tus partidas."
      cargando={cargandoTab && movimientosBilletera.length === 0}
      vacio={movimientosBilletera.length === 0}
      vacioTexto="No tienes movimientos de billetera."
      vacioAccion={{ href: '/salas', label: 'Entrar a una sala' }}
    >
      <div className="space-y-3">
        {movimientosBilletera.map((m) => (
          <article
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${m.monto >= 0
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-rose-500/15 text-rose-300'
                  }`}
                aria-hidden="true"
              >
                {m.monto >= 0 ? '↓' : '↑'}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-white">
                  {ETIQUETAS_MOVIMIENTO[m.tipo] ?? m.tipo.replace(/_/g, ' ')}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {m.detalle} · {new Date(m.fecha).toLocaleDateString('es-PE')}
                </p>
              </div>
            </div>
            <span
              className={`font-display text-lg font-bold tabular-nums ${m.monto >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
            >
              {m.monto >= 0 ? '+' : '-'}S/ {(Math.abs(m.monto) / 100).toFixed(2)}
            </span>
          </article>
        ))}
      </div>
    </PanelTab>
  );
}
