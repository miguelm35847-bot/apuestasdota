/**
 * Tipos y helpers para la vista de partida en vivo.
 *
 * Los datos vienen de la API pública de Valve (`GetLiveLeagueGames`), que solo
 * publica partidas de liga o torneo (no lobbies custom). Cada jugador trae su
 * héroe y sus estadísticas; el reloj y el marcador son de la partida.
 */

export type JugadorVivo = {
  accountId: number;
  nick: string;
  heroId: number;
  heroNombre: string;
  heroSlug: string;
  kills: number;
  deaths: number;
  assists: number;
};

export type EquipoVivo = {
  score: number;
  jugadores: JugadorVivo[];
};

export type PartidaViva = {
  matchId: number;
  duracionSegundos: number;
  radiant: EquipoVivo;
  dire: EquipoVivo;
};

/** URL del icono del héroe en el CDN oficial de Valve. */
export function urlIconoHeroe(slug: string) {
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${slug}.png`;
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
