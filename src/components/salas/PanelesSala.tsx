'use client';

import {
  ICONOS_ROL,
  ROLES_DOTA
} from '@/lib/balance';
import type { Lobby, Participante, RolDota, Sala } from '@/lib/types';

const estadoTexto: Record<string, string> = {
  abierta: 'Abierta',
  llena: 'Llena',
  en_juego: 'En juego',
  terminada: 'Terminada',
  cancelada: 'Cancelada',
};

type PropsCabeceraSala = {
  sala: Sala;
  participantes: Participante[];
  pozo: number;
  premio: number;
  compartirSala: () => Promise<void>;
  copiado: string | null;
};

export function CabeceraSala({
  sala,
  participantes,
  pozo,
  premio,
  compartirSala,
  copiado,
}: PropsCabeceraSala) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-arena-soft">
      <div className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
            <span>Sala {sala.modalidad ?? (sala.cupo === 2 ? '1v1' : '5v5')}</span>
            <span>•</span>
            <span>{estadoTexto[sala.estado] ?? sala.estado}</span>
          </div>
          <h1 className="mt-0.5 text-lg font-bold text-white">{sala.nombre}</h1>
          <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-white">
              Cuota S/ {(sala.cuota / 100).toFixed(2)}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-white">
              {participantes.length}/{sala.cupo} jugadores
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-white">
              Comisión {sala.comision_bp / 100}%
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 sm:min-w-[190px]">
          <div className="rounded-xl bg-white/10 px-3 py-1.5 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-300">Pozo total</p>
            <p className="text-lg font-bold text-white">S/ {(pozo / 100).toFixed(2)}</p>
            <p className="text-[11px] text-slate-300">
              S/ {(premio / 100).toFixed(2)} por ganador
            </p>
          </div>
          <button
            onClick={compartirSala}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            {copiado === 'sala' ? 'Enlace copiado' : 'Compartir sala'}
          </button>
        </div>
      </div>
    </section>
  );
}

type PropsRolesSala = {
  rolesSala: RolDota[];
  alternarRolSala: (rol: RolDota) => void;
  puedeEditarRoles: boolean;
  guardandoRoles: boolean;
};

export function RolesSala({
  rolesSala,
  alternarRolSala,
  puedeEditarRoles,
  guardandoRoles,
}: PropsRolesSala) {
  return (
    <section className="arena-card flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/10 bg-[#111827] px-3 py-2 shadow-arena-soft">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">Mis roles</span>
        <span className="text-[11px] text-slate-500">hasta 3, en orden</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
          {rolesSala.length}/3
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ROLES_DOTA.map((rol) => {
          const activo = rolesSala.includes(rol.id);
          const orden = rolesSala.indexOf(rol.id) + 1;
          return (
            <button
              key={rol.id}
              type="button"
              onClick={() => alternarRolSala(rol.id)}
              disabled={!puedeEditarRoles}
              aria-pressed={activo}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${activo
                ? 'border-prism-400 bg-prism-500/15 text-prism-200'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
            >
              <span aria-hidden="true">{ICONOS_ROL[rol.id]}</span>
              <span>{rol.nombre}</span>
              {activo && (
                <span className="rounded-full bg-prism-500 px-1.5 text-[9px] font-bold text-white">
                  {orden}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <span className="ml-auto text-[11px] text-slate-500">
        {!puedeEditarRoles
          ? 'Bloqueado durante picks/partida'
          : guardandoRoles
            ? 'Guardando…'
            : 'Se guarda automáticamente'}
      </span>
    </section>
  );
}

type PropsLobbySala = {
  sala: Sala;
  lobby: Lobby;
  copiar: (texto: string, campo: string) => Promise<void>;
  copiado: string | null;
};

export function LobbySala({
  sala,
  lobby,
  copiar,
  copiado,
}: PropsLobbySala) {
  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-r from-prism-700 to-prism-600 p-4 text-white shadow-arena-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-prism-200">
            {sala.estado === 'terminada' ? 'Partida finalizada' : 'Partida en curso'}
          </p>
          <h2 className="font-display text-xl font-bold">Lobby de Dota 2</h2>
        </div>
        <a
          href="steam://run/570"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          Abrir Dota 2
        </a>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-white/10 p-4">
          <p className="text-xs text-prism-200">Nombre del lobby</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="break-all text-lg font-bold">{lobby.nombre}</p>
            <button
              onClick={() => copiar(lobby.nombre, 'nombre')}
              className="shrink-0 rounded bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
            >
              {copiado === 'nombre' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white/10 p-4">
          <p className="text-xs text-prism-200">Clave del lobby</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="break-all text-lg font-bold">{lobby.clave}</p>
            <button
              onClick={() => copiar(lobby.clave, 'clave')}
              className="shrink-0 rounded bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
            >
              {copiado === 'clave' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-prism-100">
        Entra a Dota 2, busca el lobby con estos datos y únete. El admin enviará la invitación
        dentro del juego.
      </p>
    </section>
  );
}
