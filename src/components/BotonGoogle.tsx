'use client';

import { useRef, useState } from 'react';
import { iniciarAccesoGoogle } from '@/lib/googleAuth';

type Props = {
  disabled?: boolean;
  onError: (mensaje: string | null) => void;
  onProcesando: (valor: boolean) => void;
};

export default function BotonGoogle({ disabled, onError, onProcesando }: Props) {
  const [procesando, setProcesando] = useState(false);
  const enCurso = useRef(false);

  async function continuar() {
    if (enCurso.current || disabled) return;
    enCurso.current = true;
    setProcesando(true);
    onProcesando(true);
    onError(null);
    try {
      await iniciarAccesoGoogle();
    } catch {
      onError('No se pudo abrir el acceso con Google. Intenta de nuevo o ingresa con tu correo.');
      setProcesando(false);
      onProcesando(false);
      enCurso.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={continuar} disabled={disabled || procesando} aria-busy={procesando}
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-white/15 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-prism-400 disabled:cursor-wait disabled:opacity-60">
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
          <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4.1 6v5h6.6c3.9-3.6 6.1-8.7 6.1-14.7Z" />
          <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.9-3.6-11.5-8.4H5.7v5.2A20.4 20.4 0 0 0 24 44Z" />
          <path fill="#FBBC05" d="M12.5 27.6a12.3 12.3 0 0 1 0-7.2v-5.2H5.7a20 20 0 0 0 0 17.6l6.8-5.2Z" />
          <path fill="#EA4335" d="M24 12c3 0 5.6 1 7.7 3l5.8-5.7A19.4 19.4 0 0 0 24 4 20.4 20.4 0 0 0 5.7 15.2l6.8 5.2C14.1 15.6 18.7 12 24 12Z" />
        </svg>
        {procesando ? 'Conectando con Google…' : 'Continuar con Google'}
      </button>
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" />o con tu correo<span className="h-px flex-1 bg-white/10" />
      </div>
    </div>
  );
}
