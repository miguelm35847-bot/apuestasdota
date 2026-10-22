/**
 * Tipos y helpers para la vista de partida en vivo.
 *
 * Los datos vienen de la API pública de Valve (`GetLiveLeagueGames`), que solo
 * publica partidas de liga o torneo (no lobbies custom). Cada jugador trae su
 * héroe y sus estadísticas; el reloj y el marcador son de la partida.
 */

/** Ítem del inventario de un jugador. */
export type ItemVivo = {
  slug: string;
  nombre: string;
};

export type JugadorVivo = {
  accountId: number;
  nick: string;
  heroId: number;
  heroNombre: string;
  heroSlug: string;
  kills: number;
  deaths: number;
  assists: number;
  /** Nivel del héroe (1-30). */
  nivel: number;
  /** Oro disponible ahora mismo. */
  oro: number;
  /** Patrimonio: oro + valor de lo comprado. */
  netWorth: number;
  /** Oro por minuto. */
  gpm: number;
  /** Experiencia por minuto. */
  xpm: number;
  ultimosGolpes: number;
  denies: number;
  /** Ítems comprados (hasta 6 ranuras). */
  items: ItemVivo[];
  /** Ítem neutral, disponible a partir del minuto 15. */
  neutral: ItemVivo | null;
  /** Segundos que le faltan para reaparecer; 0 si está vivo. */
  respawn: number;
  /** Posición en el minimapa en porcentaje (0-100). */
  x: number;
  y: number;
};

export type EquipoVivo = {
  score: number;
  /** Torres en pie (de 11 por equipo). */
  torres: number;
  jugadores: JugadorVivo[];
};

export type PartidaViva = {
  matchId: number;
  duracionSegundos: number;
  /** true si la partida transcurre de día (5 min de día / 5 de noche). */
  esDia: boolean;
  radiant: EquipoVivo;
  dire: EquipoVivo;
};

/** Una partida de Dota no pasa de 90 minutos ni en el peor de los casos. */
export const DURACION_MAXIMA_PARTIDA = 90 * 60;

/** URL del icono del héroe en el CDN oficial de Valve. */
export function urlIconoHeroe(slug: string) {
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${slug}.png`;
}

/** URL del icono del ítem en el CDN oficial de Valve. */
export function urlIconoItem(slug: string) {
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${slug}.png`;
}

/** Reloj de la partida: "23:41" (o "1:02:11" si pasa de una hora). */
export function relojDePartida(segundosTotales: number) {
  const total = Math.max(0, Math.floor(segundosTotales));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;

  if (horas > 0) {
    return `${horas}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }

  return `${minutos}:${segundos.toString().padStart(2, '0')}`;
}

/** K/D/A de un jugador en texto corto. */
export function kadDe(jugador: JugadorVivo) {
  return `${jugador.kills}/${jugador.deaths}/${jugador.assists}`;
}

/**
 * ¿La partida va de día? En Dota el ciclo dura 5 minutos de día y 5 de noche,
 * así que basta con mirar el bloque de 5 minutos en el que estamos.
 */
export function esDeDia(segundosTotales: number) {
  return Math.floor(Math.max(0, segundosTotales) / 300) % 2 === 0;
}

/**
 * Segundos jugados desde que la sala pasó a `en_juego`. Se acota a 90 minutos
 * por si la sala quedó abierta (o el reloj del servidor va raro).
 */
export function duracionDesdeInicio(
  iniciadaAt: string | null | undefined,
  ahora: number = Date.now()
) {
  if (!iniciadaAt) return 0;

  const inicio = new Date(iniciadaAt).getTime();
  if (!Number.isFinite(inicio)) return 0;

  const segundos = Math.floor((ahora - inicio) / 1000);
  return Math.min(DURACION_MAXIMA_PARTIDA, Math.max(0, segundos));
}

/** Oro abreviado: "850" o "12,4k". */
export function formatearOro(oro: number) {
  const valor = Math.max(0, Math.round(oro));
  if (valor < 1000) return String(valor);

  const miles = valor / 1000;
  return `${miles.toFixed(valor >= 10_000 ? 0 : 1).replace('.', ',')}k`;
}
