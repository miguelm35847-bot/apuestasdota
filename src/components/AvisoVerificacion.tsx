'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

type Aviso = { salaId: string; nombre: string; clave: string; userId: string };

/** Un aviso por ronda; las respuestas viejas no reabren una confirmación. */
export default function AvisoVerificacion() {
  const { user } = useAuth();
  const router = useRouter();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const descartadas = useRef(new Set<string>());
  const solicitud = useRef(0);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let activo = true;
    let timer: ReturnType<typeof setTimeout>;
    async function comprobar() {
      const version = ++solicitud.current;
      const { data: participaciones, error: fallo } = await supabase.from('participantes_sala')
        .select('sala_id, verificado_at').eq('user_id', userId!);
      if (!activo || version !== solicitud.current || fallo) return;
      const ids = (participaciones ?? []).filter(p => !p.verificado_at).map(p => p.sala_id);
      if (!ids.length) { setAviso(null); return; }
      const { data: salas, error: falloSalas } = await supabase.from('salas')
        .select('id, nombre, verificacion_iniciada_at, verificacion_expira_at')
        .in('id', ids).eq('verificacion_estado', 'pendiente')
        .in('estado', ['abierta', 'llena', 'en_juego']);
      if (!activo || version !== solicitud.current || falloSalas) return;
      const sala = (salas ?? []).find(s => s.verificacion_iniciada_at &&
        s.verificacion_expira_at && new Date(s.verificacion_expira_at).getTime() > Date.now() &&
        !descartadas.current.has(`${userId}:${s.id}:${s.verificacion_iniciada_at}`));
      setAviso(sala ? { salaId: sala.id, nombre: sala.nombre, userId: userId!,
        clave: `${userId}:${sala.id}:${sala.verificacion_iniciada_at}` } : null);
    }
    const refrescar = () => { clearTimeout(timer); timer = setTimeout(() => void comprobar(), 100); };
    void comprobar();
    const canal = supabase.channel(`aviso-verificacion-${userId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, refrescar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participantes_sala', filter: `user_id=eq.${userId}` }, refrescar)
      .subscribe();
    const intervalo = setInterval(() => { if (!document.hidden) void comprobar(); }, 10000);
    window.addEventListener('verificacion:refresh', refrescar);
    window.addEventListener('salas:refresh', refrescar);
    return () => { activo = false; clearTimeout(timer); clearInterval(intervalo);
      window.removeEventListener('verificacion:refresh', refrescar);
      window.removeEventListener('salas:refresh', refrescar);
      void supabase.removeChannel(canal);
    };
  }, [userId]);

  async function confirmar() {
    if (!aviso || enviando) return;
    const actual = aviso;
    ++solicitud.current;
    descartadas.current.add(actual.clave);
    setEnviando(true);
    setError(null);
    const { error: fallo } = await supabase.rpc('confirmar_verificacion', { p_sala: actual.salaId });
    setEnviando(false);
    if (fallo) {
      descartadas.current.delete(actual.clave);
      setError(fallo.message);
      return;
    }
    setAviso(null);
    window.dispatchEvent(new Event('verificacion:refresh'));
    router.push(`/salas/${actual.salaId}`);
  }

  if (!aviso || aviso.userId !== userId) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aviso-verificacion"
    >
      <div className="arena-card w-full max-w-sm rounded-2xl border border-amber-400/30 bg-[#111827] p-6 text-center shadow-arena">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-2xl">
          🔔
        </div>
        <h2
          id="aviso-verificacion"
          className="mt-3 font-display text-lg font-bold text-white"
        >
          Confirma que estás listo
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          La sala <strong className="text-white">{aviso.nombre}</strong> espera tu confirmación para
          empezar la partida.
        </p>

        {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={confirmar}
            disabled={enviando}
            className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-amber-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Estoy listo'}
          </button>
          <Link
            href={`/salas/${aviso.salaId}`}
            onClick={() => { descartadas.current.add(aviso.clave); setAviso(null); }}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Ir a mi sala
          </Link>
        </div>
      </div>
    </div>
  );
}
