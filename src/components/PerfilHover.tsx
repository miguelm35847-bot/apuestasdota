'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import MedallaMmr from '@/components/MedallaMmr';
import { etiquetaRol, ICONOS_ROL } from '@/lib/balance';
import type { RolDota } from '@/lib/types';

export type UsuarioHover = {
  id: string;
  nick?: string | null;
  steam_avatar_url?: string | null;
  steam_nombre?: string | null;
  mmr?: number | null;
  roles_preferidos?: RolDota[] | null;
  /** 1 = Radiant, 2 = Dire, null = lista de espera. Omitir en contextos sin sala. */
  equipo?: number | null;
};

type PerfilHoverProps = {
  usuario: UsuarioHover;
  children: ReactNode;
  className?: string;
};

/**
 * Tarjeta de información de jugador al pasar el cursor o enfocar su avatar.
 * Se renderiza en un portal para que no la recorten el scroll del chat ni
 * los contenedores con overflow-hidden de las salas.
 */
export default function PerfilHover({ usuario, children, className = '' }: PerfilHoverProps) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const nick = usuario.nick?.trim() || 'Usuario';
  const roles = usuario.roles_preferidos ?? [];
  const equipo =
    usuario.equipo === 1
      ? { texto: 'Radiant', clase: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' }
      : usuario.equipo === 2
        ? { texto: 'Dire', clase: 'bg-rose-500/10 text-rose-300 ring-rose-500/30' }
        : usuario.equipo === null
          ? { texto: 'En espera', clase: 'bg-slate-500/10 text-slate-300 ring-slate-500/30' }
          : null;

  const cancelarCierre = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const cerrarDiferido = useCallback(() => {
    cancelarCierre();
    closeTimer.current = setTimeout(() => {
      setAbierto(false);
      closeTimer.current = null;
    }, 140);
  }, [cancelarCierre]);

  const calcularPosicion = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const card = cardRef.current;
    const ancho = card?.offsetWidth ?? 264;
    const alto = card?.offsetHeight ?? 260;
    const margen = 12;

    let left = rect.left;
    if (left + ancho > window.innerWidth - margen) {
      left = window.innerWidth - ancho - margen;
    }
    left = Math.max(margen, left);

    let top = rect.bottom + 8;
    if (top + alto > window.innerHeight - margen) {
      const arriba = rect.top - alto - 8;
      top = arriba >= margen ? arriba : window.innerHeight - alto - margen;
    }
    top = Math.min(
      Math.max(margen, top),
      Math.max(margen, window.innerHeight - alto - margen)
    );

    setPos({ top, left });
  }, []);

  const abrir = useCallback(() => {
    cancelarCierre();

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const ancho = 264;
      const left = Math.min(
        Math.max(12, rect.left),
        Math.max(12, window.innerWidth - ancho - 12)
      );
      setPos({ top: rect.bottom + 8, left });
    }

    setAbierto(true);
  }, [cancelarCierre]);

  useEffect(() => {
    if (!abierto) return;

    const frame = requestAnimationFrame(calcularPosicion);
    const alDesplazar = () => calcularPosicion();

    window.addEventListener('scroll', alDesplazar, true);
    window.addEventListener('resize', alDesplazar);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', alDesplazar, true);
      window.removeEventListener('resize', alDesplazar);
    };
  }, [abierto, calcularPosicion]);

  useEffect(() => {
    if (!abierto) return;

    const alPresionar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [abierto]);

  useEffect(
    () => () => {
      cancelarCierre();
    },
    [cancelarCierre]
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={className}
        onMouseEnter={abrir}
        onMouseLeave={cerrarDiferido}
        onFocus={abrir}
        onBlur={(event) => {
          const destino = event.relatedTarget as Node | null;
          if (
            destino &&
            (triggerRef.current?.contains(destino) || cardRef.current?.contains(destino))
          ) {
            return;
          }
          cerrarDiferido();
        }}
      >
        {children}
      </div>

      {abierto &&
        pos &&
        createPortal(
          <div
            ref={cardRef}
            role="dialog"
            aria-label={`Información de ${nick}`}
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-[120] w-[264px] max-w-[calc(100vw-24px)] rounded-2xl border border-white/10 bg-[#111827] p-3.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.95)] ring-1 ring-inset ring-white/5"
            onMouseEnter={cancelarCierre}
            onMouseLeave={cerrarDiferido}
            onBlur={(event) => {
              const destino = event.relatedTarget as Node | null;
              if (destino && cardRef.current?.contains(destino)) return;
              cerrarDiferido();
            }}
          >
            <div className="flex items-start gap-3">
              <Avatar
                nick={nick}
                src={usuario.steam_avatar_url}
                size="lg"
                ringClass="ring-2 ring-white/15"
              />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate font-display text-sm font-bold text-white">{nick}</p>
                  {equipo && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset ${equipo.clase}`}
                    >
                      {equipo.texto}
                    </span>
                  )}
                </div>
                {usuario.steam_nombre && (
                  <p className="truncate text-[11px] text-slate-400">{usuario.steam_nombre}</p>
                )}
                <MedallaMmr mmr={usuario.mmr} size="sm" className="mt-1.5" />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {roles.length > 0 ? (
                roles.map((rol) => (
                  <span
                    key={rol}
                    className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-inset ring-white/10"
                  >
                    <span aria-hidden="true">{ICONOS_ROL[rol]}</span>
                    {etiquetaRol(rol)}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-slate-500">Sin roles preferidos</span>
              )}
            </div>

            <Link
              href={`/jugadores/${usuario.id}`}
              className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-prism-500/15 px-3 py-1.5 text-xs font-semibold text-prism-200 ring-1 ring-inset ring-prism-500/30 transition hover:bg-prism-500/25 hover:text-prism-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400"
            >
              Ver perfil público
              <span aria-hidden="true">→</span>
            </Link>
          </div>,
          document.body
        )}
    </>
  );
}
