'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SaldoDisplay() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function cargarSaldo() {
    setLoading(true);
    const { data, error } = await supabase.rpc('mi_saldo');
    setError(!!error);
    if (data !== null) {
      setSaldo(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    void cargarSaldo();
    window.addEventListener('saldo:refresh', cargarSaldo);
    window.addEventListener('focus', cargarSaldo);
    return () => { window.removeEventListener('saldo:refresh', cargarSaldo); window.removeEventListener('focus', cargarSaldo); };
  }, []);

  if (loading) {
    return <p className="text-slate-500">Cargando saldo...</p>;
  }

  if (error || saldo === null) return <button onClick={() => void cargarSaldo()} className="text-sm text-amber-200">No se pudo consultar el saldo. Reintentar</button>;
  const saldoEnSoles = ((saldo ?? 0) / 100).toFixed(2);

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <p className="text-sm font-medium text-emerald-300">Tu saldo</p>
      <p className="text-3xl font-bold text-emerald-200">S/ {saldoEnSoles}</p>
    </div>
  );
}
