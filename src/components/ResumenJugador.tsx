'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ResumenDota } from '@/lib/dotaResumen';

type Props = {
  userId: string;
  /** Versión reducida: solo los 3 héroes y el rol más jugado. */
  compacto?: boolean;
  className?: string;
};

const cache = new Map<string, ResumenDota>();

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

  const { heroes, roles, rolesRecientes, winrateReciente, dotabuffUrl, ultimaPartida } = resumen;

  if (heroes.length === 0 && roles.length === 0 && !dotabuffUrl) return null;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* 3 héroes más jugados */}
      {heroes.length > 0 && (
        <div className="flex items-center gap-1" title={heroes.map((h) => `${h.nombre} (${h.partidas})`).join(' · ')}>
          {heroes.map((heroe) => (
            <span key={heroe.id} className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element -- icono de héroe del CDN de Valve */}
              <img
                src={heroe.imagen}
                alt={heroe.nombre}
                width={18}
                height={18}
                className="h-[18px] w-[18px] rounded-full bg-white/5 object-cover ring-1 ring-white/10"
                loading="lazy"
              />
            </span>
          ))}
          {!compacto && (
            <span className="truncate text-[10px] text-slate-400">
              {heroes[0].nombre}
            </span>
          )}
        </div>
      )}

      {/* Roles más jugados con su winrate */}
      {roles.length > 0 && (
        <p
          className="truncate text-[10px] text-slate-400"
          title={roles.map((r) => `${r.rol}: ${r.winrate}% (${r.partidas})`).join(' · ')}
        >
          {roles.map((rol) => `${rol.rol} ${rol.winrate}%`).join(' · ')}
        </p>
      )}

      {/* Roles de las últimas partidas */}
      {rolesRecientes.length > 0 && (
        <p
          className="truncate text-[10px] text-slate-500"
          title="Roles de sus últimas partidas"
        >
          Últimos: {rolesRecientes.join(' · ')}
        </p>
      )}

      {!compacto && winrateReciente !== null && (
        <p className="truncate text-[10px] text-slate-500">
          Últimas 10: <span className="text-slate-300">{winrateReciente}%</span>
          {ultimaPartida && (
            <span className={ultimaPartida.victoria ? 'text-emerald-300' : 'text-rose-300'}>
              {' · '}
              {ultimaPartida.victoria ? 'victoria' : 'derrota'}
            </span>
          )}
        </p>
      )}

      {dotabuffUrl && (
        <a
          href={dotabuffUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex w-fit items-center gap-0.5 text-[10px] font-semibold text-prism-300 transition hover:text-prism-200 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          Dotabuff
          <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  );
}
