'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SalasPublicas from '@/components/SalasPublicas';
import HistorialGlobal from '@/components/HistorialGlobal';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import NotificationBell from '@/components/NotificationBell';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [saldo, setSaldo] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      supabase.rpc('mi_saldo').then(({ data }: { data: number | null }) => {
        if (data !== null) setSaldo(data);
      });
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Apuestas Dota 2</h1>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-700">
                    S/ {saldo !== null ? (saldo / 100).toFixed(2) : '...'}
                  </span>
                  <Link
                    href="/recargar"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 text-lg font-bold"
                    title="Recargar saldo"
                  >
                    +
                  </Link>
                </div>
                <NotificationBell />
                <Link
                  href="/perfil"
                  className="rounded border-2 border-gray-400 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Mi perfil
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push('/');
                  }}
                  className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded border-2 border-gray-400 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#171a21] text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage:
              "url('https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/backgrounds/greyfade.jpg')",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight">Apuestas Dota 2</h1>
          <p className="mt-4 text-xl text-gray-300">
            Salas de juego con premios en efectivo. Yape o Plin.
          </p>
          {!user && (
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/register"
                className="rounded bg-blue-600 px-8 py-3 text-lg font-medium text-white hover:bg-blue-700"
              >
                Crear cuenta
              </Link>
              <Link
                href="/login"
                className="rounded border-2 border-white px-8 py-3 text-lg font-medium text-white hover:bg-white/10"
              >
                Iniciar sesión
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Contenido público */}
      <main className="mx-auto max-w-7xl px-4 py-12 space-y-12">
        <SalasPublicas isAuthenticated={!!user} />
        <div className="rounded-lg bg-white p-6 shadow">
          <HistorialGlobal />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-gray-500">
          <p>Apuestas Dota 2 - Plataforma de salas de juego</p>
          <p className="mt-1">Pagos con Yape o Plin</p>
        </div>
      </footer>
    </div>
  );
}
