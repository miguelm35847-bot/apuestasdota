'use client';

import MedallaMmr from '@/components/MedallaMmr';
import {
  BASES,
  CARRILES,
  type CarrilId,
  type EquipoMapa,
  ROSHAN,
  TORRES_POR_EQUIPO,
  type TorreMapa,
  puntoEnRuta,
  torresDestruidas,
} from '@/lib/mapaDota';
import {
  EquipoVivo,
  JugadorVivo,
  PartidaViva,
  formatearOro,
  kadDe,
  relojDePartida,
  urlIconoHeroe,
  urlIconoItem,
} from '@/lib/vivo';

type Props = {
  partida: PartidaViva;
  className?: string;
};

const TONO = {
  radiant: {
    texto: 'text-emerald-300',
    punto: 'bg-emerald-400',
    anillo: 'ring-emerald-400',
    cabecera: 'bg-emerald-500/[0.06]',
  },
  dire: {
    texto: 'text-rose-300',
    punto: 'bg-rose-400',
    anillo: 'ring-rose-400',
    cabecera: 'bg-rose-500/[0.06]',
  },
} as const;

function Dato({
  etiqueta,
  valor,
  clase = 'text-slate-200',
  oculto = '',
}: {
  etiqueta: string;
  valor: string;
  clase?: string;
  oculto?: string;
}) {
  return (
    <div className={`text-right ${oculto}`.trim()}>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {etiqueta}
      </p>
      <p className={`text-xs font-bold tabular-nums ${clase}`}>{valor}</p>
    </div>
  );
}

function FilaJugador({ jugador }: { jugador: JugadorVivo }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4">
      <div className="relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- icono de héroe del CDN de Valve */}
        <img
          src={urlIconoHeroe(jugador.heroSlug)}
          alt={jugador.heroNombre}
          width={40}
          height={40}
          className={`h-10 w-10 rounded-lg bg-white/5 object-cover ring-1 ring-white/10 ${
            jugador.respawn > 0 ? 'opacity-50 grayscale' : ''
          }`}
          loading="lazy"
        />
        <span
          className="absolute -bottom-1 -right-1 rounded bg-[#0b1220] px-1 text-[9px] font-bold tabular-nums text-slate-300 ring-1 ring-white/15"
          title={`Nivel ${jugador.nivel}`}
        >
          {jugador.nivel}
        </span>
      </div>

      <div className="min-w-0 flex-1 basis-28">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-xs font-semibold text-slate-100">{jugador.nick}</p>
          <MedallaMmr mmr={jugador.mmr} size="sm" inline className="shrink-0" />
          {jugador.respawn > 0 && (
            <span
              className="shrink-0 rounded bg-rose-500/15 px-1 text-[9px] font-bold text-rose-300 ring-1 ring-inset ring-rose-500/30"
              title="Reaparece en..."
            >
              ☠ {jugador.respawn}s
            </span>
          )}
        </div>
        <p className="truncate text-[10px] text-slate-500">{jugador.heroNombre}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Dato etiqueta="K/D/A" valor={kadDe(jugador)} />
        <Dato etiqueta="Oro" valor={formatearOro(jugador.oro)} clase="text-amber-300" />
        <Dato
          etiqueta="GPM/XPM"
          valor={`${jugador.gpm}/${jugador.xpm}`}
          clase="text-slate-300"
          oculto="hidden sm:block"
        />
        <Dato
          etiqueta="LH/DN"
          valor={`${jugador.ultimosGolpes}/${jugador.denies}`}
          clase="text-slate-300"
          oculto="hidden md:block"
        />
        <Dato
          etiqueta="Neto"
          valor={formatearOro(jugador.netWorth)}
          clase="text-slate-300"
          oculto="hidden sm:block"
        />
      </div>

      <div className="flex w-full items-center gap-1 sm:w-auto sm:pl-1">
        {Array.from({ length: 6 }).map((_, ranura) => {
          const item = jugador.items[ranura];
          return item ? (
            /* eslint-disable-next-line @next/next/no-img-element -- icono de ítem del CDN de Valve */
            <img
              key={`${jugador.accountId}-${item.slug}`}
              src={urlIconoItem(item.slug)}
              alt={item.nombre}
              title={item.nombre}
              width={26}
              height={20}
              className="h-5 w-[26px] rounded-sm border border-white/10 bg-black/30 object-cover"
              loading="lazy"
            />
          ) : (
            <span
              key={`${jugador.accountId}-vacio-${ranura}`}
              className="h-5 w-[26px] rounded-sm border border-dashed border-white/10 bg-white/[0.02]"
              aria-hidden="true"
            />
          );
        })}
        {jugador.neutral && (
          <>
            <span className="mx-0.5 h-4 w-px bg-white/10" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element -- icono de ítem del CDN de Valve */}
            <img
              src={urlIconoItem(jugador.neutral.slug)}
              alt={jugador.neutral.nombre}
              title={`${jugador.neutral.nombre} (neutral)`}
              width={20}
              height={20}
              className="h-5 w-5 rounded-full border border-amber-400/30 bg-black/30 object-cover"
              loading="lazy"
            />
          </>
        )}
      </div>
    </li>
  );
}

