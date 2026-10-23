export type PerfilApuesta = { nick: string | null; steam_avatar_url: string | null };
export type Apuesta = {
  id: string;
  sala_id: string;
  creador_id: string;
  aceptante_id: string | null;
  equipo_creador: number;
  estado: string;
  ganador_id: string | null;
  creado_en: string;
  creador: PerfilApuesta | null;
  aceptante: PerfilApuesta | null;
};

// Campos públicos explícitos; nunca consultar datos privados del perfil.
export const CAMPOS_APUESTA = 'id, sala_id, creador_id, aceptante_id, equipo_creador, estado, ganador_id, creado_en, creador:profiles!apuestas_sala_creador_id_fkey(nick, steam_avatar_url), aceptante:profiles!apuestas_sala_aceptante_id_fkey(nick, steam_avatar_url)';
export const PAGINA_APUESTAS = 10;
export const ladoApuesta = (equipo: number) => equipo === 1 ? 'Radiant' : 'Dire';
