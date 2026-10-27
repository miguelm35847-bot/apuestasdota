'use client';

import type { Participante, Sala } from '@/lib/types';
import Image from 'next/image';
import type { Confirmacion } from './tipos';

type PropsCabeceraSalaAdmin = {
  editandoNombre: boolean;
  guardarNombreSala: () => Promise<void>;
  nombreSala: string;
  setNombreSala: (valor: string) => void;
  guardandoNombre: boolean;
  setEditandoNombre: (valor: boolean) => void;
  sala: Sala;
  setError: (valor: string | null) => void;
  setSuccess: (valor: string | null) => void;
  alternarDestacada: () => Promise<void>;
  destacando: boolean;
  setConfirmacion: (valor: Confirmacion | null) => void;
  participantes: Participante[];
  picksEstado: NonNullable<Sala['picks_estado']>;
};

export function CabeceraSalaAdmin({
  editandoNombre,
  guardarNombreSala,
  nombreSala,
  setNombreSala,
  guardandoNombre,
  setEditandoNombre,
  sala,
  setError,
  setSuccess,
  alternarDestacada,
  destacando,
  setConfirmacion,
  participantes,
  picksEstado,
}: PropsCabeceraSalaAdmin) {
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editandoNombre ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void guardarNombreSala();
            }}
            className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
          >
            <Image
              src="/dota2.svg"
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
            />
            <input
              value={nombreSala}
              onChange={(event) => setNombreSala(event.target.value)}
              maxLength={60}
              autoFocus
              aria-label="Nombre de la sala"
              placeholder="Nombre de la sala"
              className="min-w-0 flex-1 rounded-lg border border-prism-500/40 bg-white/5 px-2.5 py-1.5 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-prism-400 focus:outline-none sm:max-w-sm"
            />
            <button
              type="submit"
              disabled={guardandoNombre}
              className="rounded-lg bg-prism-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-prism-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardandoNombre ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setEditandoNombre(false)}
              disabled={guardandoNombre}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar edición
            </button>
          </form>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <Image
              src="/dota2.svg"
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
            />
            <h1 className="min-w-0 truncate font-display text-lg font-bold text-white">
              {sala.nombre}
            </h1>
            <button
              type="button"
              onClick={() => {
                setNombreSala(sala.nombre);
                setError(null);
                setSuccess(null);
                setEditandoNombre(true);
              }}
              className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10"
              title="Cambiar el nombre de la sala"
            >
              <span aria-hidden="true">✎</span> Cambiar nombre
            </button>
            <button
              type="button"
              onClick={() => void alternarDestacada()}
              disabled={destacando}
              className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${sala.destacada
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              title={
                sala.destacada
                  ? 'Quitar esta sala de la portada'
                  : 'Mostrar esta sala en la portada'
              }
            >
              {destacando
                ? 'Guardando…'
                : sala.destacada
                  ? '★ Quitar destacada'
                  : '☆ Destacar'}
            </button>
          </div>
        )}
        <button
          onClick={() => setConfirmacion({ tipo: 'cancelar' })}
          className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15"
        >
          Cancelar sala
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-prism-500/15 px-2.5 py-1 font-bold text-prism-200 ring-1 ring-inset ring-prism-500/30">
          {sala.modalidad ?? (sala.cupo === 2 ? '1v1' : '5v5')}
        </span>
        {sala.destacada && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-bold text-amber-200 ring-1 ring-inset ring-amber-500/30">
            ★ Destacada en landing
          </span>
        )}
        <span className="rounded-full bg-white/5 px-2.5 py-1 font-semibold text-slate-300 ring-1 ring-inset ring-white/10">
          {sala.estado === 'abierta'
            ? 'Abierta'
            : sala.estado === 'llena'
              ? 'Llena'
              : 'En juego'}
        </span>
        <span className="text-slate-400">
          {participantes.length}/{sala.cupo} jugadores
        </span>
        {sala.cupo === 10 && (
          <span
            className={`rounded-full px-2.5 py-1 font-semibold ring-1 ring-inset ${picksEstado === 'terminado'
              ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
              : picksEstado === 'inactivo'
                ? 'bg-white/5 text-slate-400 ring-white/10'
                : 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
              }`}
          >
            {picksEstado === 'inactivo'
              ? 'Picks sin iniciar'
              : picksEstado === 'eleccion'
                ? 'Moneda / elección'
                : picksEstado === 'en_curso'
                  ? `Pick ${participantes.filter((p) => p.equipo !== null && !p.es_capitan).length + 1}/8`
                  : 'Picks completados'}
          </span>
        )}
      </div>
    </div>
  );
}
