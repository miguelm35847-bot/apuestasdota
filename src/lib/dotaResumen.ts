import { dotabuffPlayerUrl, steam64ToAccountId } from '@/lib/playerLinks';

/**
 * Resumen de Dota 2 de un jugador para mostrarlo en las salas.
 *
 * Los datos vienen de la API pública de OpenDota (la misma fuente que
 * Dotabuff). Todo se calcula en el servidor: nunca sale el `steam_id` ni el
 * `steam64`; solo datos agregados y la URL pública de Dotabuff.
 *
 * Se cachea en memoria para no castigar la API pública:
 *  - catálogo de héroes: 24 h
 *  - resumen por jugador: 20 min
 */

const OPEN_DOTA = 'https://api.opendota.com/api';
const TTL_HEROES_MS = 24 * 60 * 60 * 1000;
const TTL_RESUMEN_MS = 20 * 60 * 1000;
const ULTIMAS_PARTIDAS = 20;

export type HeroResumen = {
  id: number;
  nombre: string;
  imagen: string;
  partidas: number;
};

export type RolResumen = {
  rol: string;
  partidas: number;
  winrate: number;
};

export type ResumenDota = {
  disponible: boolean;
  dotabuffUrl: string | null;
  /** Los 3 héroes más jugados. */
  heroes: HeroResumen[];
  /** Los 3 roles más jugados con su winrate. */
  roles: RolResumen[];
  /** Los roles de las últimas partidas, del más reciente al más antiguo. */
  rolesRecientes: string[];
  winrateReciente: number | null;
  partidasAnalizadas: number;
  ultimaPartida: {
    heroe: string;
    imagen: string;
    victoria: boolean;
    duracion: number;
    fecha: string;
  } | null;
};

type HeroCatalogo = {
  id: number;
  name: string;
  localized_name: string;
};

type PartidaOpenDota = {
  hero_id: number;
  radiant_win: boolean;
  player_slot: number;
  start_time: number;
  duration: number;
  lane_role: number;
};

const cacheHeroes = new Map<number, { nombre: string; imagen: string; expira: number }>();
let cacheCatalogo: { heroes: Map<number, HeroCatalogo>; expira: number } | null = null;
const cacheResumen = new Map<string, { expira: number; resumen: ResumenDota }>();

const ROLES: Record<number, string> = {
  1: 'Safe / Carry',
  2: 'Mid',
  3: 'Offlane',
  4: 'Support',
};

function slugDeHeroe(name: string) {
  return name.replace(/^npc_dota_hero_/, '');
}

/** El jugador es Radiant si su player_slot es menor que 128. */
function gano(partida: PartidaOpenDota) {
  const esRadiant = (partida.player_slot ?? 0) < 128;
  return esRadiant ? partida.radiant_win : !partida.radiant_win;
}

async function catalogoHeroes(): Promise<Map<number, HeroCatalogo>> {
  if (cacheCatalogo && cacheCatalogo.expira > Date.now()) return cacheCatalogo.heroes;

  const respuesta = await fetch(`${OPEN_DOTA}/heroes`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 86400 },
  });

  if (!respuesta.ok) {
    if (cacheCatalogo) return cacheCatalogo.heroes;
    throw new Error('OpenDota no respondio');
  }

  const heroes = (await respuesta.json()) as HeroCatalogo[];
  const mapa = new Map(heroes.map((h) => [h.id, h]));

  cacheCatalogo = { heroes: mapa, expira: Date.now() + TTL_HEROES_MS };
  return mapa;
}

