import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';

export const STEAM_STATE_COOKIE = 'steam_oauth_state';
export const STEAM_ENTREGA_COOKIE = 'steam_login_handoff';
export const STEAM_STATE_MAX_AGE = 600;
export const STEAM_ENTREGA_MAX_AGE = 120;
export const STEAM_CALLBACK = '/api/auth/steam/callback';
export const hashSteam = (valor: string) => createHash('sha256').update(valor).digest('hex');

export function crearTokenSteam(id: string = randomUUID()) {
  const secreto = randomBytes(32).toString('base64url');
  return { id, valor: `${id}.${secreto}`, hash: hashSteam(secreto) };
}

export function leerTokenSteam(valor: string | null | undefined) {
  if (!valor || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.[A-Za-z0-9_-]{43}$/.test(valor)) return null;
  const [id, secreto] = valor.split('.');
  return { id, hash: hashSteam(secreto) };
}

export function challengeSteam(verificador: string): string | null {
  return /^[A-Za-z0-9_-]{43}$/.test(verificador) ? createHash('sha256').update(verificador).digest('base64url') : null;
}

/** Origen público configurado; solo se admite loopback sin configuración local. */
export function origenSteam(urlPeticion: string): string {
  const configurado = process.env.NEXT_PUBLIC_APP_URL;
  const url = new URL(configurado || urlPeticion);
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || (!configurado && !local)) throw new Error('Origen de Steam inválido');
  return url.origin;
}

/** La IP no se conserva en claro ni se utiliza como identidad de cuenta. */
export function remotoSteam(valor: string): string {
  const secreto = process.env.STEAM_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secreto) throw new Error('Configuración de Steam incompleta');
  return createHmac('sha256', secreto).update(valor.slice(0,200)).digest('hex');
}
