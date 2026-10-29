import type { PerfilPublico } from '@/lib/types';

export type SalaPublica = {
  id: string;
  nombre: string;
  cuota: number;
  cupo: number;
  comision_bp: number | null;
  premio_por_ganador?: number | null;
  estado: string;
  modalidad: string | null;
  destacada?: boolean | null;
  iniciada_at?: string | null;
  participantes_sala: { count: number }[];
};

export type ParticipantePublico = {
  sala_id: string;
  user_id: string;
  equipo: number | null;
  profiles: PerfilPublico | null;
};
