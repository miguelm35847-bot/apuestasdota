export type Pestaña = 'historial' | 'movimientos' | 'billetera';

export type PartidaPerfil = {
  sala_id: string;
  equipo: number | null;
  salas: {
    nombre: string;
    cuota: number;
    created_at: string;
    partidas: {
      equipo_ganador: number;
      premio_por_ganador: number;
    } | null;
  };
};

export type RecargaPerfil = {
  id: string;
  monto: number;
  numero_operacion: string;
  estado: string;
  created_at: string;
};

export type RetiroPerfil = {
  id: string;
  monto: number;
  destino: string;
  estado: string;
  created_at: string;
};

export type MovimientoPerfil = {
  id: string;
  tipo: string;
  monto: number;
  descripcion: string | null;
  created_at: string;
};

export type PerdidaPerfil = {
  id: string;
  created_at: string;
  monto: number;
  sala_nombre: string;
};

export type ConteosPerfil = { partidas: number; movimientos: number; billetera: number };
export type SolicitudPerfil = { id: string; tipo: 'Recarga' | 'Retiro'; monto: number; estado: string; detalle: string; fecha: string };
export type MovimientoMostrado = { id: string; tipo: string; monto: number; detalle: string; fecha: string };
