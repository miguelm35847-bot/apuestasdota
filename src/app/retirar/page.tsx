'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import SaldoDisplay from '@/components/SaldoDisplay';
import Navbar from '@/components/Navbar';
import SoportePagos from '@/components/SoportePagos';
import { useArenaBody } from '@/lib/useArenaBody';
import type { Retiro } from '@/lib/types';

export default function RetirarPage() {
  useArenaBody();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const peticion=useRef<{id:string;datos:string}|null>(null);
  const [monto, setMonto] = useState('');
  const [destino, setDestino] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retiros, setRetiros] = useState<Retiro[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const cargarRetiros = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('retiros')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setRetiros(data as unknown as Retiro[]);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de la sesión
    if (user) void cargarRetiros();
  }, [user, cargarRetiros]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum < 5) {
      setError('El monto mínimo es S/ 5.00');
      return;
    }
    if (destino.trim().length < 6) {
      setError('Ingresa un número de Yape/Plin válido (mínimo 6 caracteres)');
      return;
    }

    setLoading(true);

    const datos=JSON.stringify([montoNum,destino.trim()]);
    if(peticion.current?.datos!==datos)peticion.current={id:crypto.randomUUID(),datos};
    const { error: rpcError } = await supabase.rpc('solicitar_retiro_seguro', {
      p_peticion:peticion.current.id,
      p_monto: Math.round(montoNum * 100),
      p_destino: destino.trim(),
    });

    if (rpcError) {
      const errores: Record<string, string> = {
        'No autenticado': 'Debes iniciar sesión',
        'Cuenta no disponible': 'Tu cuenta está baneada',
        'Retiro mínimo: S/ 5.00': 'El monto mínimo es S/ 5.00',
        'Destino inválido': 'Ingresa un destino válido',
        'Saldo insuficiente': 'No tienes saldo suficiente',
      };
      setError(errores[rpcError.message] ?? rpcError.message);
    } else {
      setSuccess('Retiro solicitado correctamente. Un administrador lo procesará.');
      peticion.current=null;
      setMonto('');
      setDestino('');
      cargarRetiros();
      window.dispatchEvent(new Event('saldo:refresh'));
    }

    setLoading(false);
  }

  function estadoBadge(estado: string) {
    const clases: Record<string, string> = {
      solicitado: 'bg-amber-500/15 text-amber-300',
      pagado: 'bg-emerald-500/15 text-emerald-300',
      rechazado: 'bg-rose-500/15 text-rose-300',
    };
    return clases[estado] ?? 'bg-white/5 text-slate-300';
  }

  if (authLoading) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Retirar saldo" />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <SaldoDisplay />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
          <h2 className="font-display text-lg font-bold text-white mb-4">Solicitar retiro</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="monto" className="block text-sm font-medium text-slate-300">
                Monto en soles (S/)
              </label>
              <input
                id="monto"
                type="number"
                step="0.01"
                min="5"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
                placeholder="Ej: 50.00"
              />
              <p className="mt-1 text-xs text-slate-500">Mínimo S/ 5.00</p>
            </div>

            <div>
              <label htmlFor="destino" className="block text-sm font-medium text-slate-300">
                Número de Yape/Plin
              </label>
              <input
                id="destino"
                type="text"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
                placeholder="Ej: 999999999"
              />
              <p className="mt-1 text-xs text-slate-500">
                Ingresa el número celular donde quieres recibir el dinero
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-prism-500 py-3 font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Solicitar retiro'}
            </button>
          </form>
        </div>

        <div className="mt-6 arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
          <h2 className="font-display text-lg font-bold text-white mb-4">Mis retiros</h2>
          {retiros.length === 0 ? (
            <p className="text-sm text-slate-500">No tienes retiros registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-2 text-left font-medium text-slate-400">Fecha</th>
                    <th className="pb-2 text-left font-medium text-slate-400">Monto</th>
                    <th className="pb-2 text-left font-medium text-slate-400">Destino</th>
                    <th className="pb-2 text-left font-medium text-slate-400">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {retiros.map((r) => (
                    <tr key={r.id} className="border-b border-white/5">
                      <td className="py-2 text-slate-200">
                        {new Date(r.created_at).toLocaleDateString('es-PE')}
                      </td>
                      <td className="py-2 text-slate-200">S/ {(r.monto / 100).toFixed(2)}</td>
                      <td className="py-2 text-slate-200">{r.destino}</td>
                      <td className="py-2">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-medium ${estadoBadge(r.estado)}`}
                        >
                          {r.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="mt-6"><SoportePagos /></div>
      </main>
    </div>
  );
}
