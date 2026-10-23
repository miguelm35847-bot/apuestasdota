export type JugadorResultado = { account_id?: number | null; player_slot?: number };
export type ResultadoDota = {
  match_id?: number;
  start_time?: number;
  duration?: number;
  radiant_win?: boolean;
  players?: JugadorResultado[];
};

/** Solo permite pagar el match asociado con todos los jugadores en sus lados. */
export function resultadoDotaVerificable(
  resultado: ResultadoDota,
  matchId: number,
  desde: number,
  cupo: number,
  roster: ReadonlyMap<number, { equipo: number | null }>,
  ahora: number,
): boolean {
  const { start_time: inicio, duration: duracion, players: jugadores } = resultado;
  if (resultado.match_id !== matchId || typeof resultado.radiant_win !== 'boolean') return false;
  if (!Number.isFinite(desde) || !Number.isFinite(inicio) || !Number.isFinite(duracion)) return false;
  if (!inicio || !duracion || inicio < desde || duracion <= 0 || inicio + duracion > ahora) return false;
  if (!jugadores || jugadores.length !== cupo || roster.size !== cupo) return false;
  const cuentas = new Set<number>();
  const lados = new Set<number>();
  for (const jugador of jugadores) {
    const cuenta = jugador.account_id;
    const slot = jugador.player_slot;
    if (typeof cuenta !== 'number' || typeof slot !== 'number' || !Number.isInteger(slot)) return false;
    if (!(slot >= 0 && slot <= 4) && !(slot >= 128 && slot <= 132)) return false;
    const lado = slot < 128 ? 1 : 2;
    if (cuentas.has(cuenta) || roster.get(cuenta)?.equipo !== lado) return false;
    cuentas.add(cuenta);
    lados.add(lado);
  }
  return cuentas.size === cupo && lados.size === 2;
}
