import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const STEAM_STATE_COOKIE = 'steam_oauth_state';
export const STEAM_STATE_MAX_AGE = 10 * 60; // 10 minutos

type SteamStatePayload = {
  sub: string;
  exp: number;
  nonce: string;
};

function secreto(): string {
  const valor =
    process.env.STEAM_STATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  if (!valor) {
    throw new Error('Falta STEAM_STATE_SECRET o SUPABASE_SERVICE_ROLE_KEY');
  }

  return valor;
}

function base64url(valor: string | Buffer): string {
  return Buffer.from(valor).toString('base64url');
}

function firmar(payload: string): string {
  return createHmac('sha256', secreto()).update(payload).digest('base64url');
}

/**
 * Crea un state firmado y de corta duración para el flujo OpenID de Steam.
 * No contiene tokens de sesión: solo el id del usuario, la expiración y un nonce.
 */
export function crearStateSteam(userId: string): string {
  const payload = base64url(
    JSON.stringify({
      sub: userId,
      exp: Date.now() + STEAM_STATE_MAX_AGE * 1000,
      nonce: randomBytes(16).toString('hex'),
    } satisfies SteamStatePayload)
  );

  return `${payload}.${firmar(payload)}`;
}

/**
 * Verifica la firma, la expiración y devuelve el id del usuario.
 */
export function verificarStateSteam(state: string | null): string | null {
  if (!state) return null;

  const separador = state.lastIndexOf('.');
  if (separador <= 0 || separador === state.length - 1) return null;

  const payload = state.slice(0, separador);
  const firma = state.slice(separador + 1);
  const esperada = firmar(payload);

  const firmaBuffer = Buffer.from(firma);
  const esperadaBuffer = Buffer.from(esperada);

  if (
    firmaBuffer.length !== esperadaBuffer.length ||
    !timingSafeEqual(firmaBuffer, esperadaBuffer)
  ) {
    return null;
  }

  try {
    const datos = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as Partial<SteamStatePayload>;

    if (
      typeof datos.sub !== 'string' ||
      typeof datos.exp !== 'number' ||
      datos.exp < Date.now()
    ) {
      return null;
    }

    return datos.sub;
  } catch {
    return null;
  }
}
