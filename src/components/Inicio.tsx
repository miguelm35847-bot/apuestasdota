'use client';

import { useState } from 'react';
import Link from 'next/link';
import SalasPublicas from '@/components/SalasPublicas';
import ActividadPanel from '@/components/ActividadPanel';
import HistorialGlobal from '@/components/HistorialGlobal';
import ChatPanel from '@/components/ChatPanel';
import SiguientePaso from '@/components/SiguientePaso';
import HeroArena from '@/components/HeroArena';
import { SalasProvider } from '@/components/SalasProvider';
import { useAuth } from '@/components/AuthProvider';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';

export default function Inicio() {
  const { user } = useAuth();
  const [showHistorial, setShowHistorial] = useState(false);
  useArenaBody();

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar />

      <SalasProvider>
        {/* Hero */}
        <HeroArena isAuthenticated={!!user} />

        {/* Contenido público */}
        <main className="mx-auto max-w-[1860px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:items-start 2xl:grid-cols-[320px_minmax(0,1fr)_340px]">
            {/* Feed de actividades (izquierda) */}
            <aside className="order-2 lg:order-1 lg:sticky lg:top-20">
              <SiguientePaso />
              <ActividadPanel compacto />
            </aside>

            {/* Salas (centro) */}
            <div id="salas" className="order-1 scroll-mt-24 space-y-5 lg:order-2">
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
                    className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#070a10] shadow-[0_0_32px_-16px_rgba(255,255,255,0.7)] transition hover:bg-slate-200"
                  >
                    Ver historial global
                  </button>
                </div>
              </div>
            </div>

            {/* Chat (derecha) */}
            <aside className="order-3 lg:sticky lg:top-20">
              <ChatPanel
                titulo="Chat general"
                descripcion="Habla con la comunidad"
                altura="h-[320px] lg:h-[calc(100vh-30rem)] lg:min-h-[120px]"
              />
            </aside>
          </div>
        </main>
      </SalasProvider>

      {/* Footer */}
      <footer className="arena-footer mt-8">
        <div className="mx-auto grid max-w-[1860px] items-center gap-4 px-4 py-5 text-sm text-slate-500 sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:px-8">
          <a
            href="https://discord.gg/2FrCBBKph3"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Únete al Discord de KódigoDota (abre en una pestaña nueva)"
            className="inline-flex min-h-11 items-center justify-center gap-2.5 justify-self-start rounded-xl border border-indigo-400/25 bg-indigo-400/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:border-indigo-300/50 hover:bg-indigo-400/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden="true" focusable="false">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
            <span>Únete a Discord</span>
          </a>
          <div className="min-w-0 text-center">
            <p className="font-semibold text-slate-400">
              KódigoDota · Plataforma de salas de juego
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
              <Link href="/salas/historial" className="transition hover:text-slate-300">
                Historial
              </Link>
              <Link href="/privacidad" className="transition hover:text-slate-300">
                Privacidad
              </Link>
              <Link href="/terminos" className="transition hover:text-slate-300">
                Términos del servicio
              </Link>
            </div>
            <p className="mt-1 text-xs text-slate-600">Pagos con Yape o Plin</p>
          </div>
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