function TablaEquipo({
  nombre,
  lado,
  equipo,
}: {
  nombre: string;
  lado: 'radiant' | 'dire';
  equipo: EquipoVivo;
}) {
  const tono = TONO[lado];
  const oro = equipo.jugadores.reduce((total, jugador) => total + jugador.netWorth, 0);
  const posicion = lado === 'radiant' ? 'left-0 border-r' : 'right-0 border-l';

  return (
    <section className="arena-card overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
      <header
        className={`relative flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-2.5 ${tono.cabecera}`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 w-1 ${posicion} ${
            lado === 'radiant' ? 'border-emerald-400/60' : 'border-rose-400/60'
          }`}
        />
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${tono.punto}`} aria-hidden="true" />
          <h3 className="font-display text-sm font-bold text-white">{nombre}</h3>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {equipo.score} kills · {equipo.torres} torres
          </span>
        </div>
        <span className="text-[10px] font-semibold tabular-nums text-slate-400">
          {formatearOro(oro)} oro
        </span>
      </header>

      <ul className="divide-y divide-white/5">
        {equipo.jugadores.map((jugador) => (
          <FilaJugador key={jugador.accountId} jugador={jugador} />
        ))}
      </ul>
    </section>
  );
}

const TONO_TORRE: Record<EquipoMapa, { relleno: string; borde: string }> = {
  radiant: { relleno: '#34d399', borde: '#065f46' },
  dire: { relleno: '#fb7185', borde: '#881337' },
};

/** Desvío del nombre de cada senda para no pisar el camino. */
const ETIQUETA_SENDA: Record<CarrilId, { x: number; y: number }> = {
  bot: { x: 4.5, y: 4.5 },
  mid: { x: 7, y: 7 },
  top: { x: -4.5, y: -4.5 },
};

const MEDIO_LADO_TORRE = 1.6;

/** Una torre del minimapa: en pie con el color del equipo, caída apagada. */
function TorreSvg({ torre, caida }: { torre: TorreMapa; caida: boolean }) {
  const color = TONO_TORRE[torre.equipo];

  return (
    <g>
      {!caida && (
        <circle
          cx={torre.x}
          cy={torre.y}
          r="2.6"
          fill={color.relleno}
          opacity="0.14"
          aria-hidden="true"
        />
      )}
      <rect
        x={torre.x - MEDIO_LADO_TORRE}
        y={torre.y - MEDIO_LADO_TORRE}
        width={MEDIO_LADO_TORRE * 2}
        height={MEDIO_LADO_TORRE * 2}
        rx="0.4"
        fill={caida ? '#111827' : color.relleno}
        stroke={caida ? '#475569' : color.borde}
        strokeWidth="0.7"
      />
      {caida && (
        <g stroke="#64748b" strokeWidth="0.55" strokeLinecap="round">
          <line
            x1={torre.x - 0.9}
            y1={torre.y - 0.9}
            x2={torre.x + 0.9}
            y2={torre.y + 0.9}
          />
          <line
            x1={torre.x - 0.9}
            y1={torre.y + 0.9}
            x2={torre.x + 0.9}
            y2={torre.y - 0.9}
          />
        </g>
      )}
    </g>
  );
}

