'use client';

import { centimosDeTexto, resumenImportesSala } from '@/lib/importesSala';

type Props = {
  cuota: string;
  premio: string;
  cupo: number;
  setCuota: (valor: string) => void;
  setPremio: (valor: string) => void;
  disabled?: boolean;
  prefijo?: string;
};

const soles = (centimos: number) => `S/ ${(centimos / 100).toFixed(2)}`;

export default function CamposImportesSala({
  cuota, premio, cupo, setCuota, setPremio, disabled = false, prefijo = 'sala',
}: Props) {
  const entrada = centimosDeTexto(cuota);
  const abono = centimosDeTexto(premio);
  const resumen = entrada !== null && entrada >= 100 && abono !== null && abono > 0
    ? resumenImportesSala(entrada, abono, cupo) : null;
  const campo = 'mt-1 block w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefijo}-cuota`} className="block text-sm font-medium text-slate-300">Cuota por jugador (S/)</label>
          <input id={`${prefijo}-cuota`} type="number" inputMode="decimal" min="1" step="0.01" required
            value={cuota} onChange={(event) => setCuota(event.target.value)} disabled={disabled}
            className={campo} placeholder="Ej: 11.00" />
        </div>
        <div>
          <label htmlFor={`${prefijo}-premio`} className="block text-sm font-medium text-slate-300">Premio por ganador (S/)</label>
          <input id={`${prefijo}-premio`} type="number" inputMode="decimal" min="0.01" step="0.01" required
            value={premio} onChange={(event) => setPremio(event.target.value)} disabled={disabled}
            aria-describedby={`${prefijo}-premio-ayuda`} className={campo} placeholder="Ej: 20.00" />
        </div>
      </div>
      <p id={`${prefijo}-premio-ayuda`} className="text-xs leading-5 text-slate-400">
        El premio es el abono total para cada jugador ganador e incluye su cuota aportada.
      </p>
      {resumen && (
        <div aria-live="polite" className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-slate-300">
          <p>Con {cupo} jugadores: se recauda <strong className="text-white">{soles(resumen.recaudacion)}</strong> y se reparte <strong className="text-white">{soles(resumen.premios)}</strong> entre {cupo / 2} {cupo === 2 ? 'ganador' : 'ganadores'}.</p>
          <p className={`mt-1 font-semibold ${resumen.diferencia < 0 ? 'text-amber-200' : 'text-emerald-300'}`}>
            {resumen.diferencia < 0
              ? `Bono de la casa: ${soles(-resumen.diferencia)} adicionales en total.`
              : resumen.diferencia === 0
                ? 'Sin comisión: todo lo recaudado se reparte en premios.'
                : `Diferencia para la casa: ${soles(resumen.diferencia)}.`}
          </p>
        </div>
      )}
    </div>
  );
}
