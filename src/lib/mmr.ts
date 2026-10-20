export type RangoMmr = {
  id: string;
  nombre: string;
  min: number;
  max: number | null;
  icono: string;
  color: string;
  fondo: string;
  anillo: string;
};

/**
 * Rangos de medalla de Dota 2 usados para representar visualmente el MMR.
 * Los límites son los rangos públicos de medallas; Immortal no tiene techo.
 */
export const RANGOS_MMR: RangoMmr[] = [
  {
    id: 'herald',
    nombre: 'Herald',
    min: 0,
    max: 769,
    icono: '/medallas/rank_0.png',
    color: 'text-slate-300',
    fondo: 'bg-slate-400/10',
    anillo: 'ring-slate-400/30',
  },
  {
    id: 'guardian',
    nombre: 'Guardian',
    min: 770,
    max: 1539,
    icono: '/medallas/rank_1.png',
    color: 'text-amber-300',
    fondo: 'bg-amber-400/10',
    anillo: 'ring-amber-400/30',
  },
  {
    id: 'crusader',
    nombre: 'Crusader',
    min: 1540,
    max: 2309,
    icono: '/medallas/rank_2.png',
    color: 'text-cyan-300',
    fondo: 'bg-cyan-400/10',
    anillo: 'ring-cyan-400/30',
  },
  {
    id: 'archon',
    nombre: 'Archon',
    min: 2310,
    max: 3079,
    icono: '/medallas/rank_3.png',
    color: 'text-violet-300',
    fondo: 'bg-violet-400/10',
    anillo: 'ring-violet-400/30',
  },
  {
    id: 'legend',
    nombre: 'Legend',
    min: 3080,
    max: 3849,
    icono: '/medallas/rank_4.png',
    color: 'text-orange-300',
    fondo: 'bg-orange-400/10',
    anillo: 'ring-orange-400/30',
  },
  {
    id: 'ancient',
    nombre: 'Ancient',
    min: 3850,
    max: 4619,
    icono: '/medallas/rank_5.png',
    color: 'text-emerald-300',
    fondo: 'bg-emerald-400/10',
    anillo: 'ring-emerald-400/30',
  },
  {
    id: 'divine',
    nombre: 'Divine',
    min: 4620,
    max: 5419,
    icono: '/medallas/rank_6.png',
    color: 'text-fuchsia-300',
    fondo: 'bg-fuchsia-400/10',
    anillo: 'ring-fuchsia-400/30',
  },
  {
    id: 'immortal',
    nombre: 'Immortal',
    min: 5420,
    max: null,
    icono: '/medallas/rank_7.png',
    color: 'text-rose-300',
    fondo: 'bg-rose-400/10',
    anillo: 'ring-rose-400/30',
  },
];

export function rangoMmr(mmr: number | null | undefined): RangoMmr | null {
  if (mmr === null || mmr === undefined || !Number.isFinite(mmr)) return null;

  const valor = Math.max(0, Math.round(mmr));
  return (
    RANGOS_MMR.find(
      (rango) => valor >= rango.min && (rango.max === null || valor <= rango.max)
    ) ?? RANGOS_MMR[RANGOS_MMR.length - 1]
  );
}
