'use client';

import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Props = {
  /** Se llama cuando la sala ya está creada. */
  onCreada?: (salaId: string) => void;
  onCancelar?: () => void;
  /** Muestra el botón de cancelar (para el modal). */
  mostrarCancelar?: boolean;
};

/**
 * Formulario de creación de sala (lo usan el panel admin y el landing).
 * La RPC `crear_sala` valida que quien llame sea admin.
 */
export default function FormularioCrearSala({
  onCreada,
  onCancelar,
  mostrarCancelar = false,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [cuota, setCuota] = useState('');
  const [modalidad, setModalidad] = useState<'1v1' | '5v5'>('5v5');
  const [comision, setComision] = useState('1500');
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

    const cuotaNum = parseFloat(cuota);
    if (isNaN(cuotaNum) || cuotaNum < 1) {
      setError('La cuota mínima es S/ 1.00');
      return;
    }

    const comisionNum = parseInt(comision);
    if (isNaN(comisionNum) || comisionNum < 0 || comisionNum > 5000) {
      setError('La comisión debe estar entre 0 y 5000 (0-50%)');
      return;
    }

    setCreando(true);

    const { data, error: rpcError } = await supabase.rpc('crear_sala', {
      p_nombre: nombre.trim(),
      p_cuota: Math.round(cuotaNum * 100),
      p_cupo: modalidad === '1v1' ? 2 : 10,
      p_comision_bp: comisionNum,
    });

    if (rpcError) {
      setError('Error al crear sala: ' + rpcError.message);
      setCreando(false);
      return;
    }

    setCreando(false);
    onCreada?.(typeof data === 'string' ? data : '');
  }

  return (
    <form onSubmit={crearSala}>
      {error && (
        <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
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
          <label htmlFor="sala-cuota" className="block text-sm font-medium text-slate-300">
            Cuota (S/)
          </label>
          <input
            id="sala-cuota"
            type="number"
            step="0.01"
            min="1"
            value={cuota}
            onChange={(e) => setCuota(e.target.value)}
            className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
            placeholder="Ej: 10.00"
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

        <div>
          <label htmlFor="sala-comision" className="block text-sm font-medium text-slate-300">
            Comisión (%)
          </label>
          <input
            id="sala-comision"
            type="number"
            min="0"
            max="50"
            value={Math.round(parseInt(comision) / 100)}
            onChange={(e) => setComision(String(parseInt(e.target.value) * 100))}
            className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
          />
        </div>
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
