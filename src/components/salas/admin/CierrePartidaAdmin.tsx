'use client';

import type { DotaMatch } from '@/lib/types';
import type { ChangeEvent } from 'react';
import type { Confirmacion } from './tipos';

type PropsCierrePartidaAdmin = {
  autoCierre: boolean;
  cambiarAutoCierre: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  revisarCierreAuto: () => Promise<void>;
  detectando: boolean;
  estadoDeteccion: string | null;
  dotaMatchId: string;
  setDotaMatchId: (valor: string) => void;
  asociarPartida: () => Promise<void>;
  verificando: boolean;
  datosPartida: DotaMatch | null;
  setEquipoGanador: (valor: string) => void;
  equipoGanador: string;
  setConfirmacion: (valor: Confirmacion | null) => void;
  terminando: boolean;
  setDatosPartida: (valor: DotaMatch | null) => void;
};

export function CierrePartidaAdmin({
  autoCierre,
  cambiarAutoCierre,
  revisarCierreAuto,
  detectando,
  estadoDeteccion,
  dotaMatchId,
  setDotaMatchId,
  asociarPartida,
  verificando,
  datosPartida,
  setEquipoGanador,
  equipoGanador,
  setConfirmacion,
  terminando,
  setDatosPartida,
}: PropsCierrePartidaAdmin) {
  return (
    <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-bold text-white">Terminar partida</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Asocia el ID exacto y verifica el resultado. Auto valida todos los jugadores y sus lados antes de pagar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300">
            <input
              type="checkbox"
              checked={autoCierre}
              onChange={cambiarAutoCierre}
              className="h-3.5 w-3.5 accent-emerald-500"
            />
            Auto
          </label>
          <button
            onClick={() => void revisarCierreAuto()}
            disabled={detectando}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            {detectando ? 'Buscando…' : 'Detectar ahora'}
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-400">
        <span
          className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${detectando ? 'animate-pulse bg-amber-400' : autoCierre ? 'bg-emerald-400' : 'bg-slate-500'
            }`}
        />
        <span>
          {detectando
            ? 'Buscando la partida en Steam…'
            : !autoCierre
              ? 'Detección automática desactivada.'
              : estadoDeteccion ??
              'Detección automática activa: revisa cada 60 segundos.'}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] text-slate-400">
        ¿Lobby personalizado/practice sin ticket? Steam no lo expone en su API.
        Elige el ganador y confirma manualmente; no se guardarán duración ni marcador.
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-300">
            ID exacto de la partida de Dota 2 (necesario para Auto)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min="1"
              value={dotaMatchId}
              onChange={(e) => setDotaMatchId(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
              placeholder="Ej: 7654321098"
            />
            <button
              onClick={asociarPartida}
              disabled={verificando || !dotaMatchId}
              className="rounded-lg bg-prism-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-prism-400 disabled:opacity-50"
            >
              {verificando ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Lo encuentras en Dotabuff o en tu perfil de Dota 2.
          </p>
        </div>

        {datosPartida && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-200 sm:grid-cols-3">
            <p>
              <span className="text-slate-400">Ganador:</span>{' '}
              {datosPartida.radiant_win ? 'Radiant' : 'Dire'}
            </p>
            <p>
              <span className="text-slate-400">Duración:</span>{' '}
              {Math.floor(datosPartida.duration / 60)}m {datosPartida.duration % 60}s
            </p>
            <p>
              <span className="text-slate-400">Puntuación:</span>{' '}
              {datosPartida.radiant_score} - {datosPartida.dire_score}
            </p>
            {datosPartida.fuente && (
              <p className="col-span-2 text-[11px] text-slate-400 sm:col-span-3">
                Datos obtenidos vía{' '}
                {datosPartida.fuente === 'opendota' ? 'OpenDota' : 'Steam'}.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300">
            Equipo ganador (se llena automáticamente al verificar)
          </label>
          <div className="mt-1 flex gap-2">
            <button
              onClick={() => setEquipoGanador('1')}
              className={`flex-1 rounded-md border py-1.5 text-sm font-semibold transition ${equipoGanador === '1'
                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
            >
              Radiant
            </button>
            <button
              onClick={() => setEquipoGanador('2')}
              className={`flex-1 rounded-md border py-1.5 text-sm font-semibold transition ${equipoGanador === '2'
                ? 'border-rose-400/30 bg-rose-500/15 text-rose-100'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
            >
              Dire
            </button>
          </div>
        </div>

        {!datosPartida && (
          <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
            Sin verificación automática: se cerrará con el ganador que elijas manualmente.
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setConfirmacion({ tipo: 'terminar' })}
            disabled={terminando || !dotaMatchId || !equipoGanador}
            className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
          >
            {terminando
              ? 'Cerrando...'
              : datosPartida
                ? 'Confirmar y terminar'
                : 'Cerrar con ganador manual'}
          </button>
          <button
            onClick={() => {
              setDotaMatchId('');
              setEquipoGanador('');
              setDatosPartida(null);
            }}
            className="flex-1 rounded-lg bg-white/5 py-2 text-sm text-slate-300 transition hover:bg-white/10"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
