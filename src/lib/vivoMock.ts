import { ItemVivo, JugadorVivo, PartidaViva, esDeDia } from './vivo';

/**
 * MOCK de partida en vivo.
 *
 * Arma una partida de ejemplo con los jugadores reales de la sala para poder
 * revisar el diseño en la web (landing, sala y datos de la partida). En cuanto
 * Valve apruebe la liga/ticket, esta función se sustituye por la llamada al
 * endpoint de servidor que consulta `GetLiveLeagueGames`: el resto de la
 * interfaz no cambia.
 *
 * Las estadísticas se derivan del tiempo jugado, así que la vista avanza sola
 * (oro, ítems, nivel, kills y posiciones en el mapa) sin datos aleatorios: el
 * mismo jugador en el mismo minuto siempre da lo mismo.
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

const ITEMS: ItemVivo[] = [
  { slug: 'power_treads', nombre: 'Power Treads' },
  { slug: 'phase_boots', nombre: 'Phase Boots' },
  { slug: 'arcane_boots', nombre: 'Arcane Boots' },
  { slug: 'guardian_greaves', nombre: 'Guardian Greaves' },
  { slug: 'black_king_bar', nombre: 'Black King Bar' },
  { slug: 'blink', nombre: 'Blink Dagger' },
  { slug: 'desolator', nombre: 'Desolator' },
  { slug: 'greater_crit', nombre: 'Daedalus' },
  { slug: 'satanic', nombre: 'Satanic' },
  { slug: 'butterfly', nombre: 'Butterfly' },
  { slug: 'manta', nombre: 'Manta Style' },
  { slug: 'sange_and_yasha', nombre: 'Sange and Yasha' },
  { slug: 'ultimate_scepter', nombre: "Aghanim's Scepter" },
  { slug: 'abyssal_blade', nombre: 'Abyssal Blade' },
  { slug: 'assault', nombre: 'Assault Cuirass' },
  { slug: 'heart', nombre: 'Heart of Tarrasque' },
  { slug: 'shivas_guard', nombre: "Shiva's Guard" },
  { slug: 'pipe', nombre: 'Pipe of Insight' },
  { slug: 'vladmir', nombre: "Vladmir's Offering" },
  { slug: 'dragon_lance', nombre: 'Dragon Lance' },
  { slug: 'hurricane_pike', nombre: 'Hurricane Pike' },
  { slug: 'monkey_king_bar', nombre: 'Monkey King Bar' },
  { slug: 'orchid', nombre: 'Orchid Malevolence' },
  { slug: 'bloodthorn', nombre: 'Bloodthorn' },
  { slug: 'silver_edge', nombre: 'Silver Edge' },
  { slug: 'sphere', nombre: "Linken's Sphere" },
  { slug: 'ethereal_blade', nombre: 'Ethereal Blade' },
  { slug: 'sheepstick', nombre: 'Scythe of Vyse' },
  { slug: 'refresher', nombre: 'Refresher Orb' },
  { slug: 'octarine_core', nombre: 'Octarine Core' },
];

/** Botas de arranque según la posición (0 carry, 1 support, 2 mid, 3 off, 4 support). */
const BOTAS: ItemVivo[] = [
  { slug: 'power_treads', nombre: 'Power Treads' },
  { slug: 'arcane_boots', nombre: 'Arcane Boots' },
  { slug: 'power_treads', nombre: 'Power Treads' },
  { slug: 'phase_boots', nombre: 'Phase Boots' },
  { slug: 'arcane_boots', nombre: 'Arcane Boots' },
];

/** Un jugador no lleva dos pares de botas: se descartan del resto del build. */
const SLUGS_BOTAS = new Set(['power_treads', 'phase_boots', 'arcane_boots', 'guardian_greaves']);

const NEUTRALES: ItemVivo[] = [
  { slug: 'occult_bracelet', nombre: 'Occult Bracelet' },
  { slug: 'quicksilver_amulet', nombre: 'Quicksilver Amulet' },
  { slug: 'titan_sliver', nombre: 'Titan Sliver' },
  { slug: 'magic_lamp', nombre: 'Magic Lamp' },
];

/** Cuánto farmea cada posición: carry, support, mid, offlane, support. */
const FACTOR_FARMA = [1, 0.35, 0.95, 0.7, 0.3];

