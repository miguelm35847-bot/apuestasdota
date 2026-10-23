'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PartidaDetalle from '@/components/PartidaDetalle';
import BotonApostar from '@/components/ApuestasProvider';
import ApuestasPublicas from '@/components/ApuestasPublicas';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import { DURACION_MAXIMA_PARTIDA } from '@/lib/vivo';
import { partidaVivaMock } from '@/lib/vivoMock';

type SalaPartida = {
  id: string;
  nombre: string;
  estado: string;
  cupo: number;
  modalidad: string | null;
  iniciada_at: string | null;
};

type ParticipanteFila = {
  user_id: string;
  equipo: number | null;
  profiles: { nick: string | null; mmr: number | null } | null;
};

function Estado({ children }: { children: React.ReactNode }) {
  return (
    <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] px-4 text-slate-300">
      <div className="arena-card w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 text-center shadow-arena-soft">
        {children}
      </div>
    </div>
  );
}

function PartidaContenido() {
  useArenaBody();

  const params = useParams();
  const salaId = typeof params?.id === 'string' ? params.id : '';

  const [sala, setSala] = useState<SalaPartida | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noExiste, setNoExiste] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  // Si la sala no guardó `iniciada_at`, el reloj arranca al abrir la página.
  const [apertura] = useState(() => Date.now());

  const cargar = useCallback(async () => {
    if (!salaId) {
      setCargando(false);
      setNoExiste(true);
      return;
    }

    const { data } = await supabase
      .from('salas')
      .select('id, nombre, estado, cupo, modalidad, iniciada_at')
      .eq('id', salaId)
      .maybeSingle();

    if (!data) {
      setNoExiste(true);
      setCargando(false);
      return;
    }

    const fila = data as unknown as SalaPartida;
    setSala(fila);
    setNoExiste(false);

    const { data: partes } = await supabase
      .from('participantes_sala')
      .select('user_id, equipo, profiles(nick, mmr)')
      .eq('sala_id', salaId)
      .order('created_at', { ascending: true });

    setParticipantes((partes ?? []) as unknown as ParticipanteFila[]);
    setCargando(false);
  }, [salaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    void cargar();
  }, [cargar]);

  // Reloj de la partida: avanza cada segundo y arrastra las estadísticas.
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);

  // Si el admin cierra la partida, la página se entera sin recargar.
  useEffect(() => {
    if (!salaId) return;

    const canal = supabase
      .channel(`sala-partida-${salaId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'salas', filter: `id=eq.${salaId}` },
        () => {
          void cargar();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [salaId, cargar]);

  const duracion = useMemo(() => {
    const inicio = sala?.iniciada_at ? new Date(sala.iniciada_at).getTime() : apertura;
    const segundos = Math.floor((ahora - inicio) / 1000);
    return Math.min(DURACION_MAXIMA_PARTIDA, Math.max(0, segundos));
  }, [sala, apertura, ahora]);

  const partida = useMemo(
    () => (sala?.estado === 'en_juego' ? partidaVivaMock(participantes, duracion) : null),
    [sala, participantes, duracion]
  );

  if (cargando) {
    return (
      <Estado>
        <p className="text-sm text-slate-400">Cargando los datos de la partida…</p>
      </Estado>
    );
  }

  if (noExiste || !sala) {
    return (
      <Estado>
        <h1 className="font-display text-lg font-bold text-white">Sala no encontrada</h1>
        <p className="mt-1 text-sm text-slate-400">
          Puede que la hayan eliminado o que el enlace esté mal.
        </p>
        <Link
          href="/salas"
          className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#070a10] transition hover:bg-slate-200"
        >
          Ver las salas
        </Link>
      </Estado>
    );
  }

  if (sala.estado !== 'en_juego') {
    return (
      <Estado>
        <h1 className="font-display text-lg font-bold text-white">Esta sala no está en juego</h1>
        <p className="mt-1 text-sm text-slate-400">
          Los datos de la partida solo están disponibles mientras la sala está en juego.
        </p>
        <Link
          href={`/salas/${sala.id}`}
          className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#070a10] transition hover:bg-slate-200"
        >
          Ir a la sala
        </Link>
      </Estado>
    );
  }

  if (!partida) {
    return (
      <Estado>
        <h1 className="font-display text-lg font-bold text-white">Esperando jugadores</h1>
        <p className="mt-1 text-sm text-slate-400">
          Todavía no hay suficientes jugadores para mostrar la partida.
        </p>
        <Link
          href={`/salas/${sala.id}`}
          className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#070a10] transition hover:bg-slate-200"
        >
          Ir a la sala
        </Link>
      </Estado>
    );
  }

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Datos de la partida" />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/salas"
              className="text-[11px] font-semibold text-slate-400 transition hover:text-slate-200"
            >
              ← Volver a las salas
            </Link>
            <h1 className="mt-1 truncate font-display text-xl font-bold text-white sm:text-2xl">
              {sala.nombre}
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              {sala.modalidad === '1v1' ? '1 vs 1' : '5 vs 5'} ·{' '}
              {participantes.length}/{sala.cupo} jugadores · en juego
            </p>
          </div>

          <Link
            href={`/salas/${sala.id}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Ir a la sala <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <div><p className="text-sm font-bold text-amber-200">Apuesta por Radiant o Dire</p><p className="mt-1 text-xs text-slate-400">S/ 5.50 por usuario · S/ 10.00 para el ganador</p></div>
          <BotonApostar sala={sala} />
        </div>
        <PartidaDetalle partida={partida} />
        <ApuestasPublicas salaId={sala.id} />

        <p className="mx-auto mt-5 max-w-2xl text-center text-[10px] leading-relaxed text-slate-600">
          Vista previa: las estadísticas son de ejemplo y avanzan con el reloj. El marcador
          real llegará cuando Valve apruebe la liga (<span className="font-mono">GetLiveLeagueGames</span>);
          esta pantalla no cambiará.
        </p>
      </main>
    </div>
  );
}

export default function PartidaPage() {
  return (
    <Suspense
      fallback={
        <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
          <p>Cargando los datos de la partida...</p>
        </div>
      }
    >
      <PartidaContenido />
    </Suspense>
  );
}
