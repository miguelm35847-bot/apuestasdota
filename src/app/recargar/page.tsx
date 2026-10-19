'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import SaldoDisplay from '@/components/SaldoDisplay';

type Recarga = {
  id: string;
  monto: number;
  numero_operacion: string;
  estado: string;
  nota_admin: string | null;
  created_at: string;
};

export default function RecargarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [monto, setMonto] = useState('');
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [captura, setCaptura] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recargas, setRecargas] = useState<Recarga[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      cargarRecargas();
    }
  }, [user]);

  async function cargarRecargas() {
    if (!user) return;
    const { data } = await supabase
      .from('recargas')
      .select('id, monto, numero_operacion, estado, nota_admin, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setRecargas(data);
  }

  function validarArchivo(file: File): string | null {
    const tiposPermitidos = ['image/jpeg', 'image/png'];
    if (!tiposPermitidos.includes(file.type)) {
      return 'Solo se permiten archivos JPG o PNG';
    }
    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'El archivo no puede superar 3 MB';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) return;

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum < 1) {
      setError('El monto mínimo es S/ 1.00');
      return;
    }
    if (montoNum > 500) {
      setError('El monto máximo es S/ 500.00');
      return;
    }
    if (numeroOperacion.trim().length < 4) {
      setError('El número de operación debe tener al menos 4 caracteres');
      return;
    }
    if (!captura) {
      setError('Debes subir una captura del pago');
      return;
    }
    if (captura.size === 0) {
      setError('El archivo está vacío. Sube una imagen válida.');
      return;
    }
    const errorArchivo = validarArchivo(captura);
    if (errorArchivo) {
      setError(errorArchivo);
      return;
    }

    setSubmitting(true);

    try {
      const montoCentimos = Math.round(montoNum * 100);
      const fecha = new Date().toISOString().split('T')[0];
      const extension = captura.type === 'image/png' ? 'png' : 'jpg';
      const unico = Date.now().toString(36);
      const rutaCaptura = `${user.id}/${fecha}-${unico}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('capturas')
        .upload(rutaCaptura, captura);

      if (uploadError) {
        setError('Error al subir la captura: ' + uploadError.message);
        setSubmitting(false);
        return;
      }

      const { error: rpcError } = await supabase.rpc('crear_recarga', {
        p_monto: montoCentimos,
        p_numero_operacion: numeroOperacion.trim(),
        p_captura_path: rutaCaptura,
      });

      if (rpcError) {
        const mensaje = traducirError(rpcError.message);
        setError(mensaje);
        await supabase.storage.from('capturas').remove([rutaCaptura]);
      } else {
        setSuccess('Recarga enviada correctamente. Un administrador la revisará.');
        setMonto('');
        setNumeroOperacion('');
        setCaptura(null);
        cargarRecargas();
      }
    } catch {
      setError('Error inesperado al procesar la recarga');
    }

    setSubmitting(false);
  }

  function traducirError(msg: string): string {
    const errores: Record<string, string> = {
      'Monto mínimo: S/ 1.00': 'El monto mínimo es S/ 1.00',
      'Monto máximo por recarga: S/ 500.00': 'El monto máximo es S/ 500.00',
      'Número de operación inválido': 'El número de operación debe tener al menos 4 caracteres',
      'Ese número de operación ya fue registrado': 'Ese número de operación ya fue registrado',
      'No autenticado': 'Debes iniciar sesión',
      'Cuenta baneada': 'Tu cuenta está baneada',
    };
    return errores[msg] ?? msg;
  }

  function estadoBadge(estado: string) {
    const clases: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aprobada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800',
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
          <h1 className="text-xl font-bold text-gray-900">Recargar saldo</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Inicio</Link>
            <Link href="/retirar" className="text-sm text-gray-600 hover:text-gray-900">Retirar</Link>
            <Link href="/perfil" className="text-sm text-gray-600 hover:text-gray-900">Mi perfil</Link>
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-red-600 hover:underline"
            >
              Cerrar sesión
            </button>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nueva recarga</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="monto" className="block text-sm font-medium text-gray-700">
                Monto en soles (S/)
              </label>
              <input
                id="monto"
                type="number"
                step="0.01"
                min="1"
                max="500"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Ej: 50.00"
              />
              <p className="mt-1 text-xs text-gray-500">Mínimo S/ 1.00, máximo S/ 500.00</p>
            </div>

            <div>
              <label htmlFor="operacion" className="block text-sm font-medium text-gray-700">
                Número de operación (Yape/Plin)
              </label>
              <input
                id="operacion"
                type="text"
                value={numeroOperacion}
                onChange={(e) => setNumeroOperacion(e.target.value)}
                className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Ej: 123456789"
              />
            </div>

            <div>
              <label htmlFor="captura" className="block text-sm font-medium text-gray-700">
                Captura del pago (JPG/PNG, máx 3 MB)
              </label>
              <input
                id="captura"
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => setCaptura(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
              {captura && (
                <p className="mt-1 text-xs text-gray-500">
                  Archivo: {captura.name} ({(captura.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Enviar recarga'}
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mis recargas</h2>
          {recargas.length === 0 ? (
            <p className="text-sm text-gray-500">No tienes recargas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-2 text-left font-medium text-gray-600">Fecha</th>
                    <th className="pb-2 text-left font-medium text-gray-600">Monto</th>
                    <th className="pb-2 text-left font-medium text-gray-600">Nº Operación</th>
                    <th className="pb-2 text-left font-medium text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recargas.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">
                        {new Date(r.created_at).toLocaleDateString('es-PE')}
                      </td>
                      <td className="py-2 text-gray-900">S/ {(r.monto / 100).toFixed(2)}</td>
                      <td className="py-2 text-gray-900">{r.numero_operacion}</td>
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
