'use client';

import { useState } from 'react';
import SalasPublicas from '@/components/SalasPublicas';
import HistorialGlobal from '@/components/HistorialGlobal';
import ChatPanel from '@/components/ChatPanel';
import HeroArena from '@/components/HeroArena';
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
      <HeroArena isAuthenticated={!!user} />

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
