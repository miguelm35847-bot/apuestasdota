'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import SteamIcon from '@/components/SteamIcon';
import {
  playerLinksFromSteamId,
  type PlayerLinks as PlayerLinksData,
} from '@/lib/playerLinks';

type PlayerLinksProps = {
  /** Perfil cuyo Steam se consulta en el servidor. */
  userId?: string;
  /** Si ya se conoce el SteamID64, evita la consulta. */
  steamId?: string | null;
  className?: string;
  tamano?: 'sm' | 'md';
};

const TAMANOS = {
  sm: {
    boton: 'h-7 w-7',
    steam: 'h-3.5 w-3.5',
    dotabuff: 14,
    dotabuffClase: 'h-3.5 w-3.5 rounded-[3px]',
  },
  md: {
    boton: 'h-8 w-8',
    steam: 'h-4 w-4',
    dotabuff: 16,
    dotabuffClase: 'h-4 w-4 rounded-[3px]',
  },
};

const CLASE_BOTON =
  'inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400/60';

function urlSegura(valor: unknown, host: string): string | null {
  if (typeof valor !== 'string') return null;

  try {
    const url = new URL(valor);
    if (url.protocol !== 'https:' || url.hostname !== host) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Enlaces externos de Steam y Dotabuff con formato de icono.
 * Se oculta por completo si el jugador no tiene Steam vinculado.
 */
export default function PlayerLinks({
  userId,
  steamId,
  className = '',
  tamano = 'sm',
}: PlayerLinksProps) {
  const directos = steamId !== undefined ? playerLinksFromSteamId(steamId) : null;
  const [remotos, setRemotos] = useState<{ id: string; links: PlayerLinksData } | null>(null);

  useEffect(() => {
    if (steamId !== undefined || !userId) return;

    let activo = true;

    fetch(`/api/jugadores/${encodeURIComponent(userId)}/links`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json().catch(() => null)) as
          | { steamUrl?: unknown; dotabuffUrl?: unknown }
          | null;
        return {
          steamUrl: urlSegura(data?.steamUrl, 'steamcommunity.com'),
          dotabuffUrl: urlSegura(data?.dotabuffUrl, 'www.dotabuff.com'),
        } satisfies PlayerLinksData;
      })
      .then((links) => {
        if (activo) setRemotos(links ? { id: userId, links } : null);
      })
      .catch(() => {
        if (activo) setRemotos(null);
      });

    return () => {
      activo = false;
    };
  }, [steamId, userId]);

  const links =
    steamId !== undefined
      ? directos
      : remotos && remotos.id === userId
        ? remotos.links
        : null;

  if (!links || (!links.steamUrl && !links.dotabuffUrl)) return null;

  const clases = TAMANOS[tamano];

  return (
    <div className={`flex items-center gap-1.5 ${className}`.trim()}>
      {links.steamUrl && (
        <a
          href={links.steamUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir perfil de Steam"
          title="Ver perfil de Steam"
          className={`${CLASE_BOTON} ${clases.boton} text-[#66c0f4]`}
        >
          <SteamIcon className={clases.steam} />
        </a>
      )}
      {links.dotabuffUrl && (
        <a
          href={links.dotabuffUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir perfil de Dotabuff"
          title="Ver perfil de Dotabuff"
          className={`${CLASE_BOTON} ${clases.boton}`}
        >
          <Image
            src="/dotabuff.png"
            alt=""
            width={clases.dotabuff}
            height={clases.dotabuff}
            className={clases.dotabuffClase}
          />
        </a>
      )}
    </div>
  );
}
