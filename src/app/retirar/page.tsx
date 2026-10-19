'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import SaldoDisplay from '@/components/SaldoDisplay';

export default function RetirarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [monto, setMonto] = useState('');
  const [destino, setDestino] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retiros, setRetiros] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) cargarRetiros();
  }, [user]);

  async function cargarRetiros() {
    if (!user) return;
    const { data } = await supabase
      .from('retiros')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setRetiros(data);
  }

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

    const { error: rpcError } = await supabase.rpc('solicitar_retiro', {
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
      setMonto('');
      setDestino('');
      cargarRetiros();
    }

    setLoading(false);
  }

  function estadoBadge(estado: string) {
    const clases: Record<string, string> = {
      solicitado: 'bg-yellow-100 text-yellow-800',
      pagado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800',
    };
    return clases[estado] ?? 'bg-gray-100 text-gray-800';
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Retirar saldo</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Inicio
            </Link>
            <Link href="/salas" className="text-sm text-gray-600 hover:text-gray-900">
              Salas
            </Link>
            <Link href="/recargar" className="text-sm text-gray-600 hover:text-gray-900">
              Recargar
            </Link>
            <Link href="/perfil" className="text-sm text-gray-600 hover:text-gray-900">
              Mi perfil
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <SaldoDisplay />
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded bg-green-50 p-3 text-sm text-green-600">{success}</div>
        )}

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Solicitar retiro</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="monto" className="block text-sm font-medium text-gray-700">
                Monto en soles (S/)
              </label>
              <input
                id="monto"
                type="number"
                step="0.01"
                min="5"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black focus:border-blue-500 focus:outline-none"
                placeholder="Ej: 50.00"
              />
              <p className="mt-1 text-xs text-gray-500">Mínimo S/ 5.00</p>
            </div>

            <div>
              <label htmlFor="destino" className="block text-sm font-medium text-gray-700">
                Número de Yape/Plin
              </label>
              <input
                id="destino"
                type="text"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black focus:border-blue-500 focus:outline-none"
                placeholder="Ej: 999999999"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ingresa el número celular donde quieres recibir el dinero
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Solicitar retiro'}
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mis retiros</h2>
          {retiros.length === 0 ? (
            <p className="text-sm text-gray-500">No tienes retiros registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-2 text-left font-medium text-gray-600">Fecha</th>
                    <th className="pb-2 text-left font-medium text-gray-600">Monto</th>
                    <th className="pb-2 text-left font-medium text-gray-600">Destino</th>
                    <th className="pb-2 text-left font-medium text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {retiros.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">
                        {new Date(r.created_at).toLocaleDateString('es-PE')}
                      </td>
                      <td className="py-2 text-gray-900">S/ {(r.monto / 100).toFixed(2)}</td>
                      <td className="py-2 text-gray-900">{r.destino}</td>
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
      </main>
    </div>
  );
}
