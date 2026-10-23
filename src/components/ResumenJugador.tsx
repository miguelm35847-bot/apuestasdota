'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ResumenDota } from '@/lib/dotaResumen';

type Props = {
  userId: string;
  /** Versión reducida para las tarjetas de la lista de espera. */
  compacto?: boolean;
  className?: string;
};

const cache = new Map<string, ResumenDota>();
const ROLES_CORTOS: Record<string, string> = {
  'Safe / Carry': 'HC',
  Mid: 'Mid',
  Offlane: 'Off',
  Support: 'Sup.',
};

const rolCorto = (rol: string) => ROLES_CORTOS[rol] ?? rol;

/**
 * Datos destacados de un jugador dentro de la sala.
 *
 * Viene de la API pública de OpenDota (la fuente de Dotabuff): los 3 héroes
 * más jugados, los 3 roles más jugados con su winrate, los roles de las
 * últimas partidas y el enlace a su Dotabuff.
 *
 * Si el jugador no tiene partidas públicas, no se muestra nada.
 */
export default function ResumenJugador({ userId, compacto = false, className = '' }: Props) {
  const [resumen, setResumen] = useState<ResumenDota | null>(() => cache.get(userId) ?? null);

  useEffect(() => {
    // Si ya está en la caché, el estado inicial lo tomó: no hay que pedirlo.
    if (cache.has(userId)) return;

    let vivo = true;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || !vivo) return;

      try {
        const respuesta = await fetch(`/api/dota/jugador/${userId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!respuesta.ok) return;

        const datos = (await respuesta.json()) as ResumenDota;
        cache.set(userId, datos);
        if (vivo) setResumen(datos);
      } catch {
        // Sin datos: la tarjeta se queda como estaba.
      }
    })();

    return () => {
      vivo = false;
    };
  }, [userId]);

  if (!resumen?.disponible) return null;

  const { heroes, roles, rolesRecientes, winrateReciente, dotabuffUrl, ultimaPartida, partidasAnalizadas } = resumen;

  if (heroes.length === 0 && roles.length === 0 && !dotabuffUrl) return null;

  return (
    <div
      data-resumen-jugador
      className={`min-w-0 space-y-2.5 border-t border-white/10 pt-2.5 ${className}`}
    >
      {/* 3 héroes más jugados */}
      {heroes.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold text-slate-400">Héroes más jugados</p>
          <div className="grid grid-cols-3 gap-1.5">
            {heroes.map((heroe) => (
              <div
                key={heroe.id}
                title={`${heroe.partidas} partidas en la muestra analizada`}
                className="min-w-0 overflow-hidden rounded-md border border-white/10 bg-slate-950/35"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- retrato de héroe del CDN de Valve */}
                <img
                  src={heroe.imagen}
                  alt={heroe.nombre}
                  width={80}
                  height={45}
                  className={`aspect-video w-full bg-white/5 object-cover ${compacto ? 'max-h-11' : 'max-h-14'}`}
                  loading="lazy"
                />
                <p className="px-1 py-0.5 text-center text-[9px] leading-4 text-slate-400">
                  <span className="font-semibold tabular-nums text-slate-200">{heroe.partidas}</span>
                  {' '}{heroe.partidas === 1 ? 'partida' : 'partidas'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roles más jugados con su winrate */}
      {roles.length > 0 && (
        <div>
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
            <p className="font-semibold">Roles más jugados</p>
            <span className="text-[9px] text-slate-500">% victorias</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {roles.map((rol) => (
              <span
                key={rol.rol}
                title={`${rol.rol}: ${rol.winrate}% de victorias en ${rol.partidas} partidas`}
                aria-label={`${rolCorto(rol.rol)}: ${rol.winrate}% de victorias en ${rol.partidas} partidas`}
                className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 rounded-md border border-prism-400/15 bg-prism-500/[0.08] px-1.5 py-1 text-[10px] leading-none"
              >
                <span className="font-semibold break-words text-prism-200">{rolCorto(rol.rol)}</span>
                <span className="font-semibold tabular-nums text-slate-200">{rol.winrate}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Roles de las últimas partidas */}
      {rolesRecientes.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
          <span className="text-slate-500">Últimos roles</span>
          <div className="flex flex-wrap items-center gap-1" aria-label="Roles del más reciente al más antiguo">
            {rolesRecientes.map((rol, i) => (
              <span key={`${rol}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 && <span aria-hidden="true" className="text-slate-600">·</span>}
                <span title={rol} className="rounded bg-white/5 px-1.5 py-0.5 text-slate-300">{rolCorto(rol)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {!compacto && winrateReciente !== null && (
        <p className="text-[10px] text-slate-500">
          Últimas {Math.min(partidasAnalizadas, 10)}: <span className="text-slate-300">{winrateReciente}% de victorias</span>
          {ultimaPartida && (
            <span className={ultimaPartida.victoria ? 'text-emerald-300' : 'text-rose-300'}>
              {' · '}
              {ultimaPartida.victoria ? 'victoria' : 'derrota'}
            </span>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[9px]">
        <span className="text-slate-500">Muestra: {partidasAnalizadas} partidas</span>
        {dotabuffUrl && (
          <a
            href={dotabuffUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 font-semibold text-prism-300 transition hover:text-prism-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400"
            onClick={(event) => event.stopPropagation()}
          >
            Dotabuff
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </div>
  );
}
