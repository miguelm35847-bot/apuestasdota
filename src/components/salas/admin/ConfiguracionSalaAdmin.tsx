'use client';

import ChatPanel from '@/components/ChatPanel';
import type { Lobby, Participante, Sala } from '@/lib/types';

type PropsConfiguracionSalaAdmin = {
  listos: number;
  participantes: Participante[];
  verificacionEstado: string;
  pedirVerificacion: () => Promise<void>;
  pidiendoVerificacion: boolean;
  sala: Sala;
  cancelarVerificacion: () => Promise<void>;
  tocaElegirCapitanes: boolean;
  lobbyNombre: string;
  setLobbyNombre: (valor: string) => void;
  lobbyClave: string;
  setLobbyClave: (valor: string) => void;
  ponerEnJuego: () => Promise<void>;
  saving: boolean;
  picksEstado: NonNullable<Sala['picks_estado']>;
  lobby: Lobby | null;
  salaId: string;
};

export function ConfiguracionSalaAdmin({
  listos,
  participantes,
  verificacionEstado,
  pedirVerificacion,
  pidiendoVerificacion,
  sala,
  cancelarVerificacion,
  tocaElegirCapitanes,
  lobbyNombre,
  setLobbyNombre,
  lobbyClave,
  setLobbyClave,
  ponerEnJuego,
  saving,
  picksEstado,
  lobby,
  salaId,
}: PropsConfiguracionSalaAdmin) {
  return (
    <div className="space-y-4">
      <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-white">Verificación</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Avisa a todos que están listos. Solo informa: no bloquea el inicio.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold tabular-nums text-slate-300 ring-1 ring-inset ring-white/10">
            {listos}/{participantes.length}
          </span>
        </div>

        {verificacionEstado === 'inactiva' && (
          <>
            <button
              onClick={pedirVerificacion}
              disabled={pidiendoVerificacion || participantes.length === 0}
              className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              {pidiendoVerificacion ? 'Enviando...' : 'Pedir "Estoy listo"'}
            </button>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Puedes pedirla ahora mismo, con la sala incompleta ({participantes.length}/
              {sala.cupo}): los que ya están reciben el aviso y los que entren después también.
            </p>
          </>
        )}

        {verificacionEstado === 'pendiente' && (
          <>
            <p className="mt-2 text-xs text-amber-200">
              Esperando confirmaciones: <strong>{listos}</strong> de {participantes.length}{' '}
              listos. Los que confirmaron tienen ✓ en su slot.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={pedirVerificacion}
                disabled={pidiendoVerificacion}
                className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                Volver a pedir
              </button>
              <button
                onClick={cancelarVerificacion}
                disabled={pidiendoVerificacion}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </>
        )}

        {verificacionEstado === 'completa' && (
          <>
            <p className="mt-2 text-xs text-emerald-200">
              Todos los jugadores confirmaron que están listos ({listos}/
              {participantes.length}).
            </p>
            {tocaElegirCapitanes && (
              <p className="mt-1 text-xs text-emerald-300">
                Siguiente paso: elige a los dos capitanes en <strong>Equipos → Fase de picks</strong>{' '}
                y guarda para lanzar la moneda.
              </p>
            )}
            <button
              onClick={pedirVerificacion}
              disabled={pidiendoVerificacion}
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              Pedir de nuevo
            </button>
          </>
        )}
      </div>

      <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft">
        <h2 className="font-display text-base font-bold text-white">Lobby</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Nombre y clave que verán los jugadores al poner en juego.
        </p>

        <div className="mt-3 space-y-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-300">Nombre del lobby</span>
            <input
              type="text"
              value={lobbyNombre}
              onChange={(e) => setLobbyNombre(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
              placeholder="Ej: Sala Pro 5v5"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-300">Clave del lobby</span>
            <input
              type="text"
              value={lobbyClave}
              onChange={(e) => setLobbyClave(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
              placeholder="Ej: abc123"
            />
          </label>
        </div>

        <button
          onClick={ponerEnJuego}
          disabled={saving || picksEstado === 'eleccion' || picksEstado === 'en_curso'}
          className="mt-3 w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving
            ? 'Guardando...'
            : sala.estado === 'en_juego'
              ? 'Actualizar datos del lobby'
              : 'Guardar cambios y poner en juego'}
        </button>
        {picksEstado === 'eleccion' || picksEstado === 'en_curso' ? (
          <p className="mt-1.5 text-[11px] text-amber-300">
            Termina la fase de picks para poner la partida en juego.
          </p>
        ) : null}
        <p className="mt-1.5 text-[11px] text-slate-400">
          {sala.estado === 'en_juego'
            ? 'Puedes corregir el nombre o la clave.'
            : 'Al guardar, la sala pasa a «en juego» y se avisa a los jugadores.'}
        </p>
        {lobby && (
          <div className="mt-2 rounded-lg border border-prism-500/20 bg-prism-500/[0.08] px-2.5 py-2 text-[11px] text-prism-200">
            <span className="font-semibold">Publicado:</span> {lobby.nombre} · Clave{' '}
            {lobby.clave}
          </div>
        )}
      </div>

      <ChatPanel
        salaId={salaId}
        titulo="Chat de la sala"
        descripcion="Coordina con los jugadores"
        altura="h-[340px]"
      />
    </div>
  );
}
