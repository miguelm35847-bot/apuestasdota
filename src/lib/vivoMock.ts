import { JugadorVivo, PartidaViva } from './vivo';

/**
 * MOCK de partida en vivo.
 *
 * Arma una partida de ejemplo con los jugadores reales de la sala para poder
 * revisar el diseño en la web (landing y sala). En cuanto Valve apruebe la
 * liga/ticket, esta función se sustituye por la llamada al endpoint de
 * servidor que consulta `GetLiveLeagueGames` de Valve: el resto de la
 * interfaz no cambia.
 */

const HEROES = [
  { id: 1, nombre: 'Anti-Mage', slug: 'antimage' },
  { id: 8, nombre: 'Juggernaut', slug: 'juggernaut' },
  { id: 44, nombre: 'Phantom Assassin', slug: 'phantom_assassin' },
  { id: 20, nombre: 'Vengeful Spirit', slug: 'vengefulspirit' },
  { id: 13, nombre: 'Puck', slug: 'puck' },
  { id: 25, nombre: 'Lina', slug: 'lina' },
  { id: 48, nombre: 'Luna', slug: 'luna' },
  { id: 5, nombre: 'Crystal Maiden', slug: 'crystal_maiden' },
  { id: 84, nombre: 'Ogre Magi', slug: 'ogre_magi' },
  { id: 35, nombre: 'Sniper', slug: 'sniper' },
  { id: 2, nombre: 'Axe', slug: 'axe' },
  { id: 46, nombre: 'Templar Assassin', slug: 'templar_assassin' },
  { id: 10, nombre: 'Morphling', slug: 'morphling' },
  { id: 17, nombre: 'Storm Spirit', slug: 'storm_spirit' },
];

const KDA = [
  { kills: 9, deaths: 2, assists: 6 },
  { kills: 6, deaths: 4, assists: 9 },
  { kills: 4, deaths: 3, assists: 7 },
  { kills: 2, deaths: 5, assists: 11 },
  { kills: 3, deaths: 3, assists: 8 },
  { kills: 7, deaths: 4, assists: 4 },
  { kills: 5, deaths: 3, assists: 6 },
  { kills: 3, deaths: 6, assists: 12 },
  { kills: 2, deaths: 4, assists: 9 },
  { kills: 1, deaths: 5, assists: 3 },
  { kills: 5, deaths: 6, assists: 4 },
  { kills: 4, deaths: 5, assists: 5 },
];

type JugadorSala = {
  user_id: string;
  profiles?: { nick?: string | null } | null;
};

export function partidaVivaMock(jugadores: JugadorSala[]): PartidaViva | null {
  if (jugadores.length < 2) return null;

  const mitad = Math.ceil(jugadores.length / 2);
  const aJugador = (jugador: JugadorSala, indice: number): JugadorVivo => {
    const heroe = HEROES[indice % HEROES.length];
    const kda = KDA[indice % KDA.length];
    return {
      accountId: indice + 1,
      nick: jugador.profiles?.nick?.trim() || `Jugador ${indice + 1}`,
      heroId: heroe.id,
      heroNombre: heroe.nombre,
      heroSlug: heroe.slug,
      kills: kda.kills,
      deaths: kda.deaths,
      assists: kda.assists,
    };
  };

  const radiant = jugadores.slice(0, mitad).map(aJugador);
  const dire = jugadores.slice(mitad).map((jugador, indice) => aJugador(jugador, indice + mitad));

  const puntos = (equipo: JugadorVivo[]) =>
    equipo.reduce((total, jugador) => total + jugador.kills * 30 + jugador.assists * 10, 0);

  return {
    matchId: 9055212787,
    duracionSegundos: 1421,
    radiant: { score: Math.round(puntos(radiant) / 60), jugadores: radiant },
    dire: { score: Math.round(puntos(dire) / 60), jugadores: dire },
  };
}
