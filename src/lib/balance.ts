import type { Participante, PerfilPublico, RolDota } from '@/lib/types';

export const ROLES_DOTA: { id: RolDota; nombre: string }[] = [
  { id: 'carry', nombre: 'Carry' },
  { id: 'mid', nombre: 'Mid' },
  { id: 'off', nombre: 'Offlane' },
  { id: 'roamer', nombre: 'Roamer' },
  { id: 'support', nombre: 'Support' },
];

export const ICONOS_ROL: Record<RolDota, string> = {
  carry: '⚔️',
  mid: '🎯',
  off: '🛡️',
  roamer: '🏃',
  support: '✨',
};

export const ROLES_CORE: RolDota[] = ['carry', 'mid', 'off'];
export const ROLES_SUPPORT: RolDota[] = ['roamer', 'support'];
export const TODOS_LOS_ROLES: RolDota[] = ['carry', 'mid', 'off', 'roamer', 'support'];

export function etiquetaRol(rol: RolDota | string | null | undefined): string {
  return ROLES_DOTA.find((r) => r.id === rol)?.nombre ?? String(rol ?? '');
}

export function etiquetaRolConIcono(rol: RolDota | string | null | undefined): string {
  const id = rol as RolDota;
  const icono = ICONOS_ROL[id];
  return icono ? `${icono} ${etiquetaRol(rol)}` : etiquetaRol(rol);
}

export function resumenRoles(roles: RolDota[] | null | undefined): string {
  if (!roles || roles.length === 0) return 'Sin roles';
  return roles.map((r) => etiquetaRol(r)).join(' / ');
}

export function resumenRolesConIconos(roles: RolDota[] | null | undefined): string {
  if (!roles || roles.length === 0) return 'Sin roles';
  return roles.map((r) => etiquetaRolConIcono(r)).join(' · ');
}

export function formatearMmr(mmr: number | null | undefined): string {
  if (mmr === null || mmr === undefined) return 'Sin MMR';
  return String(mmr);
}

export function promedioMmr(valores: (number | null | undefined)[]): number | null {
  const validos = valores.filter((v): v is number => typeof v === 'number');
  if (validos.length === 0) return null;
  return Math.round(validos.reduce((a, b) => a + b, 0) / validos.length);
}

export function perfilDe(participante: Participante): PerfilPublico | null {
  return participante.profiles ?? null;
}

export function esCapitan(participante: Participante): boolean {
  return participante.es_capitan === true;
}

/**
 * Orden serpiente para 2 equipos con picks alternos:
 * A, B, B, A, A, B, B, A…
 * Debe coincidir con la función SQL `siguiente_capitan_de_pick`.
 */
export function capitanDePick(
  primer: string | null | undefined,
  otro: string | null | undefined,
  numeroPick: number
): string | null {
  if (!primer || !otro || numeroPick < 1) return null;
  const par = Math.floor((numeroPick - 1) / 2);
  const dentroDelPar = (numeroPick - 1) % 2;
  const invertido = par % 2 === 1;
  if (!invertido) return dentroDelPar === 0 ? primer : otro;
  return dentroDelPar === 0 ? otro : primer;
}
