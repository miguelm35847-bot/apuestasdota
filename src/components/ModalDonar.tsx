'use client';

import { useEffect, useState, useRef, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import Avatar from '@/components/Avatar';
import { formatoSoles } from '@/lib/actividades';

type Props = {
  receptor: { id: string; nick: string | null; steam_avatar_url: string | null } | null;
  onCerrar: () => void;
  onListo?: (mensaje: string) => void;
};

/**
 * Modal de donación de saldo a otro jugador.
 * Todo el movimiento ocurre en la RPC `donar_saldo` (una sola operación).
 * El padre lo monta solo cuando está abierto, así que cada vez empieza limpio.
 */
export default function ModalDonar({ receptor, onCerrar, onListo }: Props) {
  const peticion=useRef<{id:string;datos:string}|null>(null);
  const [monto, setMonto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [saldo, setSaldo] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    void supabase.rpc('mi_saldo').then(({ data }) => {
      if (activo && typeof data === 'number') setSaldo(data);
    });

    return () => {
      activo = false;
    };
  }, []);

  if (!receptor) return null;

  const centavos = Math.round(Number(monto) * 100);
  const montoValido =
    monto.trim() !== '' &&
    Number.isFinite(Number(monto)) &&
    Number.isSafeInteger(centavos) &&
    centavos > 0;
  const saldoInsuficiente =
    montoValido && saldo !== null && centavos > saldo;

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!montoValido || enviando) return;

    setEnviando(true);
    setError(null);

    const datos=JSON.stringify([receptor!.id,centavos,mensaje.trim()]);
    if(peticion.current?.datos!==datos)peticion.current={id:crypto.randomUUID(),datos};
    const { error: rpcError } = await supabase.rpc('donar_saldo_seguro', {
      p_peticion:peticion.current.id,
      p_receptor: receptor!.id,
      p_monto: centavos,
      p_mensaje: mensaje.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setEnviando(false);
      return;
    }

    // Actualiza el saldo del navbar
    window.dispatchEvent(new Event('saldo:refresh'));

    const texto = `Donaste ${formatoSoles(centavos)} a ${receptor!.nick ?? 'el jugador'}.`;
    setEnviando(false);
    onListo?.(texto);
    onCerrar();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donar-dialog-title"
    >
      <div className="arena-card w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="donar-dialog-title" className="font-display text-lg font-bold text-white">
              Donar saldo
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Tu saldo se descuenta al instante y el receptor lo recibe.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <Avatar nick={receptor.nick} src={receptor.steam_avatar_url} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {receptor.nick ?? 'Jugador'}
            </p>
            <p className="text-xs text-slate-400">
              Tu saldo:{' '}
              {saldo === null ? '…' : formatoSoles(saldo)}
            </p>
          </div>
        </div>

        <form onSubmit={enviar} className="mt-4 space-y-4">
          <div>
            <label htmlFor="monto-donacion" className="text-xs font-semibold text-slate-300">
              Monto a donar
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                S/
              </span>
              <input
                id="monto-donacion"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
              />
            </div>
            {saldoInsuficiente && (
              <p className="mt-1 text-[11px] text-amber-300">
                No tienes saldo suficiente para esa cantidad.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="mensaje-donacion" className="text-xs font-semibold text-slate-300">
              Mensaje <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <input
              id="mensaje-donacion"
              type="text"
              maxLength={140}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="¡Gracias por elLDL!"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCerrar}
              disabled={enviando}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!montoValido || saldoInsuficiente || enviando}
              className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {enviando ? 'Enviando...' : 'Donar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