function Mapa({ partida }: { partida: PartidaViva }) {
  const heroes = [
    ...partida.radiant.jugadores.map((jugador) => ({ jugador, lado: 'radiant' as const })),
    ...partida.dire.jugadores.map((jugador) => ({ jugador, lado: 'dire' as const })),
  ];

  // Las torres de la lista van en orden de caída: las primeras `caidas` están
  // destruidas y el resto siguen en pie.
  const caidas: Record<EquipoMapa, number> = {
    radiant: torresDestruidas('radiant', partida.radiant.torres),
    dire: torresDestruidas('dire', partida.dire.torres),
  };

  return (
    <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold text-white">Mapa</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
            partida.esDia
              ? 'bg-amber-500/10 text-amber-300 ring-amber-500/30'
              : 'bg-sky-500/10 text-sky-300 ring-sky-500/30'
          }`}
        >
          {partida.esDia ? '☀️ Día' : '🌙 Noche'}
        </span>
      </div>

      <div className="relative mt-2 aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-[#070c15]">
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Mapa de Dota con las tres sendas, las torres y la posición aproximada de los héroes"
        >
          {/* Territorio */}
          <polygon points="0,0 0,100 100,100" fill="rgba(16,185,129,0.10)" />
          <polygon points="0,0 100,0 100,100" fill="rgba(244,63,94,0.10)" />

          {/* Río */}
          <path d="M2,2 L98,98" stroke="rgba(56,189,248,0.20)" strokeWidth="8" fill="none" />

          {/* Las tres sendas: borde oscuro y camino claro encima */}
          {CARRILES.map((carril) => {
            const camino = `M${carril.puntos.map((p) => `${p.x},${p.y}`).join(' L')}`;
            return (
              <g key={carril.id}>
                <path
                  d={camino}
                  stroke="rgba(6,10,18,0.9)"
                  strokeWidth="7.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={camino}
                  stroke="rgba(160,174,192,0.32)"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* Nombre de cada senda, apartado del camino */}
          {CARRILES.map((carril) => {
            const centro = puntoEnRuta(carril.puntos, 0.5);
            const desvio = ETIQUETA_SENDA[carril.id];
            return (
              <text
                key={`nombre-${carril.id}`}
                x={centro.x + desvio.x}
                y={centro.y + desvio.y}
                textAnchor="middle"
                fontSize="3.4"
                fontWeight="700"
                letterSpacing="0.3"
                fill="rgba(148,163,184,0.7)"
              >
                {carril.etiqueta}
              </text>
            );
          })}

          {/* Bases y Roshan */}
          <circle
            cx={BASES.radiant.x}
            cy={BASES.radiant.y}
            r="5"
            fill="rgba(16,185,129,0.35)"
            stroke="rgba(52,211,153,0.9)"
            strokeWidth="1"
          />
          <circle
            cx={BASES.dire.x}
            cy={BASES.dire.y}
            r="5"
            fill="rgba(244,63,94,0.3)"
            stroke="rgba(251,113,133,0.9)"
            strokeWidth="1"
          />
          <circle cx={ROSHAN.x} cy={ROSHAN.y} r="2.6" fill="rgba(251,191,36,0.9)" />
          <text
            x={ROSHAN.x}
            y={ROSHAN.y - 3.5}
            textAnchor="middle"
            fontSize="3.6"
            fontWeight="700"
            fill="#fcd34d"
          >
            R
          </text>

          {/* Torres: en pie con el color del equipo, caídas apagadas y tachadas */}
          {(['radiant', 'dire'] as const).map((lado) =>
            TORRES_POR_EQUIPO[lado].map((torre, indice) => (
              <TorreSvg
                key={`${lado}-${torre.carril}-${torre.nivel}-${indice}`}
                torre={torre}
                caida={indice < caidas[lado]}
              />
            ))
          )}
        </svg>

        {!partida.esDia && (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-[#020617]/55"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_15%,rgba(2,6,23,0.9)_100%)]"
              aria-hidden="true"
            />
          </>
        )}

        {heroes.map(({ jugador, lado }) => (
          <div
            key={`${lado}-${jugador.accountId}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${jugador.x}%`, top: `${jugador.y}%` }}
            title={`${jugador.nick} · ${jugador.heroNombre}${
              jugador.respawn > 0 ? ` · reaparece en ${jugador.respawn}s` : ''
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- icono de héroe del CDN de Valve */}
            <img
              src={urlIconoHeroe(jugador.heroSlug)}
              alt=""
              width={22}
              height={22}
              className={`h-[22px] w-[22px] rounded-full bg-black/60 object-cover shadow-[0_0_10px_rgba(0,0,0,0.8)] ring-2 ${TONO[lado].anillo} ${
                jugador.respawn > 0 ? 'opacity-40 grayscale' : ''
              }`}
              loading="lazy"
            />
          </div>
        ))}

        <span className="pointer-events-none absolute bottom-1.5 left-2 text-[8px] font-bold uppercase tracking-widest text-emerald-300/60">
          Radiant
        </span>
        <span className="pointer-events-none absolute right-2 top-1.5 text-[8px] font-bold uppercase tracking-widest text-rose-300/60">
          Dire
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-[2px] bg-emerald-400" aria-hidden="true" />
          Torre Radiant
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-[2px] bg-rose-400" aria-hidden="true" />
          Torre Dire
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-[2px] border border-slate-500 bg-[#111827]"
            aria-hidden="true"
          />
          Torre caída
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
          Roshan
        </span>
      </div>

      <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
        Las tres sendas (superior, media e inferior) con las 11 torres de cada equipo. Ahora mismo
        quedan{' '}
        <span className="font-semibold text-slate-300">
          {partida.radiant.torres} de Radiant
        </span>{' '}
        y{' '}
        <span className="font-semibold text-slate-300">{partida.dire.torres} de Dire</span>. La
        posición de los héroes es simulada.
      </p>
    </div>
  );
}

