'use client';

import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';
import VivoMarcador from '@/components/VivoMarcador';
import VivoJugador from '@/components/VivoJugador';
import { PartidaViva } from '@/lib/vivo';

/**
 * Vista previa de la partida en vivo.
 *
 * Es un mockup con datos de ejemplo: sirve para revisar el diseño antes de
 * conectar la API de Valve (que solo publica partidas de liga/torneo).
 */

const PARTIDA: PartidaViva = {
  matchId: 9055212787,
  duracionSegundos: 1421,
  radiant: {
    score: 24,
    jugadores: [
      { accountId: 1, nick: 'mik', heroId: 1, heroNombre: 'Anti-Mage', heroSlug: 'antimage', kills: 9, deaths: 2, assists: 6 },
      { accountId: 2, nick: 'asdfbhbwnef', heroId: 8, heroNombre: 'Juggernaut', heroSlug: 'juggernaut', kills: 6, deaths: 4, assists: 9 },
      { accountId: 3, nick: 'Kchaprras', heroId: 44, heroNombre: 'Phantom Assassin', heroSlug: 'phantom_assassin', kills: 4, deaths: 3, assists: 7 },
      { accountId: 4, nick: 'Polar', heroId: 20, heroNombre: 'Vengeful Spirit', heroSlug: 'vengefulspirit', kills: 2, deaths: 5, assists: 11 },
      { accountId: 5, nick: 'Musulman', heroId: 13, heroNombre: 'Puck', heroSlug: 'puck', kills: 3, deaths: 3, assists: 8 },
    ],
  },
  dire: {
    score: 18,
    jugadores: [
      { accountId: 6, nick: 'Yunois', heroId: 25, heroNombre: 'Lina', heroSlug: 'lina', kills: 7, deaths: 4, assists: 4 },
      { accountId: 7, nick: 'qa-p1', heroId: 48, heroNombre: 'Luna', heroSlug: 'luna', kills: 5, deaths: 3, assists: 6 },
      { accountId: 8, nick: 'qa-p2', heroId: 5, heroNombre: 'Crystal Maiden', heroSlug: 'crystal_maiden', kills: 3, deaths: 6, assists: 12 },
      { accountId: 9, nick: 'qa-p3', heroId: 84, heroNombre: 'Ogre Magi', heroSlug: 'ogre_magi', kills: 2, deaths: 4, assists: 9 },
      { accountId: 10, nick: 'qa-p4', heroId: 35, heroNombre: 'Sniper', heroSlug: 'sniper', kills: 1, deaths: 5, assists: 3 },
    ],
  },
};

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
      </main>
    </div>
  );
}
