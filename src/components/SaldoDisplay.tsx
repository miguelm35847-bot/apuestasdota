'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SaldoDisplay() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function cargarSaldo() {
    setLoading(true);
    const { data } = await supabase.rpc('mi_saldo');
    if (data !== null) {
      setSaldo(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    void cargarSaldo();
  }, []);

  if (loading) {
    return <p className="text-slate-500">Cargando saldo...</p>;
  }

  const saldoEnSoles = ((saldo ?? 0) / 100).toFixed(2);

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <p className="text-sm font-medium text-emerald-300">Tu saldo</p>
      <p className="text-3xl font-bold text-emerald-200">S/ {saldoEnSoles}</p>
    </div>
  );
}
