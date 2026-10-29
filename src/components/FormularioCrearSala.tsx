'use client';

import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import CamposImportesSala from '@/components/CamposImportesSala';
import { centimosDeTexto } from '@/lib/importesSala';

type Props = {
  /** Se llama cuando la sala ya está creada. */
  onCreada?: (salaId: string) => void;
  onCancelar?: () => void;
  /** Muestra el botón de cancelar (para el modal). */
  mostrarCancelar?: boolean;
};

/**
 * Formulario de creación de sala (lo usan el panel admin y el landing).
 * La RPC valida que quien llame sea admin y guarda el premio anunciado.
 */
export default function FormularioCrearSala({
  onCreada,
  onCancelar,
  mostrarCancelar = false,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [cuota, setCuota] = useState('');
  const [modalidad, setModalidad] = useState<'1v1' | '5v5'>('5v5');
  const [premio, setPremio] = useState('');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crearSala(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (creando) return;

    setError(null);

    if (!nombre.trim()) {
      setError('Escribe un nombre para la sala');
      return;
    }

    const cuotaCentimos = centimosDeTexto(cuota);
    if (cuotaCentimos === null || cuotaCentimos < 100) {
      setError('Escribe una cuota desde S/ 1.00, con hasta dos decimales.');
      return;
    }

    const premioCentimos = centimosDeTexto(premio);
    if (premioCentimos === null || premioCentimos < 1) {
      setError('Escribe un premio desde S/ 0.01, con hasta dos decimales.');
      return;
    }

    setCreando(true);

    try {
      const { data, error: rpcError } = await supabase.rpc('crear_sala_con_premio', {
        p_nombre: nombre.trim(),
        p_cuota: cuotaCentimos,
        p_cupo: modalidad === '1v1' ? 2 : 10,
        p_premio_por_ganador: premioCentimos,
      });
      if (rpcError) { setError('Error al crear sala: ' + rpcError.message); return; }
      onCreada?.(typeof data === 'string' ? data : '');
    } catch {
      setError('No se pudo confirmar la creación. Revisa la lista de salas antes de intentarlo de nuevo.');
    } finally {
      setCreando(false);
    }
  }

  return (
    <form onSubmit={crearSala}>
      {error && (
        <div role="alert" className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="sala-nombre" className="block text-sm font-medium text-slate-300">
            Nombre
          </label>
          <input
            id="sala-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
            placeholder="Ej: Sala Pro 5v5"
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-300">Modalidad</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setModalidad('1v1')}
              className={`rounded border-2 px-4 py-3 text-lg font-semibold ${
                modalidad === '1v1'
                  ? 'border-prism-400 bg-prism-500/15 text-prism-200'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              1 vs 1
            </button>
            <button
              type="button"
              onClick={() => setModalidad('5v5')}
              className={`rounded border-2 px-4 py-3 text-lg font-semibold ${
                modalidad === '5v5'
                  ? 'border-prism-400 bg-prism-500/15 text-prism-200'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              5 vs 5
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {modalidad === '1v1'
              ? '2 jugadores: 1 Radiant y 1 Dire'
              : '10 jugadores: 5 Radiant y 5 Dire'}
          </p>
        </div>

      </div>

      <div className="mt-4">
        <CamposImportesSala cuota={cuota} premio={premio} cupo={modalidad === '1v1' ? 2 : 10}
          setCuota={setCuota} setPremio={setPremio} disabled={creando} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={creando}
          className="rounded-lg bg-emerald-500 px-6 py-2.5 font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {creando ? 'Creando...' : 'Crear sala'}
        </button>
        {mostrarCancelar && onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            disabled={creando}
            className="rounded-lg border border-white/10 bg-white/5 px-6 py-2.5 font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
