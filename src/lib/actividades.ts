/**
 * Tipos y helpers del feed público de actividades (donaciones y multas).
 *
 * Los datos salen de la tabla `actividades`, que es de lectura pública: solo
 * muestra nicks, avatares, monto y motivo. Nunca se expone `steam_id`.
 */

import type { RolDota } from '@/lib/types';

export type ActividadTipo = 'donacion' | 'multa';

export type PerfilActividad = {
  nick: string | null;
  steam_avatar_url: string | null;
  steam_nombre?: string | null;
  mmr?: number | null;
  roles_preferidos?: RolDota[] | null;
};

export type Actividad = {
  id: string;
  tipo: ActividadTipo;
  emisor_id: string | null;
  receptor_id: string | null;
  monto: number;
  descripcion: string | null;
  creado_en: string;
  emisor?: PerfilActividad | null;
  receptor?: PerfilActividad | null;
};

export function formatoSoles(centimos: number) {
  return `S/ ${(centimos / 100).toFixed(2)}`;
}

export function nombreDe(perfil?: PerfilActividad | null) {
  return perfil?.nick?.trim() || 'Jugador';
}

/** "hace 5 min", "hace 2 h", "ayer"… */
export function tiempoRelativo(fecha: string) {
  const ms = new Date(fecha).getTime();
  if (!Number.isFinite(ms)) return '';

  const minutos = Math.round((Date.now() - ms) / 60000);
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.round(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;

  return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

/** Etiquetas lindas para los tipos de movimiento de la billetera. */
export const ETIQUETAS_MOVIMIENTO: Record<string, string> = {
  recarga: 'Recarga',
  retiro: 'Retiro',
  entrada_sala: 'Entrada a sala',
  reembolso: 'Reembolso',
  premio: 'Premio',
  ajuste_admin: 'Ajuste del admin',
  donacion_enviada: 'Donación enviada',
  donacion_recibida: 'Donación recibida',
  perdida_partida: 'Pérdida de partida',
};
