const STEAM64_BASE = BigInt('76561197960265728');
const MAX_DOTA_ACCOUNT_ID = BigInt('4294967295');
const STEAM64_RE = /^\d{17}$/;

export type PlayerLinks = {
  steamUrl: string | null;
  dotabuffUrl: string | null;
};

/**
 * Convierte un SteamID64 al account_id de 32 bits que usa Dota 2 / Dotabuff.
 * Si ya recibe un account_id válido, lo devuelve tal cual.
 */
export function steam64ToAccountId(steamId: string | null | undefined): number | null {
  if (!steamId) return null;

  try {
    const numero = BigInt(steamId.trim());
    if (numero <= BigInt(0)) return null;

    const cuenta = numero >= STEAM64_BASE ? numero - STEAM64_BASE : numero;
    if (cuenta <= BigInt(0) || cuenta > MAX_DOTA_ACCOUNT_ID) return null;

    return Number(cuenta);
  } catch {
    return null;
  }
}

/** URL pública del perfil de Dotabuff para un SteamID64 o account_id. */
export function dotabuffPlayerUrl(steamId: string | null | undefined): string | null {
  const accountId = steam64ToAccountId(steamId);
  if (accountId === null) return null;

  return `https://www.dotabuff.com/players/${accountId}`;
}

/** URL pública del perfil de Steam para un SteamID64. */
export function steamProfileUrl(steamId: string | null | undefined): string | null {
  const id = steamId?.trim();
  if (!id || !STEAM64_RE.test(id)) return null;

  return `https://steamcommunity.com/profiles/${id}`;
}

/**
 * URLs públicas de Steam y Dotabuff para un SteamID64.
 * Nunca devuelve el SteamID: solo enlaces derivados.
 */
export function playerLinksFromSteamId(steamId: string | null | undefined): PlayerLinks {
  return {
    steamUrl: steamProfileUrl(steamId),
    dotabuffUrl: dotabuffPlayerUrl(steamId),
  };
}
