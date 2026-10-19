'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';



type Retiro = {
  id: string;
  user_id: string;
  monto: number;
  destino: string;
  estado: string;
  created_at: string;
  nota_admin: string | null;
  profiles: {
    nick: string;
  };
};

export default function AdminRetirosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notaRechazo, setNotaRechazo] = useState('');
  const [retiroRechazando, setRetiroRechazando] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const cargarRetiros = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('retiros')
      .select('*, profiles!user_id(nick)')
      .eq('estado', 'solicitado')
      .order('created_at', { ascending: true });

    if (err) {
      setError('Error cargando retiros: ' + err.message);
    } else {
      setRetiros((data as any) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      supabase.rpc('es_admin').then(({ data }: { data: boolean | null }) => {
        if (data === true) {
          cargarRetiros();
        } else {
          router.push('/');
        }
      });
    }
  }, [user, cargarRetiros, router]);

  async function marcarPagado(id: string) {
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc('marcar_retiro_pagado', {
      p_retiro: id,
    });

    if (rpcError) {
      setError('Error: ' + rpcError.message);
    } else {
      const retiro = retiros.find((r) => r.id === id);
      if (retiro) {
        const { error: notifError } = await supabase.from('notificaciones').insert({
          user_id: retiro.user_id,
          tipo: 'retiro_pagado',
          mensaje: `Tu retiro de S/ ${(retiro.monto / 100).toFixed(2)} fue pagado.`,
        });
        if (notifError) console.error('Error creando notificación:', notifError.message);
      }
      setSuccess('Retiro marcado como pagado');
      cargarRetiros();
    }
  }

  async function rechazarRetiro() {
    if (!retiroRechazando) return;
    setError(null);
    setSuccess(null);

    const retiro = retiros.find((r) => r.id === retiroRechazando);

    const { error: rpcError } = await supabase.rpc('rechazar_retiro', {
      p_retiro: retiroRechazando,
      p_nota: notaRechazo.trim() || null,
    });

    if (rpcError) {
      setError('Error: ' + rpcError.message);
    } else {
      if (retiro) {
        const { error: notifError } = await supabase.from('notificaciones').insert({
          user_id: retiro.user_id,
          tipo: 'retiro_rechazado',
          mensaje: `Tu retiro de S/ ${(retiro.monto / 100).toFixed(2)} fue rechazado. Motivo: ${notaRechazo.trim() || 'Sin motivo'}. El saldo fue reembolsado.`,
        });
        if (notifError) console.error('Error creando notificación:', notifError.message);
      }
      setSuccess('Retiro rechazado. El saldo fue reembolsado al jugador.');
      setRetiroRechazando(null);
      setNotaRechazo('');
      cargarRetiros();
    }
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
          <h1 className="text-xl font-bold text-gray-900">Admin - Retiros pendientes</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Inicio
            </Link>
            <Link href="/salas" className="text-sm text-gray-600 hover:text-gray-900">
              Salas
            </Link>
            <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
              Panel admin
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded bg-green-50 p-3 text-sm text-green-600">{success}</div>
        )}

        {loading ? (
          <p className="text-gray-500">Cargando retiros...</p>
        ) : retiros.length === 0 ? (
          <div className="rounded-lg bg-white p-6 shadow text-center">
            <p className="text-gray-500">No hay retiros pendientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {retiros.map((r) => (
              <div key={r.id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {r.profiles?.nick ?? 'Usuario'}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Monto:</span> S/ {(r.monto / 100).toFixed(2)}
                      </p>
                      <p>
                        <span className="font-medium">Destino:</span> {r.destino}
                      </p>
                      <p>
                        <span className="font-medium">Fecha:</span>{' '}
                        {new Date(r.created_at).toLocaleString('es-PE')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={async () => {
                        const { error } = await supabase.rpc('marcar_retiro_pagado', { p_retiro: r.id });
                        if (!error) {
                          await supabase.from('notificaciones').insert({
                            user_id: r.user_id,
                            tipo: 'retiro_pagado',
                            mensaje: `Tu retiro de S/ ${(r.monto / 100).toFixed(2)} fue pagado.`,
                          });
                          cargarRetiros();
                        }
                      }}
                      className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                    >
                      Marcar pagado
                    </button>
                    <button
                      onClick={() => {
                        setRetiroRechazando(r.id);
                        setNotaRechazo('');
                      }}
                      className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>

                {retiroRechazando === r.id && (
                  <div className="mt-3 rounded bg-gray-50 p-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Motivo del rechazo
                    </label>
                    <textarea
                      value={notaRechazo}
                      onChange={(e) => setNotaRechazo(e.target.value)}
                      className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black focus:border-red-500 focus:outline-none"
                      rows={2}
                      placeholder="Ej: Número de Yape inválido"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={rechazarRetiro}
                        className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                      >
                        Confirmar rechazo
                      </button>
                      <button
                        onClick={() => {
                          setRetiroRechazando(null);
                          setNotaRechazo('');
                        }}
                        className="rounded bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
