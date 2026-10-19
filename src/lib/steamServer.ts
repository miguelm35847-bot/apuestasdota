const STEAM_API_KEY = process.env.STEAM_API_KEY || '';

const RESOLVE_VANITY_URL = 'https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/';
const PLAYER_SUMMARIES_URL = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/';

type SteamPlayerSummary = {
  personaname?: string;
  avatar?: string;
  avatarmedium?: string;
  avatarfull?: string;
  profileurl?: string;
};

type SteamSummariesResponse = {
  response?: {
    players?: SteamPlayerSummary[];
  };
};

type SteamVanityResponse = {
  response?: {
    success?: number;
    steamid?: string;
  };
};

export type SteamResumen = {
  steamId: string;
  nombre: string | null;
  avatarUrl: string | null;
  perfilUrl: string | null;
};

function extraerSteamIdNumerico(valor: string): string | null {
  const coincidencia = valor.match(/(\d{17})/);
  return coincidencia ? coincidencia[1] : null;
}

function extraerVanity(valor: string): string | null {
  const limpio = valor.trim();
  const coincidencia = limpio.match(/(?:^|\/)id\/([^/?#]+)/);
  if (coincidencia) return decodeURIComponent(coincidencia[1]);

  if (/^[a-zA-Z0-9_-]+$/.test(limpio)) return limpio;
  return null;
}

/**
 * Convierte un Steam ID numérico o una URL/vanity de Steam en el ID numérico.
 * Devuelve null si no se puede resolver.
 */
export async function resolverSteamId(valor: string): Promise<string | null> {
  const directo = extraerSteamIdNumerico(valor);
  if (directo) return directo;

  const vanity = extraerVanity(valor);
  if (!vanity || !STEAM_API_KEY) return null;

  try {
    const url = new URL(RESOLVE_VANITY_URL);
    url.searchParams.set('key', STEAM_API_KEY);
    url.searchParams.set('vanityurl', vanity);

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;

    const data = (await response.json()) as SteamVanityResponse;
    if (data.response?.success !== 1 || !data.response.steamid) return null;

    return data.response.steamid;
  } catch {
    return null;
  }
}

/**
 * Obtiene el nombre, avatar y perfil públicos de una cuenta de Steam.
 * La API key permanece siempre en el servidor.
 */
export async function obtenerResumenSteam(valor: string): Promise<SteamResumen | null> {
  if (!STEAM_API_KEY) return null;

  const steamId = await resolverSteamId(valor);
  if (!steamId) return null;

  try {
    const url = new URL(PLAYER_SUMMARIES_URL);
    url.searchParams.set('key', STEAM_API_KEY);
    url.searchParams.set('steamids', steamId);

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;

    const data = (await response.json()) as SteamSummariesResponse;
    const player = data.response?.players?.[0];
    if (!player) return null;

    const avatar = player.avatarmedium ?? player.avatar ?? player.avatarfull ?? null;

    return {
      steamId,
      nombre: player.personaname ?? null,
      avatarUrl: avatar ? avatar.replace(/^http:/, 'https:') : null,
      perfilUrl: player.profileurl ?? `https://steamcommunity.com/profiles/${steamId}`,
    };
  } catch {
    return null;
  }
}
