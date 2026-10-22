/**
 * Geometría del mapa de Dota 2 para el minimapa y para mover a los héroes.
 *
 * Todo va en porcentajes (0-100) con el eje Y hacia abajo, así que el mapa se
 * dibuja en un `viewBox="0 0 100 100"`. Radiant ocupa la esquina inferior
 * izquierda y Dire la superior derecha; el río cruza la diagonal.
 *
 * Es una **aproximación** al mapa real (el mapa del juego está girado 45°):
 * las tres sendas, las 11 torres por equipo y Roshan van donde van en el
 * minimapa del cliente, pero sin precisión al píxel.
 */

export type PuntoMapa = { x: number; y: number };
export type CarrilId = 'bot' | 'mid' | 'top';
export type EquipoMapa = 'radiant' | 'dire';
export type NivelTorre = 1 | 2 | 3 | 4;

export const BASES: Record<EquipoMapa, PuntoMapa> = {
  radiant: { x: 16, y: 84 },
  dire: { x: 84, y: 16 },
};

/** Pozo de Roshan, junto al río. */
export const ROSHAN: PuntoMapa = { x: 47, y: 53 };

export type CarrilMapa = {
  id: CarrilId;
  nombre: string;
  etiqueta: string;
  /** Camino de la senda desde la base Radiant hasta la base Dire. */
  puntos: PuntoMapa[];
};

export const CARRILES: CarrilMapa[] = [
  {
    id: 'bot',
    nombre: 'Senda inferior',
    etiqueta: 'BOT',
    puntos: [
      { x: 16, y: 84 },
      { x: 48, y: 93 },
      { x: 93, y: 48 },
      { x: 84, y: 16 },
    ],
  },
  {
    id: 'mid',
    nombre: 'Senda media',
    etiqueta: 'MID',
    puntos: [
      { x: 16, y: 84 },
      { x: 34, y: 66 },
      { x: 50, y: 50 },
      { x: 66, y: 34 },
      { x: 84, y: 16 },
    ],
  },
  {
    id: 'top',
    nombre: 'Senda superior',
    etiqueta: 'TOP',
    puntos: [
      { x: 16, y: 84 },
      { x: 7, y: 54 },
      { x: 54, y: 7 },
      { x: 84, y: 16 },
    ],
  },
];

/**
 * Ruta de cada posición (0 carry, 1 support, 2 mid, 3 offlane, 4 support):
 * el carry baja por la senda inferior, el offlane sube por la superior y los
 * supports acompañan a cada uno. Los héroes caminan así por los carriles que
 * dibuja el minimapa.
 */
export const RUTAS_HEROE: PuntoMapa[][] = [
  CARRILES[0].puntos,
  CARRILES[0].puntos,
  CARRILES[1].puntos,
  CARRILES[2].puntos,
  CARRILES[2].puntos,
];

/** Punto intermedio de una polilínea (0 = inicio, 1 = final). */
export function puntoEnRuta(puntos: PuntoMapa[], avance: number): PuntoMapa {
  if (puntos.length === 0) return { x: 50, y: 50 };
  if (puntos.length === 1) return puntos[0];

  const tramo = Math.min(0.999, Math.max(0, avance)) * (puntos.length - 1);
  const indice = Math.floor(tramo);
  const resto = tramo - indice;
  const desde = puntos[indice];
  const hasta = puntos[indice + 1] ?? puntos[indice];

  return {
    x: desde.x + (hasta.x - desde.x) * resto,
    y: desde.y + (hasta.y - desde.y) * resto,
  };
}

export type TorreMapa = {
  equipo: EquipoMapa;
  carril: CarrilId;
  nivel: NivelTorre;
  x: number;
  y: number;
};

/**
 * Posición de cada torre sobre su senda: las T1 son las más lejanas de la base
 * (t = 0.40 en Radiant, 0.60 en Dire) y las T3 las más cercanas; las T4 son las
 * dos del antiguo, pegadas a la base.
 */
const FRACCION_TORRE: Record<EquipoMapa, Record<1 | 2 | 3, number>> = {
  radiant: { 1: 0.4, 2: 0.26, 3: 0.13 },
  dire: { 1: 0.6, 2: 0.74, 3: 0.87 },
};

const unDecimal = (valor: number) => Math.round(valor * 10) / 10;

/**
 * Torres de cada equipo **en orden de caída**: primero las T1 de las tres
 * sendas, después las T2, las T3 y por último las dos del antiguo. Así el
 * minimapa puede pintar como destruidas las primeras `11 - torres` de la lista
 * y coincide con el contador del marcador.
 */
export const TORRES_POR_EQUIPO: Record<EquipoMapa, TorreMapa[]> = (() => {
  const porEquipo = {} as Record<EquipoMapa, TorreMapa[]>;

  for (const equipo of ['radiant', 'dire'] as const) {
    const torres: TorreMapa[] = [];

    for (const nivel of [1, 2, 3] as const) {
      for (const carril of CARRILES) {
        const punto = puntoEnRuta(carril.puntos, FRACCION_TORRE[equipo][nivel]);
        torres.push({
          equipo,
          carril: carril.id,
          nivel,
          x: unDecimal(punto.x),
          y: unDecimal(punto.y),
        });
      }
    }

    const base = BASES[equipo];
    const signo = equipo === 'radiant' ? 1 : -1;
    for (const [dx, dy] of [
      [7, 3],
      [3, -7],
    ]) {
      torres.push({
        equipo,
        carril: 'mid',
        nivel: 4,
        x: unDecimal(base.x + signo * dx),
        y: unDecimal(base.y + signo * dy),
      });
    }

    porEquipo[equipo] = torres;
  }

  return porEquipo;
})();

/** Torres en pie (11 menos las caídas) -> cuáles están destruidas. */
export function torresDestruidas(equipo: EquipoMapa, enPie: number) {
  const total = TORRES_POR_EQUIPO[equipo].length;
  return Math.min(total, Math.max(0, total - enPie));
}
