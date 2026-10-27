'use client';

import Avatar from '@/components/Avatar';
import PlayerLinks from '@/components/PlayerLinks';
import SteamIcon from '@/components/SteamIcon';
import { etiquetaCuenta } from '@/lib/acceso';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { IconoPestana } from './PerfilUI';
import type { ConteosPerfil } from './tipos';

type PropsCabeceraPerfil = {
  nick: string | null;
  steamAvatar: string | null;
  perfilCompleto: boolean;
  user: User | null;
  steamId: string | null;
  steamNombre: string | null;
  handleActualizarSteam: () => Promise<void>;
  actualizandoSteam: boolean;
  handleVincularSteam: () => Promise<void>;
  saldo: number | null;
  conteos: ConteosPerfil;
};

export function CabeceraPerfil({
  nick,
  steamAvatar,
  perfilCompleto,
  user,
  steamId,
  steamNombre,
  handleActualizarSteam,
  actualizandoSteam,
  handleVincularSteam,
  saldo,
  conteos,
}: PropsCabeceraPerfil) {
  return (
    <section id="steam" className="arena-card relative scroll-mt-24 overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-arena-soft">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(99,102,241,0.14),transparent_55%)]"
      />
      <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar nick={nick} src={steamAvatar} size="xl" ringClass="ring-2 ring-white/20" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-white">{nick || 'Jugador'}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${perfilCompleto
                  ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
                  }`}
              >
                {perfilCompleto ? 'MMR listo' : 'Falta tu MMR'}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-slate-400">{etiquetaCuenta(user)}</p>
            {user && (
              <Link
                href={`/jugadores/${user.id}`}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-prism-500/20 bg-prism-500/10 px-3 py-1 text-xs font-semibold text-prism-200 transition hover:border-prism-400/40 hover:bg-prism-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-500/40"
              >
                Ver mi perfil público
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7" />
                  <path d="M8 7h9v9" />
                </svg>
              </Link>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${steamId
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
              >
                <SteamIcon className="h-3.5 w-3.5 shrink-0 text-[#66c0f4]" />
                <span className="max-w-[170px] truncate">
                  {steamId
                    ? steamNombre
                      ? `Steam: ${steamNombre}`
                      : 'Steam vinculado'
                    : 'Steam sin vincular'}
                </span>
              </span>
              {steamId ? (
                <button
                  onClick={handleActualizarSteam}
                  disabled={actualizandoSteam}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Actualizar datos de Steam"
                >
                  <SteamIcon className="h-3.5 w-3.5 text-[#66c0f4]" />
                  {actualizandoSteam ? 'Actualizando...' : 'Actualizar'}
                </button>
              ) : (
                <button
                  onClick={handleVincularSteam}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1b2838] px-3 py-1 font-semibold text-white ring-1 ring-inset ring-[#66c0f4]/40 shadow-[0_6px_18px_-10px_rgba(102,192,244,0.9)] transition hover:bg-[#2a475e] hover:ring-[#66c0f4]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66c0f4]/50"
                >
                  <SteamIcon className="h-3.5 w-3.5 text-[#66c0f4]" />
                  Vincular con Steam
                </button>
              )}
              <PlayerLinks steamId={steamId} tamano="md" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300/80">
                Saldo disponible
              </p>
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              />
            </div>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-emerald-300">
              {saldo !== null ? `S/ ${(saldo / 100).toFixed(2)}` : '...'}
            </p>
            <p className="mt-1 text-xs text-slate-400">Listo para jugar o retirar.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/recargar"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
            >
              Recargar
            </Link>
            <Link
              href="/retirar"
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-500/40"
            >
              Retirar
            </Link>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-white/[0.02]">
        {[
          { label: 'Partidas', valor: conteos.partidas, icono: 'historial' as const },
          { label: 'Solicitudes', valor: conteos.movimientos, icono: 'movimientos' as const },
          { label: 'Movimientos', valor: conteos.billetera, icono: 'billetera' as const },
        ].map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4"
          >
            <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-400 sm:flex">
              <IconoPestana id={item.icono} className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-[11px]">
                {item.label}
              </p>
              <p className="font-display text-xl font-bold tabular-nums text-white sm:text-2xl">
                {item.valor}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
