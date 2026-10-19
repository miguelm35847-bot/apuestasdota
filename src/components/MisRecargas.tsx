'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Recarga = {
  id: string;
  monto: number;
  numero_operacion: string;
  estado: string;
  created_at: string;
};

export default function MisRecargas() {
  const [recargas, setRecargas] = useState<Recarga[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarRecargas();
  }, []);

  async function cargarRecargas() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('recargas')
      .select('id, monto, numero_operacion, estado, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setRecargas(data);
    setLoading(false);
  }

  function estadoBadge(estado: string) {
    const clases: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aprobada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800',
    };
    return clases[estado] ?? 'bg-gray-100 text-gray-800';
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Cargando recargas...</p>;
  }

  if (recargas.length === 0) {
    return <p className="text-sm text-gray-500">No tienes recargas registradas.</p>;
  }

  return (
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
  );
}
