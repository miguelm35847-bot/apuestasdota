'use client';

import { PanelTab } from './PerfilUI';
import type { PartidaPerfil } from './tipos';

type PropsHistorialPerfil = {
  cargandoTab: boolean;
  misPartidas: PartidaPerfil[];
};

export function HistorialPerfil({
  cargandoTab,
  misPartidas,
}: PropsHistorialPerfil) {
  return (
    <PanelTab
      id="panel-historial"
      titulo="Mis partidas"
      descripcion="Tus últimas 20 partidas terminadas."
      cargando={cargandoTab && misPartidas.length === 0}
      vacio={misPartidas.length === 0}
      vacioTexto="Aún no tienes partidas terminadas."
      vacioAccion={{ href: '/salas', label: 'Ver salas disponibles' }}
    >
      <div className="space-y-3">
        {misPartidas.map((p) => {
          const ganador = p.salas?.partidas?.equipo_ganador;
          const miEquipo = p.equipo;
          const gano =
            ganador !== null && ganador !== undefined && miEquipo === ganador;
          const monto = gano
            ? p.salas?.partidas?.premio_por_ganador ?? 0
            : -(p.salas?.cuota ?? 0);
          return (
            <article
              key={p.sala_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">
                  {p.salas?.nombre ?? 'Sala'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>
                    {new Date(p.salas?.created_at ?? '').toLocaleDateString('es-PE')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span
                      className={`h-2 w-2 rounded-full ${miEquipo === 1
                        ? 'bg-emerald-400'
                        : miEquipo === 2
                          ? 'bg-rose-400'
                          : 'bg-slate-500'
                        }`}
                    />
                    {miEquipo === 1
                      ? 'Radiant'
                      : miEquipo === 2
                        ? 'Dire'
                        : 'Sin asignar'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${gano
                    ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 ring-rose-500/30'
                    }`}
                >
                  {gano ? 'Ganaste' : 'Perdiste'}
                </span>
                <span
                  className={`font-display text-lg font-bold tabular-nums ${gano ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                >
                  {`${gano ? '+' : '-'}S/ ${(Math.abs(monto) / 100).toFixed(2)}`}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </PanelTab>
  );
}
