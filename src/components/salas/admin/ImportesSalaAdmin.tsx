'use client';

import { useState, type FormEvent } from 'react';
import CamposImportesSala from '@/components/CamposImportesSala';
import { centimosDeTexto, premioPorGanador } from '@/lib/importesSala';
import { supabase } from '@/lib/supabase';
import type { Sala } from '@/lib/types';

type Props = { sala: Sala; participantes: number; onActualizados: () => Promise<void> };

export function ImportesSalaAdmin({ sala, participantes, onActualizados }: Props) {
  const [cuota, setCuota] = useState((sala.cuota / 100).toFixed(2));
  const [premio, setPremio] = useState((premioPorGanador(sala) / 100).toFixed(2));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bloqueado = sala.estado !== 'abierta' || participantes > 0;
  const sinCambios = centimosDeTexto(cuota) === sala.cuota && centimosDeTexto(premio) === premioPorGanador(sala);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guardando || bloqueado || sinCambios) return;
    setError(null);
    const entrada = centimosDeTexto(cuota);
    const abono = centimosDeTexto(premio);
    if (entrada === null || entrada < 100) { setError('Escribe una cuota desde S/ 1.00, con hasta dos decimales.'); return; }
    if (abono === null || abono < 1) { setError('Escribe un premio desde S/ 0.01, con hasta dos decimales.'); return; }
    setGuardando(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_actualizar_importes_sala', {
        p_sala: sala.id, p_cuota: entrada, p_premio_por_ganador: abono,
      });
      if (rpcError) { setError(rpcError.message); return; }
      await onActualizados();
      window.dispatchEvent(new Event('salas:refresh'));
    } catch {
      setError('No se pudo confirmar el cambio. Revisa la conexión y vuelve a consultar la sala.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft">
      <h2 className="font-display text-base font-bold text-white">Cuota y premio</h2>
      <p className="mb-3 mt-1 text-xs leading-5 text-slate-400">Define cuánto aporta cada jugador y cuánto recibe cada ganador.</p>
      <form onSubmit={guardar}>
        <CamposImportesSala cuota={cuota} premio={premio} cupo={sala.cupo} setCuota={setCuota} setPremio={setPremio}
          disabled={bloqueado || guardando} prefijo="admin-sala" />
        {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
        <button type="submit" disabled={bloqueado || guardando || sinCambios}
          className="mt-3 w-full rounded-lg bg-prism-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-prism-400 disabled:cursor-not-allowed disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Guardar cuota y premio'}
        </button>
        <p className={`mt-2 text-xs leading-5 ${bloqueado ? 'text-amber-200' : 'text-slate-400'}`}>
          {bloqueado
            ? 'Los importes quedan bloqueados cuando hay jugadores inscritos o la sala ya no está abierta.'
            : 'Puedes modificarlos mientras la sala esté abierta y sin jugadores.'}
        </p>
      </form>
    </section>
  );
}