function OroEquipos({ partida }: { partida: PartidaViva }) {
  const radiant = partida.radiant.jugadores.reduce((total, j) => total + j.netWorth, 0);
  const dire = partida.dire.jugadores.reduce((total, j) => total + j.netWorth, 0);
  const total = Math.max(1, radiant + dire);
  const porcentaje = Math.round((radiant / total) * 100);
  const ventaja = Math.abs(radiant - dire);
  const lider = radiant >= dire ? 'Radiant' : 'Dire';

  return (
    <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-white">Oro de equipo</h3>
        <span className="text-[10px] font-semibold tabular-nums text-slate-400">
          {formatearOro(total)}
        </span>
      </div>

      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/5">
        <span
          className="bg-emerald-400 transition-all duration-500"
          style={{ width: `${porcentaje}%` }}
          aria-hidden="true"
        />
        <span className="flex-1 bg-rose-400" aria-hidden="true" />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold tabular-nums">
        <span className="text-emerald-300">{formatearOro(radiant)}</span>
        <span className="text-rose-300">{formatearOro(dire)}</span>
      </div>

      <p className="mt-1.5 text-[10px] text-slate-500">
        {lider} saca <span className="font-semibold text-slate-300">{formatearOro(ventaja)}</span>{' '}
        de ventaja.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-2.5">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Torres Radiant
          </p>
          <p className="text-sm font-bold tabular-nums text-emerald-300">
            {partida.radiant.torres}
            <span className="text-[10px] font-semibold text-slate-500">/11</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Torres Dire
          </p>
          <p className="text-sm font-bold tabular-nums text-rose-300">
            {partida.dire.torres}
            <span className="text-[10px] font-semibold text-slate-500">/11</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Panel completo de la partida: marcador, día/noche, oro, mapa con la posición
 * de los héroes y, por equipo, K/D/A, nivel, GPM/XPM, último golpe y los ítems.
 */
export default function PartidaDetalle({ partida, className = '' }: Props) {
  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="arena-card overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-arena-soft">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Datos de demostración
            <span className="font-semibold normal-case tracking-normal text-slate-500">
              · Partida {partida.matchId}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
            <span
              className={`rounded-full px-2 py-0.5 ring-1 ring-inset ${
                partida.esDia
                  ? 'bg-amber-500/10 text-amber-300 ring-amber-500/30'
                  : 'bg-sky-500/10 text-sky-300 ring-sky-500/30'
              }`}
            >
              {partida.esDia ? '☀️ Día' : '🌙 Noche'}
            </span>
            <span className="tabular-nums">
              {partida.radiant.torres + partida.dire.torres} torres en pie
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-4 sm:px-5">
          <div className="flex items-center justify-center gap-2.5 sm:justify-start">
            <span className="font-display text-3xl font-extrabold tabular-nums text-emerald-300 sm:text-4xl">
              {partida.radiant.score}
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/80">
                Radiant
              </p>
              <p className="text-[10px] text-slate-500">{partida.radiant.torres} torres</p>
            </div>
          </div>

          <div className="text-center">
            <p className="font-display text-xl font-bold tabular-nums text-white sm:text-2xl">
              {relojDePartida(partida.duracionSegundos)}
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
              Duración
            </p>
          </div>

          <div className="flex items-center justify-center gap-2.5 sm:flex-row-reverse sm:justify-start">
            <span className="font-display text-3xl font-extrabold tabular-nums text-rose-300 sm:text-4xl">
              {partida.dire.score}
            </span>
            <div className="sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300/80">
                Dire
              </p>
              <p className="text-[10px] text-slate-500">{partida.dire.torres} torres</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="order-2 min-w-0 space-y-4 lg:order-1">
          <TablaEquipo nombre="Radiant" lado="radiant" equipo={partida.radiant} />
          <TablaEquipo nombre="Dire" lado="dire" equipo={partida.dire} />
        </div>

        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-4 lg:self-start">
          <Mapa partida={partida} />
          <OroEquipos partida={partida} />
        </aside>
      </div>
    </div>
  );
}
