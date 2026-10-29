/** Límite que mantiene exactos los totales de hasta diez jugadores en JavaScript. */
export const MAX_IMPORTE_SALA = 900_719_925_474_099;

export function centimosDeTexto(valor: string): number | null {
  const limpio = valor.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(limpio)) return null;
  const [entero, decimal = ''] = limpio.split('.');
  const centimos = Number(entero) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(centimos) && centimos <= MAX_IMPORTE_SALA ? centimos : null;
}

type CondicionesPremio = {
  cuota: number;
  cupo: number;
  premio_por_ganador?: number | null;
  comision_bp?: number | null;
};

/** Las salas anteriores conservan su cálculo hasta que el admin fije un premio. */
export function premioPorGanador(sala: CondicionesPremio): number {
  if (sala.premio_por_ganador != null) return sala.premio_por_ganador;
  const pozo = sala.cuota * sala.cupo;
  const comision = Math.floor((pozo * (sala.comision_bp ?? 0)) / 10000);
  return Math.floor((pozo - comision) / Math.max(1, Math.floor(sala.cupo / 2)));
}

export function resumenImportesSala(cuota: number, premio: number, cupo: number) {
  const recaudacion = cuota * cupo;
  const premios = premio * (cupo / 2);
  return { recaudacion, premios, diferencia: recaudacion - premios };
}
