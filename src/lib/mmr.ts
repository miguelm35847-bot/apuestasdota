export type RangoMmr = {
  id: string;
  nombre: string;
  min: number;
  max: number | null;
  icono: string;
  color: string;
  fondo: string;
  anillo: string;
  /**
   * MMR mínimo para cada estrella (de 1 a 5).
   * `null` en Immortal porque Dota usa la posición del leaderboard, no estrellas.
   */
  estrellas: readonly [number, number, number, number, number] | null;
};

/**
 * Rangos de medalla de Dota 2 usados para representar visualmente el MMR.
 * Las imágenes de OpenDota están indexadas así:
 * rank_0 = sin calibrar, rank_1 = Herald ... rank_8 = Immortal.
 */
export const RANGOS_MMR: RangoMmr[] = [
  {
    id: 'herald',
    nombre: 'Herald',
    min: 0,
    max: 769,
    icono: '/medallas/rank_1.png',
    color: 'text-slate-300',
    fondo: 'bg-slate-400/10',
    anillo: 'ring-slate-400/30',
    estrellas: [0, 154, 308, 462, 616],
  },
  {
    id: 'guardian',
    nombre: 'Guardian',
    min: 770,
    max: 1539,
    icono: '/medallas/rank_2.png',
    color: 'text-amber-300',
    fondo: 'bg-amber-400/10',
    anillo: 'ring-amber-400/30',
    estrellas: [770, 924, 1078, 1232, 1386],
  },
  {
    id: 'crusader',
    nombre: 'Crusader',
    min: 1540,
    max: 2309,
    icono: '/medallas/rank_3.png',
    color: 'text-cyan-300',
    fondo: 'bg-cyan-400/10',
    anillo: 'ring-cyan-400/30',
    estrellas: [1540, 1694, 1848, 2002, 2156],
  },
  {
    id: 'archon',
    nombre: 'Archon',
    min: 2310,
    max: 3079,
    icono: '/medallas/rank_4.png',
    color: 'text-violet-300',
    fondo: 'bg-violet-400/10',
    anillo: 'ring-violet-400/30',
    estrellas: [2310, 2464, 2618, 2772, 2926],
  },
  {
    id: 'legend',
    nombre: 'Legend',
    min: 3080,
    max: 3849,
    icono: '/medallas/rank_5.png',
    color: 'text-orange-300',
    fondo: 'bg-orange-400/10',
    anillo: 'ring-orange-400/30',
    estrellas: [3080, 3234, 3388, 3542, 3696],
  },
  {
    id: 'ancient',
    nombre: 'Ancient',
    min: 3850,
    max: 4619,
    icono: '/medallas/rank_6.png',
    color: 'text-emerald-300',
    fondo: 'bg-emerald-400/10',
    anillo: 'ring-emerald-400/30',
    estrellas: [3850, 4004, 4158, 4312, 4466],
  },
  {
    id: 'divine',
    nombre: 'Divine',
    min: 4620,
    max: 5419,
    icono: '/medallas/rank_7.png',
    color: 'text-fuchsia-300',
    fondo: 'bg-fuchsia-400/10',
    anillo: 'ring-fuchsia-400/30',
    estrellas: [4620, 4780, 4940, 5100, 5260],
  },
  {
    id: 'immortal',
    nombre: 'Immortal',
    min: 5420,
    max: null,
    icono: '/medallas/rank_8.png',
    color: 'text-rose-300',
    fondo: 'bg-rose-400/10',
    anillo: 'ring-rose-400/30',
    estrellas: null,
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

/**
 * Devuelve las estrellas (1 a 5) que corresponden al MMR dentro de su medalla.
 * Immortal se muestra con 5 estrellas porque la app no tiene leaderboard;
 * en Dota, Immortal no utiliza estrellas.
 */
export function estrellasDeMmr(
  mmr: number | null | undefined,
  rango: RangoMmr | null
): number {
  if (!rango || mmr === null || mmr === undefined || !Number.isFinite(mmr)) return 0;
  if (!rango.estrellas) return 5;

  const valor = Math.max(0, Math.round(mmr));
  let estrellas = 1;

  for (let i = 1; i < rango.estrellas.length; i++) {
    if (valor >= rango.estrellas[i]) estrellas = i + 1;
  }

  return estrellas;
}
