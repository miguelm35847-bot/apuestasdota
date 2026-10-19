'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';

function AdminDashboard() {
  useArenaBody();
  const [ganancias, setGanancias] = useState<number | null>(null);

  useEffect(() => {
    // Obtener ganancias de la casa
    supabase.rpc('ganancias_casa').then(({ data }: { data: number | null }) => {
      setGanancias(data);
    });
  }, []);

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Panel de Administrador" />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-prism-300">
            Arena Dark · Administración
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">Panel de control</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
            <h2 className="font-display text-lg font-bold text-white">Ganancias de la casa</h2>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {ganancias !== null ? `S/ ${(ganancias / 100).toFixed(2)}` : '...'}
            </p>
          </div>

          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
            <h2 className="font-display text-lg font-bold text-white">Acciones rápidas</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/admin/recargas"
                className="rounded-lg bg-prism-500 px-4 py-2.5 text-center font-semibold text-white shadow-arena-glow transition hover:bg-prism-400"
              >
                Ver recargas pendientes
              </Link>
              <Link
                href="/admin/retiros"
                className="rounded-lg border border-prism-500/30 bg-prism-500/10 px-4 py-2.5 text-center font-semibold text-prism-200 transition hover:bg-prism-500/20"
              >
                Ver retiros pendientes
              </Link>
              <Link
                href="/admin/jugadores"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Jugadores y MMR
              </Link>
              <Link
                href="/salas"
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-center font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
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
          router.push('/');
        }
      });
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <p>Verificando permisos...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <AdminDashboard />;
}
