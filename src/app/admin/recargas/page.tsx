'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';



type Recarga = {
  id: string;
  user_id: string;
  monto: number;
  numero_operacion: string;
  captura_path: string | null;
  estado: string;
  created_at: string;
  captura_url: string | null;
  profiles: {
    nick: string;
  };
};

export default function AdminRecargasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [recargas, setRecargas] = useState<Recarga[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notaRechazo, setNotaRechazo] = useState('');
  const [recargaRechazando, setRecargaRechazando] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc('es_admin').then(({ data }: { data: boolean | null }) => {
      if (data === true) {
        setIsAdmin(true);
        cargarRecargas();
      } else {
        setIsAdmin(false);
      }
    });
  }, [user]);

  const cargarRecargas = useCallback(async () => {
    const { data, error } = await supabase
      .from('recargas')
      .select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error cargando recargas:', error);
      setError('Error al cargar recargas: ' + error.message);
      return;
    }

    if (data) {
      // Obtener nicks de los usuarios en consulta separada
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: perfiles } = await supabase
        .from('profiles')
        .select('id, nick')
        .in('id', userIds);

      const nickMap = new Map(perfiles?.map((p) => [p.id, p.nick]) ?? []);

      const conCapturas = await Promise.all(
        data.map(async (r) => {
          let capturaUrl: string | null = null;
          if (r.captura_path) {
            const { data: urlData } = await supabase.storage
              .from('capturas')
              .createSignedUrl(r.captura_path, 3600);
            capturaUrl = urlData?.signedUrl ?? null;
          }
          return { ...r, captura_url: capturaUrl, profiles: { nick: nickMap.get(r.user_id) ?? 'Usuario' } };
        })
      );
      setRecargas(conCapturas);
    }
  }, []);

  async function aprobarRecarga(id: string) {
    setError(null);
    setSuccess(null);

    const recarga = recargas.find((r) => r.id === id);

    const { error: rpcError } = await supabase.rpc('aprobar_recarga', {
      p_recarga: id,
    });

    if (rpcError) {
      setError('Error al aprobar: ' + rpcError.message);
    } else {
      if (recarga) {
        const { error: notifError } = await supabase.from('notificaciones').insert({
          user_id: recarga.user_id,
          tipo: 'recarga_aprobada',
          mensaje: `Tu recarga de S/ ${(recarga.monto / 100).toFixed(2)} fue aprobada.`,
        });
        if (notifError) console.error('Error creando notificación:', notifError.message);
      }
      setSuccess('Recarga aprobada correctamente');
      cargarRecargas();
    }
  }

  async function rechazarRecarga() {
    if (!recargaRechazando) return;
    setError(null);
    setSuccess(null);

    const recarga = recargas.find((r) => r.id === recargaRechazando);

    const { error: rpcError } = await supabase.rpc('rechazar_recarga', {
      p_recarga: recargaRechazando,
      p_nota: notaRechazo.trim() || null,
    });

    if (rpcError) {
      setError('Error al rechazar: ' + rpcError.message);
    } else {
      if (recarga) {
        const { error: notifError } = await supabase.from('notificaciones').insert({
          user_id: recarga.user_id,
          tipo: 'recarga_rechazada',
          mensaje: `Tu recarga de S/ ${(recarga.monto / 100).toFixed(2)} fue rechazada. Motivo: ${notaRechazo.trim() || 'Sin motivo'}.`,
        });
        if (notifError) console.error('Error creando notificación:', notifError.message);
      }
      setSuccess('Recarga rechazada correctamente');
      setRecargaRechazando(null);
      setNotaRechazo('');
      cargarRecargas();
    }
  }

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Verificando permisos...</p>
      </div>
    );
  }

  if (!user || isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">No tienes permisos para ver esta página</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Admin - Recargas pendientes</h1>
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

        {recargas.length === 0 ? (
          <div className="rounded-lg bg-white p-6 shadow text-center">
            <p className="text-gray-500">No hay recargas pendientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recargas.map((r) => (
              <div key={r.id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {r.profiles?.nick ?? 'Usuario desconocido'}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Monto:</span> S/ {(r.monto / 100).toFixed(2)}
                      </p>
                      <p>
                        <span className="font-medium">Nº Operación:</span> {r.numero_operacion}
                      </p>
                      <p>
                        <span className="font-medium">Fecha:</span>{' '}
                        {new Date(r.created_at).toLocaleString('es-PE')}
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-48">
                    {r.captura_url ? (
                      <img
                        src={r.captura_url}
                        alt="Captura de pago"
                        className="w-full rounded border border-gray-200"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">
                        Sin captura
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => aprobarRecarga(r.id)}
                    className="flex-1 rounded bg-green-600 py-2 text-sm text-white hover:bg-green-700"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => {
                      setRecargaRechazando(r.id);
                      setNotaRechazo('');
                    }}
                    className="flex-1 rounded bg-red-600 py-2 text-sm text-white hover:bg-red-700"
                  >
                    Rechazar
                  </button>
                </div>

                {recargaRechazando === r.id && (
                  <div className="mt-3 rounded bg-gray-50 p-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Motivo del rechazo
                    </label>
                    <textarea
                      value={notaRechazo}
                      onChange={(e) => setNotaRechazo(e.target.value)}
                      className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black focus:border-red-500 focus:outline-none"
                      rows={2}
                      placeholder="Ej: Captura ilegible"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={rechazarRecarga}
                        className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                      >
                        Confirmar rechazo
                      </button>
                      <button
                        onClick={() => {
                          setRecargaRechazando(null);
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
