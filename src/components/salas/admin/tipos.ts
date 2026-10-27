export type Confirmacion =
  | { tipo: 'expulsar'; userId: string; nick?: string }
  | { tipo: 'cancelar' }
  | { tipo: 'terminar' }
  | { tipo: 'cancelar_picks' };