async function infoHeroe(heroId: number) {
  const guardado = cacheHeroes.get(heroId);
  if (guardado && guardado.expira > Date.now()) return guardado;

  const catalogo = await catalogoHeroes();
  const hero = catalogo.get(heroId);
  if (!hero) return null;

  const info = {
    nombre: hero.localized_name || hero.name,
    imagen: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${slugDeHeroe(hero.name)}.png`,
    expira: Date.now() + TTL_HEROES_MS,
  };

  cacheHeroes.set(heroId, info);
  return info;
}

function sinResumen(dotabuffUrl: string | null): ResumenDota {
  return {
    disponible: false,
    dotabuffUrl,
    heroes: [],
    roles: [],
    rolesRecientes: [],
    winrateReciente: null,
    partidasAnalizadas: 0,
    ultimaPartida: null,
  };
}

/**
 * Resumen de las últimas partidas públicas de un jugador.
 * Si el jugador no tiene partidas públicas (cuenta privada o sin historial),
 * devuelve `disponible: false` y la UI simplemente no muestra nada.
 */
export async function obtenerResumenDota(
  usuarioId: string,
  steamId: string | null | undefined
): Promise<ResumenDota> {
  const accountId = steam64ToAccountId(steamId);
  const dotabuffUrl = dotabuffPlayerUrl(steamId);

  if (accountId === null) return sinResumen(dotabuffUrl);

  const guardado = cacheResumen.get(usuarioId);
  if (guardado && guardado.expira > Date.now()) {
    return { ...guardado.resumen, dotabuffUrl: guardado.resumen.dotabuffUrl ?? dotabuffUrl };
  }

  try {
    const respuesta = await fetch(
      `${OPEN_DOTA}/players/${accountId}/recentMatches?limit=${ULTIMAS_PARTIDAS}`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 1200 } }
    );

    if (!respuesta.ok) {
      const vacio = sinResumen(dotabuffUrl);
      cacheResumen.set(usuarioId, { expira: Date.now() + 5 * 60 * 1000, resumen: vacio });
      return vacio;
    }

    const partidas = (await respuesta.json()) as PartidaOpenDota[] | null;
    if (!Array.isArray(partidas) || partidas.length === 0) {
      const vacio = sinResumen(dotabuffUrl);
      cacheResumen.set(usuarioId, { expira: Date.now() + 20 * 60 * 1000, resumen: vacio });
      return vacio;
    }

    const porHeroe = new Map<number, { partidas: number; victorias: number }>();
    const porRol = new Map<number, { partidas: number; victorias: number }>();

    for (const partida of partidas) {
      const actual = porHeroe.get(partida.hero_id) ?? { partidas: 0, victorias: 0 };
      actual.partidas += 1;
      if (gano(partida)) actual.victorias += 1;
      porHeroe.set(partida.hero_id, actual);

      const rol = partida.lane_role;
      if (rol && ROLES[rol]) {
        const actualRol = porRol.get(rol) ?? { partidas: 0, victorias: 0 };
        actualRol.partidas += 1;
        if (gano(partida)) actualRol.victorias += 1;
        porRol.set(rol, actualRol);
      }
    }

    const heroeTop = [...porHeroe.entries()].sort((a, b) => b[1].partidas - a[1].partidas).slice(0, 3);
    const rolTop = [...porRol.entries()].sort((a, b) => b[1].partidas - a[1].partidas).slice(0, 3);

    const heroes = (
      await Promise.all(
        heroeTop.map(async ([heroId, datos]) => {
          const info = await infoHeroe(heroId);
          return info
            ? { id: heroId, nombre: info.nombre, imagen: info.imagen, partidas: datos.partidas }
            : null;
        })
      )
    ).filter((h): h is HeroResumen => h !== null);

    const roles = rolTop.map(([rol, datos]) => ({
      rol: ROLES[rol],
      partidas: datos.partidas,
      winrate: Math.round((datos.victorias / datos.partidas) * 100),
    }));

    // Los roles de las últimas partidas (del más reciente al más antiguo).
    const rolesRecientes = partidas
      .slice(0, 3)
      .map((partida) => (partida.lane_role ? ROLES[partida.lane_role] : null))
      .filter((rol): rol is string => Boolean(rol));

    const ultimasDiez = partidas.slice(0, 10);
    const victoriasRecientes = ultimasDiez.filter((p) => gano(p)).length;
    const winrateReciente = ultimasDiez.length
      ? Math.round((victoriasRecientes / ultimasDiez.length) * 100)
      : null;

    const ultima = partidas[0];
    const infoUltima = await infoHeroe(ultima.hero_id);

    const resumen: ResumenDota = {
      disponible: true,
      dotabuffUrl,
      heroes,
      roles,
      rolesRecientes,
      winrateReciente,
      partidasAnalizadas: partidas.length,
      ultimaPartida: infoUltima
        ? {
            heroe: infoUltima.nombre,
            imagen: infoUltima.imagen,
            victoria: gano(ultima),
            duracion: Math.round(ultima.duration),
            fecha: new Date(ultima.start_time * 1000).toISOString(),
          }
        : null,
    };

    cacheResumen.set(usuarioId, { expira: Date.now() + TTL_RESUMEN_MS, resumen });
    return resumen;
  } catch {
    const vacio = sinResumen(dotabuffUrl);
    cacheResumen.set(usuarioId, { expira: Date.now() + 5 * 60 * 1000, resumen: vacio });
    return vacio;
  }
}
