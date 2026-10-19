'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SaldoDisplay() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarSaldo();
  }, []);

  async function cargarSaldo() {
    setLoading(true);
    const { data } = await supabase.rpc('mi_saldo');
    if (data !== null) {
      setSaldo(data);
    }
    setLoading(false);
  }

  if (loading) {
    return <p className="text-gray-500">Cargando saldo...</p>;
  }

  const saldoEnSoles = ((saldo ?? 0) / 100).toFixed(2);

  return (
    <div className="rounded-lg bg-green-50 p-4">
      <p className="text-sm text-green-700 font-medium">Tu saldo</p>
      <p className="text-3xl font-bold text-green-600">S/ {saldoEnSoles}</p>
    </div>
  );
}