type Punto = { x: number; y: number };

/**
 * Rutas aproximadas del mapa (porcentajes): inferior, inferior, medio, superior
 * y superior. El lado Dire usa las mismas rutas espejadas.
 */
const RUTAS: Punto[][] = [
  [
    { x: 16, y: 84 },
    { x: 48, y: 93 },
    { x: 93, y: 48 },
    { x: 84, y: 16 },
  ],
  [
    { x: 16, y: 84 },
    { x: 38, y: 88 },
    { x: 70, y: 76 },
    { x: 84, y: 48 },
    { x: 84, y: 16 },
  ],
  [
    { x: 16, y: 84 },
    { x: 34, y: 66 },
    { x: 50, y: 50 },
    { x: 66, y: 34 },
    { x: 84, y: 16 },
  ],
  [
    { x: 16, y: 84 },
    { x: 7, y: 54 },
    { x: 54, y: 7 },
    { x: 84, y: 16 },
  ],
  [
    { x: 16, y: 84 },
    { x: 12, y: 52 },
    { x: 30, y: 24 },
    { x: 52, y: 16 },
    { x: 84, y: 16 },
  ],
];

type JugadorSala = {
  user_id: string;
  equipo?: number | null;
  profiles?: { nick?: string | null } | null;
};

/** Hash estable (FNV-1a) para que cada jugador tenga siempre las mismas stats. */
function semillaDe(texto: string) {
  let hash = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Punto intermedio de una ruta (0 = salida, 1 = llegada). */
function puntoEnRuta(ruta: Punto[], avance: number): Punto {
  const tramo = Math.min(0.999, Math.max(0, avance)) * (ruta.length - 1);
  const indice = Math.floor(tramo);
  const resto = tramo - indice;
  const desde = ruta[indice];
  const hasta = ruta[indice + 1] ?? ruta[indice];

  return {
    x: desde.x + (hasta.x - desde.x) * resto,
    y: desde.y + (hasta.y - desde.y) * resto,
  };
}

/** Ítems comprados según el minuto (el primero son las botas). */
function construirItems(base: number, rol: number, minutos: number): ItemVivo[] {
  const comprados = Math.min(6, Math.max(1, Math.floor(minutos / 3.2) + 1));
  const items: ItemVivo[] = [BOTAS[rol % BOTAS.length]];

  for (let paso = 0; paso < ITEMS.length && items.length < comprados; paso += 1) {
    const item = ITEMS[(base + paso * 13) % ITEMS.length];
    if (SLUGS_BOTAS.has(item.slug)) continue;
    if (!items.some((elegido) => elegido.slug === item.slug)) items.push(item);
  }

  return items;
}

export function partidaVivaMock(
  jugadores: JugadorSala[],
  duracionSegundos = 1421
): PartidaViva | null {
  if (jugadores.length < 2) return null;

  const duracion = Math.max(0, Math.floor(duracionSegundos));
  const minutos = duracion / 60;

  const conEquipo = jugadores.filter((j) => j.equipo === 1 || j.equipo === 2);
  const sinEquipo = jugadores.filter((j) => j.equipo !== 1 && j.equipo !== 2);

  // Si la sala ya tiene equipos se respetan (Radiant 1, Dire 2); si no,
  // se reparte por mitades.
  let radiantSala: JugadorSala[];
  let direSala: JugadorSala[];

  if (conEquipo.length > 0) {
    radiantSala = jugadores.filter((j) => j.equipo === 1);
    direSala = jugadores.filter((j) => j.equipo === 2);
  } else {
    const mitad = Math.ceil(jugadores.length / 2);
    radiantSala = jugadores.slice(0, mitad);
    direSala = jugadores.slice(mitad);
  }

  // Los que estén en lista de espera completan el lado más corto.
  for (const jugador of sinEquipo) {
    if (radiantSala.length <= direSala.length) radiantSala = [...radiantSala, jugador];
    else direSala = [...direSala, jugador];
  }

  const aJugador = (
    jugador: JugadorSala,
    indice: number,
    indiceEquipo: number,
    lado: 'radiant' | 'dire'
  ): JugadorVivo => {
    const base = semillaDe(jugador.user_id || `jugador-${indice}`);
    const heroe = HEROES[indice % HEROES.length];
    const rol = indice % 5;
    const factor = FACTOR_FARMA[rol];

    // K/D/A y marcador crecen con el reloj (a los ~24 min coinciden con la
    // tabla de referencia).
    const kda = KDA[base % KDA.length];
    const avance = Math.min(1.1, minutos / 23.7);
    const kills = Math.floor(kda.kills * avance);
    const deaths = Math.floor(kda.deaths * avance);
    const assists = Math.floor(kda.assists * avance);

    const gpm = Math.round(300 + (base % 180) + factor * 240);
    const xpm = gpm + 90 + (base % 60);
    const oro = Math.round(180 + minutos * gpm * (0.18 + (base % 20) / 100));
    const netWorth = Math.round(minutos * gpm * 0.85 + 500);
    const nivel = Math.min(30, Math.max(1, Math.floor(minutos * 1.15) + 1));

    // Muerto de vez en cuando: cambia solo con el reloj, sin azar.
    const turnoRespawn = Math.floor(duracion / 9);
    const respawn =
      deaths > 0 && (turnoRespawn + base) % 9 === 0 ? 6 + (base % 28) : 0;

    const ruta = RUTAS[rol];
    // Avance por el carril: crece con el reloj y se separa un poco por posición
    // para que los cinco no vayan apilados.
    const avanceMapa = Math.min(
      0.95,
      (0.05 + (minutos / 60) * 0.75 + indiceEquipo * 0.09 + (base % 13) / 50) % 1
    );
    const punto = puntoEnRuta(ruta, avanceMapa);

    return {
      accountId: indice + 1,
      nick: jugador.profiles?.nick?.trim() || `Jugador ${indice + 1}`,
      heroId: heroe.id,
      heroNombre: heroe.nombre,
      heroSlug: heroe.slug,
      kills,
      deaths,
      assists,
      nivel,
      oro,
      netWorth,
      gpm,
      xpm,
      ultimosGolpes: Math.round(minutos * (1.1 + factor * 5.8)),
      denies: Math.round(minutos * (0.15 + (base % 7) * 0.12)),
      items: construirItems(base, rol, minutos),
      neutral: minutos >= 15 ? NEUTRALES[base % NEUTRALES.length] : null,
      respawn,
      x: Math.round((lado === 'radiant' ? punto.x : 100 - punto.x) * 10) / 10,
      y: Math.round((lado === 'radiant' ? punto.y : 100 - punto.y) * 10) / 10,
    };
  };

  const radiant = radiantSala.map((jugador, indice) =>
    aJugador(jugador, indice, indice, 'radiant')
  );
  const dire = direSala.map((jugador, indice) =>
    aJugador(jugador, indice + radiant.length, indice, 'dire')
  );

  const killsDe = (equipo: JugadorVivo[]) =>
    equipo.reduce((total, jugador) => total + jugador.kills, 0);

  // Torres: caen de forma pareja con el reloj y algo más en el lado que va
  // perdiendo.
  const caidas = Math.min(20, Math.floor(minutos / 3.4));
  const caidasRadiant = Math.round(caidas * 0.55);
  const caidasDire = caidas - caidasRadiant;

  return {
    matchId: 9055212787,
    duracionSegundos: duracion,
    esDia: esDeDia(duracion),
    radiant: {
      score: killsDe(radiant),
      torres: Math.max(0, 11 - caidasRadiant),
      jugadores: radiant,
    },
    dire: {
      score: killsDe(dire),
      torres: Math.max(0, 11 - caidasDire),
      jugadores: dire,
    },
  };
}

/**
 * Héroe y estadísticas de un jugador dentro de la partida en vivo.
 * Se busca por nick porque el mock se arma con los jugadores de la sala.
 */
export function jugadorVivoDe(
  partida: PartidaViva | null,
  nick: string | null | undefined
): JugadorVivo | null {
  if (!partida || !nick) return null;

  const objetivo = nick.trim();
  if (!objetivo) return null;

  const jugadores = [...partida.radiant.jugadores, ...partida.dire.jugadores];
  return jugadores.find((jugador) => jugador.nick === objetivo) ?? null;
}
