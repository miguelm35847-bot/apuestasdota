'use client';

import { useEffect } from 'react';

type Props = {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  confirmar?: string;
  cancelar?: string;
  peligro?: boolean;
  procesando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export default function ConfirmDialog({
  abierto,
  titulo,
  mensaje,
  confirmar = 'Confirmar',
  cancelar = 'Cancelar',
  peligro = false,
  procesando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  useEffect(() => {
    if (!abierto) return;

    function alPresionar(e: KeyboardEvent) {
      if (e.key === 'Escape' && !procesando) onCancelar();
    }

    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [abierto, procesando, onCancelar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="arena-card w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena">
        <h3 id="confirm-dialog-title" className="font-display text-lg font-bold text-white">
          {titulo}
        </h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-400">{mensaje}</p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            {cancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
              peligro ? 'bg-rose-600 hover:bg-rose-500' : 'bg-prism-500 hover:bg-prism-400'
            }`}
          >
            {procesando ? 'Procesando...' : confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
