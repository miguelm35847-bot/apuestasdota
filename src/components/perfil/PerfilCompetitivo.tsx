'use client';

import MedallaMmr from '@/components/MedallaMmr';
import { etiquetaRol, ICONOS_ROL, ROLES_DOTA } from '@/lib/balance';
import type { RolDota } from '@/lib/types';
import type { FormEvent } from 'react';

type PropsPerfilCompetitivo = {
  guardarPerfilDota: (event: FormEvent) => Promise<void>;
  mmrGuardado: boolean;
  mmr: string;
  setMmr: (valor: string) => void;
  rolesPreferidos: RolDota[];
  alternarRol: (rol: RolDota) => void;
  guardandoDota: boolean;
};

export function PerfilCompetitivo({
  guardarPerfilDota,
  mmrGuardado,
  mmr,
  setMmr,
  rolesPreferidos,
  alternarRol,
  guardandoDota,
}: PropsPerfilCompetitivo) {
  return (
    <section id="perfil-dota" className="mt-6 arena-card scroll-mt-24 rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-prism-500/15 text-prism-200 ring-1 ring-inset ring-prism-500/20">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
            <path d="M7 6H4v2a4 4 0 0 0 4 4" />
            <path d="M17 6h3v2a4 4 0 0 1-4 4" />
          </svg>
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-white">Perfil competitivo</h2>
          <p className="mt-1 text-sm text-slate-400">
            Tu MMR es público y lo ven los capitanes al elegir. Solo se puede registrar una
            vez; si necesitas corregirlo, contacta a un administrador. Los roles son opcionales.
          </p>
        </div>
      </div>

      <form onSubmit={guardarPerfilDota} className="mt-5">
        <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <div>
            <span className="text-sm font-medium text-slate-300">MMR</span>
            {mmrGuardado ? (
              <div className="mt-1 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
                <MedallaMmr
                  mmr={mmr.trim() === '' ? null : Number(mmr)}
                  size="sm"
                  mostrarNombre={false}
                />
                <span className="font-display text-2xl font-bold tabular-nums text-white">
                  {mmr || '—'}
                </span>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  Bloqueado
                </span>
              </div>
            ) : (
              <input
                type="number"
                min={0}
                max={20000}
                step={1}
                value={mmr}
                onChange={(e) => setMmr(e.target.value)}
                placeholder="Ej: 4500"
                aria-label="MMR"
                className="mt-1 block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
              />
            )}
            <p className="mt-2 text-xs text-slate-400">
              {mmrGuardado
                ? 'El MMR solo se registra una vez. Si necesitas corregirlo, contacta a un administrador.'
                : 'Ingresa tu MMR actual (0 a 20000).'}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-300">
              Preferencias de rol{' '}
              <span className="font-normal text-slate-400">(opcional, hasta 3 en orden)</span>
            </p>
            <div role="group" aria-label="Preferencias de rol" className="mt-2 flex flex-wrap gap-2">
              {ROLES_DOTA.map((rol) => {
                const posicion = rolesPreferidos.indexOf(rol.id);
                const seleccionado = posicion >= 0;
                return (
                  <button
                    key={rol.id}
                    type="button"
                    onClick={() => alternarRol(rol.id)}
                    aria-pressed={seleccionado}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-500/40 ${seleccionado
                      ? 'border-prism-400 bg-prism-500/20 text-prism-100'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                  >
                    <span aria-hidden="true">{ICONOS_ROL[rol.id]}</span>
                    <span>
                      {seleccionado ? `${posicion + 1}. ` : ''}
                      {rol.nombre}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Orden actual:{' '}
              {rolesPreferidos.length > 0
                ? rolesPreferidos.map((rol, i) => `${i + 1}. ${etiquetaRol(rol)}`).join(' → ')
                : 'ninguno'}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={guardandoDota}
            className="w-full rounded-lg bg-prism-500 px-6 py-2.5 font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:opacity-50 sm:w-auto"
          >
            {guardandoDota ? 'Guardando...' : mmrGuardado ? 'Guardar roles' : 'Guardar perfil'}
          </button>
          {!mmrGuardado && (
            <p className="text-xs text-slate-400">
              El MMR quedará bloqueado después de guardarlo.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
