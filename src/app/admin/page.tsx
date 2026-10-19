'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

function AdminDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [ganancias, setGanancias] = useState<number | null>(null);

  useEffect(() => {
    // Obtener ganancias de la casa
    supabase.rpc('ganancias_casa').then(({ data }: { data: number | null }) => {
      setGanancias(data);
    });
  }, []);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Panel de Administrador</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Ganancias de la casa</h2>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {ganancias !== null ? `S/ ${(ganancias / 100).toFixed(2)}` : '...'}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Acciones rápidas</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/admin/recargas"
                className="rounded bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
              >
                Ver recargas pendientes
              </Link>
              <Link
                href="/admin/retiros"
                className="rounded bg-purple-600 px-4 py-2 text-center text-white hover:bg-purple-700"
              >
                Ver retiros pendientes
              </Link>
              <Link
                href="/salas"
                className="rounded bg-green-600 px-4 py-2 text-center text-white hover:bg-green-700"
              >
                Gestionar salas
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user) {
      supabase.rpc('es_admin').then(({ data }: { data: boolean | null }) => {
        if (data !== true) {
          router.push('/jugador');
        }
      });
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Verificando permisos...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <AdminDashboard />;
}
