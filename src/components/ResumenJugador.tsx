'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ResumenDota } from '@/lib/dotaResumen';

type Props = {
  userId: string;
  /** Muestra solo el héroe y el rol (para espacios pequeños). */
  compacto?: boolean;
  className?: string;
};

const cache = new Map<string, ResumenDota>();

/**
 * Datos destacados de un jugador dentro de la sala: héroe y rol más jugados
 * y winrate reciente, con enlace a su Dotabuff.
 *
 * Viene de la API pública de OpenDota (la fuente de Dotabuff). Si el jugador
 * no tiene partidas públicas, no se muestra nada.
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

  const { heroeFavorito, rolFavorito, winrateReciente, dotabuffUrl, ultimaPartida } = resumen;

  if (!heroeFavorito && !rolFavorito && !dotabuffUrl) return null;

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400 ${className}`}>
      {heroeFavorito && (
        <span className="inline-flex items-center gap-1" title={`${heroeFavorito.nombre}: ${heroeFavorito.partidas} partidas`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- icono de héroe del CDN de Valve */}
          <img
            src={heroeFavorito.imagen}
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 shrink-0 rounded-full bg-white/5 object-cover"
            loading="lazy"
          />
          <span className="text-slate-300">{heroeFavorito.nombre}</span>
        </span>
      )}

      {rolFavorito && (
        <span title={`${rolFavorito.partidas} partidas en ese rol`}>
          {rolFavorito.rol} · {rolFavorito.winrate}%
        </span>
      )}

      {!compacto && winrateReciente !== null && (
        <span title="Winrate de las últimas 10 partidas públicas">Últ. 10: {winrateReciente}%</span>
      )}

      {!compacto && ultimaPartida && (
        <span
          className={ultimaPartida.victoria ? 'text-emerald-300' : 'text-rose-300'}
          title={`Última partida: ${ultimaPartida.heroe}`}
        >
          Última: {ultimaPartida.victoria ? 'victoria' : 'derrota'}
        </span>
      )}

      {dotabuffUrl && (
        <a
          href={dotabuffUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-0.5 font-semibold text-prism-300 transition hover:text-prism-200 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          Dotabuff
          <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  );
}
