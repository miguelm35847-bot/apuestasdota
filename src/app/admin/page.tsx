'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';
import AdminNav from '@/components/AdminNav';

type EstadisticasAdmin = {
  recargas: number;
  retiros: number;
  salas: number;
  jugadores: number;
};

function KpiCard({
  etiqueta,
  valor,
  href,
  tono,
  icono,
}: {
  etiqueta: string;
  valor: number | null;
  href: string;
  tono: string;
  icono: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="arena-card group flex items-center gap-4 rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft transition hover:border-white/20"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tono}`}>
        {icono}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {etiqueta}
        </span>
        <span className="mt-1 block font-display text-2xl font-bold tabular-nums text-white">
          {valor !== null ? valor : '…'}
        </span>
      </span>
    </Link>
  );
}

function AccionCard({
  href,
  titulo,
  detalle,
  tono,
  icono,
}: {
  href: string;
  titulo: string;
  detalle: string;
  tono: string;
  icono: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="arena-card group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft transition hover:border-white/20"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tono}`}>
          {icono}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-white">{titulo}</span>
          <span className="block truncate text-xs text-slate-400">{detalle}</span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-300"
      >
        →
      </span>
    </Link>
  );
}

function AdminDashboard() {
  useArenaBody();
  const [ganancias, setGanancias] = useState<number | null>(null);
  const [stats, setStats] = useState<EstadisticasAdmin | null>(null);

  useEffect(() => {
    supabase.rpc('ganancias_casa').then(({ data }: { data: number | null }) => {
      setGanancias(data);
    });
  }, []);

  useEffect(() => {
    let activo = true;

    void (async () => {
      const [recargas, retiros, salas, jugadores] = await Promise.all([
        supabase.from('recargas').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
        supabase.from('retiros').select('*', { count: 'exact', head: true }).eq('estado', 'solicitado'),
        supabase
          .from('salas')
          .select('*', { count: 'exact', head: true })
          .in('estado', ['abierta', 'llena', 'en_juego']),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ]);

      if (!activo) return;

      setStats({
        recargas: recargas.count ?? 0,
        retiros: retiros.count ?? 0,
        salas: salas.count ?? 0,
        jugadores: jugadores.count ?? 0,
      });
    })();

    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Panel de Administrador" />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <AdminNav />

        <div className="mb-6 mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-prism-300">
            KódigoDota · Administración
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">Panel de control</h1>
        </div>

        {/* Ganancias de la casa */}
        <section className="arena-card rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-[#111827] to-[#111827] p-6 shadow-arena-soft">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300/80">
                Ganancias de la casa
              </p>
              <p className="mt-2 font-display text-4xl font-bold tabular-nums text-emerald-300">
                {ganancias !== null ? `S/ ${(ganancias / 100).toFixed(2)}` : '…'}
              </p>
            </div>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Ingresos acumulados
            </span>
          </div>
        </section>

        {/* KPIs */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            etiqueta="Recargas pendientes"
            valor={stats?.recargas ?? null}
            href="/admin/recargas"
            tono="bg-amber-500/15 text-amber-300"
            icono={
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v12" />
                <path d="M7 10l5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            }
          />
          <KpiCard
            etiqueta="Retiros pendientes"
            valor={stats?.retiros ?? null}
            href="/admin/retiros"
            tono="bg-rose-500/15 text-rose-300"
            icono={
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 21V9" />
                <path d="M7 14l5-5 5 5" />
                <path d="M5 3h14" />
              </svg>
            }
          />
          <KpiCard
            etiqueta="Salas activas"
            valor={stats?.salas ?? null}
            href="/salas"
            tono="bg-prism-500/15 text-prism-200"
            icono={
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 10h18" />
                <path d="M8 4v6" />
              </svg>
            }
          />
          <KpiCard
            etiqueta="Jugadores"
            valor={stats?.jugadores ?? null}
            href="/admin/jugadores"
            tono="bg-sky-500/15 text-sky-300"
            icono={
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
        </div>

        {/* Acciones rápidas */}
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-white">Acciones rápidas</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AccionCard
              href="/admin/recargas"
              titulo="Revisar recargas"
              detalle={
                stats ? `${stats.recargas} por revisar` : 'Cargando solicitudes…'
              }
              tono="bg-amber-500/15 text-amber-300"
              icono={
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 3v12" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              }
            />
            <AccionCard
              href="/admin/retiros"
              titulo="Revisar retiros"
              detalle={stats ? `${stats.retiros} por pagar` : 'Cargando solicitudes…'}
              tono="bg-rose-500/15 text-rose-300"
              icono={
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 21V9" />
                  <path d="M7 14l5-5 5 5" />
                  <path d="M5 3h14" />
                </svg>
              }
            />
            <AccionCard
              href="/admin/jugadores"
              titulo="Jugadores y MMR"
              detalle="Editar MMR y revisar cuentas"
              tono="bg-sky-500/15 text-sky-300"
              icono={
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <AccionCard
              href="/salas"
              titulo="Gestionar salas"
              detalle="Crear y supervisar partidas"
              tono="bg-prism-500/15 text-prism-200"
              icono={
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 10h18" />
                  <path d="M8 4v6" />
                </svg>
              }
            />
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
