export type RolDota = 'carry' | 'mid' | 'off' | 'roamer' | 'support';

export type PerfilPublico = {
  nick: string;
  steam_avatar_url?: string | null;
  steam_nombre?: string | null;
  mmr?: number | null;
  roles_preferidos?: RolDota[] | null;
};

export type Perfil = {
  id: string;
  nick: string;
  steam_id: string | null;
  steam_avatar_url?: string | null;
  steam_nombre?: string | null;
  rol?: string;
  baneado?: boolean;
  mmr?: number | null;
  roles_preferidos?: RolDota[] | null;
};

export type PicksEstado = 'inactivo' | 'eleccion' | 'en_curso' | 'terminado';
export type PickDecisionTipo = 'moneda' | 'lado';

export type Sala = {
  id: string;
  nombre: string;
  cuota: number;
  cupo: number;
  comision_bp: number;
  estado: string;
  modalidad?: string;
  destacada?: boolean;
  creado_por?: string;
  /** Se guarda cuando la sala pasa a `en_juego` (trigger `marcar_inicio_sala`). */
  iniciada_at?: string | null;
  created_at: string;
  participantes_sala?: { count: number }[];
  participantes_count?: number;
  picks_estado?: PicksEstado;
  pick_capitan1?: string | null;
  pick_capitan2?: string | null;
  pick_ganador_moneda?: string | null;
  pick_decision_user_id?: string | null;
  pick_decision_tipo?: PickDecisionTipo | null;
  pick_primer_user_id?: string | null;
  pick_turno_user_id?: string | null;
  pick_turno_expira_at?: string | null;
  verificacion_estado?: string;
  verificacion_iniciada_at?: string | null;
  verificacion_expira_at?: string | null;
};

export type Participante = {
  user_id: string;
  equipo: number | null;
  es_capitan?: boolean;
  pick_orden?: number | null;
  verificado_at?: string | null;
  /** Preferencia informativa de lado durante los picks: 1 = Radiant, 2 = Dire. */
  preferencia_equipo?: number | null;
  profiles: PerfilPublico | null;
  created_at?: string;
};

export type Lobby = {
  sala_id: string;
  nombre: string;
  clave: string;
};

export type Partida = {
  dota_match_id: number | null;
  equipo_ganador: number;
  pozo: number;
  comision?: number;
  premio_por_ganador: number;
};

export type Recarga = {
  id: string;
  user_id: string;
  monto: number;
  numero_operacion: string;
  captura_path?: string | null;
  captura_url?: string | null;
  estado: string;
  nota_admin?: string | null;
  created_at: string;
  profiles?: PerfilPublico | null;
};

export type Retiro = {
  id: string;
  user_id: string;
  monto: number;
  destino: string;
  estado: string;
  created_at: string;
  nota_admin: string | null;
  profiles?: PerfilPublico | null;
};

export type Movimiento = {
  id: string;
  tipo: string;
  monto: number;
  descripcion: string | null;
  created_at: string;
};

export type Notificacion = {
  id: string;
  tipo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
};

export type MensajeChat = {
  id: string;
  sala_id: string | null;
  user_id: string;
  mensaje: string;
  created_at: string;
  profiles: PerfilPublico | null;
};

export type DotaPlayer = {
  name?: string;
  hero_id?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  player_slot?: number;
};

export type DotaMatch = {
  match_id: number;
  radiant_win: boolean;
  duration: number;
  radiant_score: number;
  dire_score: number;
  fuente?: 'steam' | 'opendota';
  players?: DotaPlayer[];
};
