'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useSalas } from '@/components/SalasProvider';
import { supabase } from '@/lib/supabase';
import { siguientePaso } from '@/lib/siguientePaso';

type PerfilInicial = {
  mmr: number | null;
  steamVinculado: boolean;
  esAdmin: boolean;
  yaJugo: boolean;
};

type Lectura = {
  userId: string;
  intento: number;
} & ({ estado: 'listo'; perfil: PerfilInicial } | { estado: 'error' });

const accionClase = 'inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-prism-400/30 bg-prism-500/15 px-4 py-2.5 text-sm font-semibold text-prism-200 transition hover:bg-prism-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400/50 sm:w-auto';

export default function SiguientePaso() {
  const { user, loading: cargandoSesion } = useAuth();
  const { salas, participantes, loading: cargandoSalas, error: errorSalas, reintentar } = useSalas();
  const [intento, setIntento] = useState(0);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    let activo = true;

    async function cargar() {
      try {
        const { data: { session }, error: errorSesion } = await supabase.auth.getSession();
        if (!activo) return;
        if (errorSesion || !session || session.user.id !== userId) throw new Error('Sesión no disponible');

        const [perfil, historial, admin, steamRespuesta] = await Promise.all([
          supabase.from('profiles').select('mmr').eq('id', userId!).abortSignal(controller.signal).maybeSingle(),
          supabase.from('participantes_sala').select('sala_id, salas!inner(estado)')
            .eq('user_id', userId!).eq('salas.estado', 'terminada').limit(1).abortSignal(controller.signal),
          supabase.rpc('es_admin').abortSignal(controller.signal),
          fetch('/api/perfil/steam?estado=1', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: 'no-store',
            signal: controller.signal,
          }),
        ]);

        if (perfil.error || historial.error || admin.error || !steamRespuesta.ok || !perfil.data || !historial.data || typeof admin.data !== 'boolean') {
          throw new Error('Progreso no disponible');
        }
        const steam: { vinculado?: unknown } = await steamRespuesta.json();
        if (typeof steam.vinculado !== 'boolean' || (perfil.data.mmr !== null && typeof perfil.data.mmr !== 'number')) {
          throw new Error('Progreso incompleto');
        }
        if (activo) setLectura({
          userId: userId!, intento, estado: 'listo',
          perfil: { mmr: perfil.data.mmr, steamVinculado: steam.vinculado, esAdmin: admin.data, yaJugo: historial.data.length > 0 },
        });
      } catch {
        if (activo) setLectura({ userId: userId!, intento, estado: 'error' });
      }
    }

    void cargar();
    return () => { activo = false; controller.abort(); };
  }, [userId, intento]);

  // No reutiliza el progreso de otra sesión ni interpreta una consulta pendiente como un perfil vacío.
  if (cargandoSesion || !userId || !lectura || lectura.userId !== userId || lectura.intento !== intento) return null;
  if (lectura.estado === 'listo' && (lectura.perfil.esAdmin || lectura.perfil.yaJugo)) return null;
  if (lectura.estado === 'error' || errorSalas) {
    return (
      <aside data-siguiente-paso="error" aria-label="Tu próximo paso" className="arena-card mb-5 flex scroll-mt-24 flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 p-4 font-sans sm:p-5">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight text-white">Tu próximo paso</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">No pudimos consultar tu progreso.</p>
        </div>
        <button className={accionClase} onClick={() => { setIntento((n) => n + 1); if (errorSalas) reintentar(); }}>Reintentar</button>
      </aside>
    );
  }
  if (cargandoSalas) return null;

  const salaActual = salas.find((sala) => participantes[sala.id]?.some((p) => p.user_id === userId)) ?? null;
  const salasDisponibles = salas.filter((sala) => sala.estado === 'abierta' && (sala.participantes_sala[0]?.count ?? sala.cupo) < sala.cupo).length;
  const paso = siguientePaso({ ...lectura.perfil, salaActual, salasDisponibles });
  if (!paso) return null;

  return (
    <aside data-siguiente-paso={paso.id} aria-label="Tu próximo paso" className="arena-card mb-5 scroll-mt-24 rounded-2xl border border-white/10 p-4 font-sans shadow-arena-soft sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-prism-500/10 font-display text-base font-semibold text-prism-200 ring-1 ring-inset ring-prism-400/20">{paso.numero}</span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold tracking-tight text-white">{paso.titulo}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">{paso.descripcion}</p>
          </div>
        </div>
        <Link href={paso.href} className={accionClase}>
          {paso.accion}
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      </div>
      <details className="mt-3 border-t border-white/5 pt-3">
        <summary className="w-fit cursor-pointer rounded text-xs font-medium text-slate-400 transition hover:text-prism-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400/40">Pasos para empezar</summary>
        <ol className="mt-3 grid gap-2 text-xs leading-5 text-slate-400 sm:grid-cols-3">
          {[
            { texto: 'Vincula Steam', completo: lectura.perfil.steamVinculado },
            { texto: 'Completa tu perfil', completo: lectura.perfil.mmr !== null },
            { texto: 'Entra a tu primera sala', completo: salaActual !== null },
          ].map((item, indice) => (
            <li key={item.texto} className="flex items-center gap-2">
              <span aria-hidden="true" className={item.completo ? 'text-emerald-300' : 'text-slate-500'}>{item.completo ? '✓' : `${indice + 1}.`}</span>
              <span>{item.texto}{item.completo && <span className="sr-only">: completado</span>}</span>
            </li>
          ))}
        </ol>
      </details>
    </aside>
  );
}
