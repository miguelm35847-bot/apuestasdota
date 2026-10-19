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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    void cargarRecargas();
  }, []);

  function estadoBadge(estado: string) {
    const clases: Record<string, string> = {
      pendiente: 'bg-amber-500/15 text-amber-300',
      aprobada: 'bg-emerald-500/15 text-emerald-300',
      rechazada: 'bg-rose-500/15 text-rose-300',
    };
    return clases[estado] ?? 'bg-white/5 text-slate-300';
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando recargas...</p>;
  }

  if (recargas.length === 0) {
    return <p className="text-sm text-slate-500">No tienes recargas registradas.</p>;
  }

  return (
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
  );
}
