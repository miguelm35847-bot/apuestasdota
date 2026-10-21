'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { ParticipantePublico, SalaPublica } from '@/lib/salas';

const ESTADOS_ACTIVOS = ['abierta', 'llena', 'en_juego'];

type SalasContextValue = {
  salas: SalaPublica[];
  participantes: Record<string, ParticipantePublico[]>;
  loading: boolean;
};

const SalasContext = createContext<SalasContextValue | null>(null);

export function SalasProvider({ children }: { children: ReactNode }) {
  const [salas, setSalas] = useState<SalaPublica[]>([]);
  const [participantes, setParticipantes] = useState<Record<string, ParticipantePublico[]>>({});
  const [loading, setLoading] = useState(true);
  const refresco = useRef<ReturnType<typeof setTimeout> | null>(null);
  const solicitud = useRef(0);

  const cargar = useCallback(async () => {
    const actual = ++solicitud.current;

    const { data, error } = await supabase
      .from('salas')
      .select('*, participantes_sala(count)')
      .in('estado', ESTADOS_ACTIVOS)
      .order('created_at', { ascending: false });

    if (actual !== solicitud.current) return;

    if (error) {
      setLoading(false);
      return;
    }

    const filas = (data ?? []) as unknown as SalaPublica[];
    setSalas(filas);

    const ids = filas.map((sala) => sala.id);
    if (ids.length === 0) {
      setParticipantes({});
      setLoading(false);
      return;
    }

    const { data: parts } = await supabase
      .from('participantes_sala')
      .select(
        'sala_id, user_id, equipo, profiles(nick, steam_avatar_url, steam_nombre, mmr, roles_preferidos)'
      )
      .in('sala_id', ids)
      .order('created_at', { ascending: true });

    if (actual !== solicitud.current) return;

    const mapa: Record<string, ParticipantePublico[]> = {};
    ((parts ?? []) as unknown as ParticipantePublico[]).forEach((participante) => {
      if (!mapa[participante.sala_id]) mapa[participante.sala_id] = [];
      mapa[participante.sala_id].push(participante);
    });

    setParticipantes(mapa);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    cargar();

    const refrescar = () => {
      if (refresco.current) clearTimeout(refresco.current);
      refresco.current = setTimeout(() => cargar(), 300);
    };

    const channel = supabase
      .channel('landing-salas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, refrescar)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participantes_sala' },
        refrescar
      )
      .subscribe();

    const interval = setInterval(() => cargar(), 5000);

    return () => {
      if (refresco.current) clearTimeout(refresco.current);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [cargar]);

  const value = useMemo(
    () => ({ salas, participantes, loading }),
    [salas, participantes, loading]
  );

  return <SalasContext.Provider value={value}>{children}</SalasContext.Provider>;
}

export function useSalas() {
  const context = useContext(SalasContext);
  if (!context) throw new Error('useSalas debe usarse dentro de <SalasProvider>');
  return context;
}
