'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Muestra el saldo del usuario en la navbar.
 * Se actualiza automáticamente cada 5 segundos.
 */
export default function SaldoNav() {
  const [saldo, setSaldo] = useState<number | null>(null);

  async function cargarSaldo() {
    const { data } = await supabase.rpc('mi_saldo');
    if (data !== null) setSaldo(data);
  }

  useEffect(() => {
    cargarSaldo();

    const interval = setInterval(cargarSaldo, 5000);

    return () => clearInterval(interval);
  }, []);

  if (saldo === null) return null;

  return (
    <div className="flex items-center gap-2 rounded bg-green-50 px-3 py-1">
      <span className="text-sm font-medium text-green-700">
        Saldo: S/ {(saldo / 100).toFixed(2)}
      </span>
    </div>
  );
}
