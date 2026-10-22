'use client';

import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';
import VivoMarcador from '@/components/VivoMarcador';
import VivoJugador from '@/components/VivoJugador';
import PartidaDetalle from '@/components/PartidaDetalle';
import type { PartidaViva } from '@/lib/vivo';
import { partidaVivaMock } from '@/lib/vivoMock';

/**
 * Vista previa de la partida en vivo.
 *
 * Es un mockup con datos de ejemplo: sirve para revisar el diseño antes de
 * conectar la API de Valve (que solo publica partidas de liga/torneo).
 */

const PARTIDA = partidaVivaMock(
  [
    { user_id: 'demo-1', equipo: 1, profiles: { nick: 'mik', mmr: 5480 } },
    { user_id: 'demo-2', equipo: 1, profiles: { nick: 'asdfbhbwnef', mmr: 4700 } },
    { user_id: 'demo-3', equipo: 1, profiles: { nick: 'Kchaprras', mmr: 3900 } },
    { user_id: 'demo-4', equipo: 1, profiles: { nick: 'Polar', mmr: 3400 } },
    { user_id: 'demo-5', equipo: 1, profiles: { nick: 'Musulman', mmr: 2600 } },
    { user_id: 'demo-6', equipo: 2, profiles: { nick: 'Yunois', mmr: 2050 } },
    { user_id: 'demo-7', equipo: 2, profiles: { nick: 'qa-p1', mmr: 1600 } },
    { user_id: 'demo-8', equipo: 2, profiles: { nick: 'qa-p2', mmr: 1200 } },
    { user_id: 'demo-9', equipo: 2, profiles: { nick: 'qa-p3', mmr: 900 } },
    { user_id: 'demo-10', equipo: 2, profiles: { nick: 'qa-p4', mmr: 400 } },
  ],
  1421
) as PartidaViva;

export default function DemoVivoPage() {
  useArenaBody();

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Vista previa: partida en vivo" />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <header>
          <h1 className="font-display text-2xl font-bold text-white">Partida en vivo (mockup)</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Así se vería una partida en vivo cuando Valve apruebe la liga: el marcador y los
            héroes con sus estadísticas. Los datos de aquí son de ejemplo.
          </p>
        </header>

        <section className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft">
          <h2 className="font-display text-base font-bold text-white">1. Sala destacada (hero del landing)</h2>
          <p className="mt-1 text-xs text-slate-400">
            Una franja fina con el score, el reloj y los 10 héroes con sus kills.
          </p>

          <div className="mt-4 max-w-md rounded-2xl border border-white/10 bg-[#0a0f17] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                  Sala destacada
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-white">
                  Sala Principal - Sin Comisión
                </h3>
                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  5 vs 5 · 10/10 jugadores
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                En juego
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3.5 py-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  Cuota
                </p>
                <p className="mt-1 font-display text-lg font-bold text-white">S/ 10.00</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3.5 py-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  Premio por ganador
                </p>
                <p className="mt-1 font-display text-lg font-bold text-amber-300">S/ 20.00</p>
              </div>
            </div>

            <div className="mt-4">
              <VivoMarcador partida={PARTIDA} compacto />
            </div>
          </div>
        </section>

        <section className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft">
          <h2 className="font-display text-base font-bold text-white">2. Dentro de la sala</h2>
          <p className="mt-1 text-xs text-slate-400">
            El marcador arriba y, en cada slot, el héroe del jugador con su K/D/A.
          </p>

          <div className="mt-4 max-w-md">
            <VivoMarcador partida={PARTIDA} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { titulo: 'Radiant', equipo: PARTIDA.radiant, tono: 'emerald' },
              { titulo: 'Dire', equipo: PARTIDA.dire, tono: 'rose' },
            ].map((equipo) => (
              <div key={equipo.titulo} className="arena-card rounded-2xl border border-white/10 bg-[#0a0f17] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
                    {equipo.titulo}
                  </p>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-bold text-slate-300">
                    {equipo.equipo.jugadores.length}/5
                  </span>
                </div>

                <ul className="mt-2 space-y-1.5">
                  {equipo.equipo.jugadores.map((jugador) => (
                    <li
                      key={jugador.accountId}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-[11px] font-bold text-slate-300">
                        {jugador.nick.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-100">{jugador.nick}</p>
                        <p className="truncate text-[10px] text-slate-500">{jugador.heroNombre}</p>
                      </div>
                      <VivoJugador jugador={jugador} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section
          id="datos-partida"
          className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft"
        >
          <h2 className="font-display text-base font-bold text-white">3. Datos de la partida</h2>
          <p className="mt-1 text-xs text-slate-400">
            La vista que abre el botón «Ver datos de la partida» desde las tarjetas del landing:
            K/D/A, oro, GPM/XPM, último golpe, ítems, día/noche y mapa.
          </p>

          <div className="mt-4">
            <PartidaDetalle partida={PARTIDA} />
          </div>
        </section>
      </main>
    </div>
  );
}
