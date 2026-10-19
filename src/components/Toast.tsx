'use client';

import { useEffect, useRef } from 'react';

type Props = {
  mensaje: string | null;
  tipo?: 'success' | 'error' | 'info';
  onClose: () => void;
};

export default function Toast({ mensaje, tipo = 'info', onClose }: Props) {
  const cerrarRef = useRef(onClose);

  useEffect(() => {
    cerrarRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!mensaje) return;

    const timer = setTimeout(() => cerrarRef.current(), 4000);
    return () => clearTimeout(timer);
  }, [mensaje]);

  if (!mensaje) return null;

  const estilos: Record<string, string> = {
    success: 'border-emerald-500/30 bg-[#0f2a22] text-emerald-200',
    error: 'border-rose-500/30 bg-[#2a1118] text-rose-200',
    info: 'border-white/10 bg-[#111827] text-slate-200',
  };

  return (
    <div
      role="status"
      className={`fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-arena backdrop-blur ${estilos[tipo]}`}
    >
      {mensaje}
    </div>
  );
}
