'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

type Aviso = { salaId: string; nombre: string };

/**
 * Aviso central de verificación.
 *
 * Cuando la sala se llena, el servidor pide automáticamente la verificación
 * "Estoy listo" (RPC/trigger en Supabase). Este aviso aparece en cualquier
 * página de la app para el jugador que todavía no confirmó, con un botón
 * para confirmar sin salir de donde está y otro para ir a su sala.
 * Desaparece en cuanto el jugador pulsa "Estoy listo".
 */
export default function AvisoVerificacion() {
  const { user } = useAuth();
  const router = useRouter();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [enviando, setEnviando] = useState(false);

  /** Muestra el aviso si el usuario participa de esa sala y no confirmó. */
  const comprobar = useCallback(
    async (salaId: string) => {
      if (!user) return;

      const { data: participo } = await supabase
        .from('participantes_sala')
        .select('user_id, verificado_at')
        .eq('sala_id', salaId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!participo || participo.verificado_at) return;

      const { data: sala } = await supabase
        .from('salas')
        .select('id, nombre, estado, verificacion_estado')
        .eq('id', salaId)
        .maybeSingle();

      if (!sala || sala.verificacion_estado !== 'pendiente') return;
      if (sala.estado === 'terminada' || sala.estado === 'cancelada') return;

      setAviso({ salaId: sala.id, nombre: sala.nombre });
    },
    [user]
  );

  // Al entrar en la app: ¿tengo alguna sala esperando mi confirmación?
  useEffect(() => {
    if (!user) return;

    let activo = true;

    void (async () => {
      const { data: participaciones } = await supabase
        .from('participantes_sala')
        .select('sala_id, verificado_at')
        .eq('user_id', user.id);

      const candidatas = (participaciones ?? [])
        .filter((p) => !p.verificado_at)
        .map((p) => p.sala_id);

      if (candidatas.length === 0) return;

      const { data: salas } = await supabase
        .from('salas')
        .select('id, nombre')
        .in('id', candidatas)
        .eq('verificacion_estado', 'pendiente')
        .in('estado', ['abierta', 'llena', 'en_juego'])
        .limit(1);

      const primera = (salas ?? [])[0];
      if (activo && primera) setAviso({ salaId: primera.id, nombre: primera.nombre });
    })();

    return () => {
      activo = false;
    };
  }, [user]);

  // La sala pide la verificación: avisamos aunque el jugador esté en otra página.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('aviso_verificacion')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'salas' },
        (event) => {
          const sala = event.new as { id?: string; verificacion_estado?: string };
          if (!sala.id || sala.verificacion_estado !== 'pendiente') return;
          void comprobar(sala.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, comprobar]);

  async function confirmar() {
    if (!aviso || enviando) return;

    setEnviando(true);
    const { error } = await supabase.rpc('confirmar_verificacion', { p_sala: aviso.salaId });
    setEnviando(false);

    if (!error) {
      setAviso(null);
      // Al confirmar lo llevamos a su sala, que es donde se decide el lado.
      router.push(`/salas/${aviso.salaId}`);
    }
  }

  if (!aviso) return null;

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
            onClick={() => setAviso(null)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Ir a mi sala
          </Link>
        </div>
      </div>
    </div>
  );
}
