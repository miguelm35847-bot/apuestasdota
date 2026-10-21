'use client';

import { useEffect, useState } from 'react';
import { dotabuffPlayerUrl } from '@/lib/dotabuff';

type DotabuffLinkProps = {
  /** Perfil cuyo Steam se consulta en el servidor. */
  userId?: string;
  /** Si ya se conoce el SteamID64, evita la consulta. */
  steamId?: string | null;
  className?: string;
  compact?: boolean;
};

function clases(compact: boolean) {
  return compact
    ? 'inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white'
    : 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white';
}

export default function DotabuffLink({
  userId,
  steamId,
  className = '',
  compact = false,
}: DotabuffLinkProps) {
  const directa = steamId !== undefined ? dotabuffPlayerUrl(steamId) : null;
  const [remota, setRemota] = useState<{ id: string; url: string | null } | null>(null);

  useEffect(() => {
    if (steamId !== undefined || !userId) return;

    let activo = true;

    fetch(`/api/jugadores/${encodeURIComponent(userId)}/dotabuff`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json().catch(() => null)) as { url?: unknown } | null;
        return typeof data?.url === 'string' ? data.url : null;
      })
      .then((url) => {
        if (activo) setRemota({ id: userId, url });
      })
      .catch(() => {
        if (activo) setRemota({ id: userId, url: null });
      });

    return () => {
      activo = false;
    };
  }, [steamId, userId]);

  const url = steamId !== undefined ? directa : remota && remota.id === userId ? remota.url : null;
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir perfil en Dotabuff"
      title="Abrir perfil en Dotabuff"
      className={`${clases(compact)} ${className}`}
    >
      <svg
        className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 3h7v7" />
        <path d="M10 14 21 3" />
        <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
      </svg>
      Dotabuff
    </a>
  );
}
