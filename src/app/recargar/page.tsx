'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import SoportePagos from '@/components/SoportePagos';
import SaldoDisplay from '@/components/SaldoDisplay';
import { useArenaBody } from '@/lib/useArenaBody';

type Recarga = {
  id: string;
  monto: number;
  numero_operacion: string;
  estado: string;
  nota_admin: string | null;
  created_at: string;
};

function crearRutaCaptura(userId: string, extension: string) {
  const fecha = new Date().toISOString().split('T')[0];
  const unico = Date.now().toString(36);
  return `${userId}/${fecha}-${unico}.${extension}`;
}

export default function RecargarPage() {
  useArenaBody();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [monto, setMonto] = useState('');
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [captura, setCaptura] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recargas, setRecargas] = useState<Recarga[]>([]);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const cargarRecargas = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('recargas')
      .select('id, monto, numero_operacion, estado, nota_admin, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setRecargas(data);
  }, [user]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de la sesión
      void cargarRecargas();
    }
  }, [user, cargarRecargas]);

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
      const extension = captura.type === 'image/png' ? 'png' : 'jpg';
      const rutaCaptura = crearRutaCaptura(user.id, extension);

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

  async function copiarNumero() {
    try {
      await navigator.clipboard.writeText('949451869');
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('No se pudo copiar el número. Escríbelo manualmente.');
    }
  }

  function estadoBadge(estado: string) {
    const clases: Record<string, string> = {
      pendiente: 'bg-amber-500/15 text-amber-300',
      aprobada: 'bg-emerald-500/15 text-emerald-300',
      rechazada: 'bg-rose-500/15 text-rose-300',
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
      <Navbar titulo="Recargar saldo" />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <SaldoDisplay />
        </div>

        <div className="mb-4 arena-card rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-4 shadow-arena-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <rect x="6" y="2.5" width="12" height="19" rx="3" />
                  <path d="M10.5 18.5h3" strokeLinecap="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-300/80">
                  Paga con Yape o Plin
                </p>
                <p className="font-display text-2xl font-bold tabular-nums tracking-tight text-white">
                  949 451 869
                </p>
                <p className="text-[11px] text-slate-400">
                  Envía el monto exacto y registra la operación abajo.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={copiarNumero}
              className="shrink-0 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
            >
              {copiado ? '¡Copiado!' : 'Copiar número'}
            </button>
          </div>
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
          <h2 className="font-display text-lg font-bold text-white mb-4">Nueva recarga</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="monto" className="block text-sm font-medium text-slate-300">
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
                className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
                placeholder="Ej: 50.00"
              />
              <p className="mt-1 text-xs text-slate-500">Mínimo S/ 1.00, máximo S/ 500.00</p>
            </div>

            <div>
              <label htmlFor="operacion" className="block text-sm font-medium text-slate-300">
                Número de operación (Yape/Plin)
              </label>
              <input
                id="operacion"
                type="text"
                value={numeroOperacion}
                onChange={(e) => setNumeroOperacion(e.target.value)}
                className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
                placeholder="Ej: 123456789"
              />
            </div>

            <div>
              <label htmlFor="captura" className="block text-sm font-medium text-slate-300">
                Captura del pago (JPG/PNG, máx 3 MB)
              </label>
              <input
                id="captura"
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => setCaptura(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 file:mr-4 file:rounded file:border-0 file:bg-prism-500/15 file:px-4 file:py-2 file:text-sm file:font-medium file:text-prism-200 hover:file:bg-prism-500/25"
              />
              {captura && (
                <p className="mt-1 text-xs text-slate-500">
                  Archivo: {captura.name} ({(captura.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-prism-500 py-2.5 font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Enviar recarga'}
            </button>
          </form>
        </div>

        <div className="mt-6 arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
          <h2 className="font-display text-lg font-bold text-white mb-4">Mis recargas</h2>
          {recargas.length === 0 ? (
            <p className="text-sm text-slate-500">No tienes recargas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-2 text-left font-medium text-slate-400">Fecha</th>
                    <th className="pb-2 text-left font-medium text-slate-400">Monto</th>
                    <th className="pb-2 text-left font-medium text-slate-400">Nº Operación</th>
                    <th className="pb-2 text-left font-medium text-slate-400">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recargas.map((r) => (
                    <tr key={r.id} className="border-b border-white/5">
                      <td className="py-2 text-slate-200">
                        {new Date(r.created_at).toLocaleDateString('es-PE')}
                      </td>
                      <td className="py-2 text-slate-200">S/ {(r.monto / 100).toFixed(2)}</td>
                      <td className="py-2 text-slate-200">{r.numero_operacion}</td>
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
