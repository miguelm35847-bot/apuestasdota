'use client';

import { useState } from 'react';
import Link from 'next/link';
import SalasPublicas from '@/components/SalasPublicas';
import HistorialGlobal from '@/components/HistorialGlobal';
import ChatPanel from '@/components/ChatPanel';
import { useAuth } from '@/components/AuthProvider';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';

export default function Home() {
  const { user } = useAuth();
  const [showHistorial, setShowHistorial] = useState(false);
  useArenaBody();

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar />

      {/* Hero */}
      <section className="arena-hero relative overflow-hidden bg-[#0a0e17]">
        <div className="arena-grid pointer-events-none absolute inset-0" />
        <div className="arena-hero-line absolute inset-x-0 bottom-0 h-px" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 text-center sm:py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Salas 1v1 y 5v5 · Pagos con Yape o Plin
          </span>

          <h1 className="font-display mt-5 text-4xl font-extrabold tracking-tight sm:text-6xl">
            Apuestas{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-white to-rose-300 bg-clip-text text-transparent">
              Dota 2
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-400 sm:text-base">
            Salas de juego con premios en efectivo. Elige tu modalidad, arma tu equipo y juega.
          </p>

          {!user && (
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-prism-500 px-6 py-2.5 text-sm font-bold text-white shadow-arena-glow transition hover:bg-prism-400"
              >
                Crear cuenta
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-slate-100 backdrop-blur transition hover:bg-white/10"
              >
                Iniciar sesión
              </Link>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Radiant
            </span>
            <span className="hidden h-3 w-px bg-white/10 sm:block" />
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Dire
            </span>
            <span className="hidden h-3 w-px bg-white/10 sm:block" />
            <span>MMR y roles en vivo</span>
            <span className="hidden h-3 w-px bg-white/10 sm:block" />
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#fbbf24]" />
              Premios en efectivo
            </span>
          </div>
        </div>
      </section>

      {/* Contenido público */}
      <main className="mx-auto max-w-[1800px] px-4 py-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <SalasPublicas isAuthenticated={!!user} />

            <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-base font-bold tracking-tight text-white">
                    Historial global
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Revisa las últimas partidas terminadas, ganadores y pozos.
                  </p>
                </div>
                <button
                  onClick={() => setShowHistorial(true)}
                  className="shrink-0 rounded-xl bg-prism-500 px-4 py-2.5 text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400"
                >
                  Ver historial global
                </button>
              </div>
            </div>
          </div>

          <aside className="h-fit lg:sticky lg:top-20">
            <ChatPanel
              titulo="Chat general"
              descripcion="Habla con la comunidad"
              altura="h-[320px] lg:h-[calc(100vh-36rem)] lg:min-h-[120px]"
            />
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="arena-footer mt-8">
        <div className="mx-auto max-w-[1800px] px-4 py-5 text-center text-sm text-slate-500">
          <p className="font-semibold text-slate-400">
            Apuestas Dota 2 · Plataforma de salas de juego
          </p>
          <p className="mt-1 text-xs text-slate-600">Pagos con Yape o Plin</p>
        </div>
      </footer>

      {showHistorial && (
        <div
          className="arena-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowHistorial(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Historial global"
        >
          <div
            className="arena-card max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#111827] p-6 shadow-arena"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold tracking-tight text-white">
                Historial global
              </h2>
              <button
                onClick={() => setShowHistorial(false)}
                className="rounded-full p-2 text-2xl leading-none text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Cerrar historial"
              >
                ×
              </button>
            </div>
            <HistorialGlobal />
          </div>
        </div>
      )}
    </div>
  );
}
