'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';
import AdminNav from '@/components/AdminNav';
import Avatar from '@/components/Avatar';
import { formatearMmr, resumenRolesConIconos } from '@/lib/balance';
import type { RolDota } from '@/lib/types';

type Jugador = {
  id: string;
  nick: string | null;
  mmr: number | null;
  roles_preferidos: RolDota[] | null;
  steam_avatar_url: string | null;
  rol: string | null;
  baneado: boolean | null;
};

export default function AdminJugadoresPage() {
  useArenaBody();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [valorMmr, setValorMmr] = useState('');
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const cargarJugadores = useCallback(async () => {
    setCargando(true);
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('id, nick, mmr, roles_preferidos, steam_avatar_url, rol, baneado')
      .order('nick', { ascending: true });

    if (loadError) {
      console.error('Error cargando jugadores:', loadError);
      setError('Error al cargar jugadores: ' + loadError.message);
      setCargando(false);
      return;
    }

    setJugadores((data ?? []) as Jugador[]);
    setCargando(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.rpc('es_admin').then(({ data }: { data: boolean | null }) => {
      if (data === true) {
        setIsAdmin(true);
        cargarJugadores();
      } else {
        setIsAdmin(false);
      }
    });
  }, [user, cargarJugadores]);

  function empezarEdicion(j: Jugador) {
    setError(null);
    setSuccess(null);
    setEditando(j.id);
    setValorMmr(j.mmr != null ? String(j.mmr) : '');
  }

  function cancelarEdicion() {
    setEditando(null);
    setValorMmr('');
  }

  async function guardarMmr(j: Jugador) {
    setError(null);
    setSuccess(null);

    const numero = valorMmr.trim() === '' ? null : Number(valorMmr);

    if (numero === null || !Number.isInteger(numero) || numero < 0 || numero > 20000) {
      setError('El MMR debe ser un número entero entre 0 y 20000');
      return;
    }

    setGuardandoId(j.id);

    const { error: rpcError } = await supabase.rpc('admin_editar_mmr', {
      p_user: j.id,
      p_mmr: numero,
    });

    if (rpcError) {
      setError('No se pudo actualizar el MMR: ' + rpcError.message);
    } else {
      setJugadores((prev) => prev.map((p) => (p.id === j.id ? { ...p, mmr: numero } : p)));
      setSuccess(`MMR de ${j.nick ?? 'usuario'} actualizado a ${numero}`);
      setEditando(null);
      setValorMmr('');
    }

    setGuardandoId(null);
  }

  if (authLoading || isAdmin === null) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <p>Verificando permisos...</p>
      </div>
    );
  }

  if (!user || isAdmin === false) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <div className="text-center">
          <p className="text-rose-300">No tienes permisos para ver esta página</p>
          <Link href="/" className="mt-4 inline-block text-prism-300 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const filtro = busqueda.trim().toLowerCase();
  const visibles = filtro
    ? jugadores.filter(
        (j) =>
          (j.nick ?? '').toLowerCase().includes(filtro) ||
          (j.mmr != null && String(j.mmr).includes(filtro))
      )
    : jugadores;

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Admin - Jugadores" />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <AdminNav />

        <div className="mb-4 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Jugadores</h1>
            <p className="text-sm text-slate-400">
              El MMR de cada jugador solo se registra una vez; como admin puedes corregirlo aquí.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nick o MMR"
          className="mb-4 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
        />

        {cargando ? (
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 text-center shadow-arena-soft">
            <p className="text-slate-400">Cargando jugadores...</p>
          </div>
        ) : visibles.length === 0 ? (
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 text-center shadow-arena-soft">
            <p className="text-slate-400">No se encontraron jugadores</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibles.map((j) => (
              <div
                key={j.id}
                className="arena-card flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  href={`/jugadores/${j.id}`}
                  title={`Ver perfil de ${j.nick ?? 'Usuario'}`}
                  className="flex min-w-0 items-center gap-3 rounded-xl transition hover:bg-white/5"
                >
                  <Avatar nick={j.nick} src={j.steam_avatar_url} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-slate-100">
                      {j.nick ?? 'Usuario'}
                      {j.rol === 'admin' && (
                        <span className="rounded-full bg-prism-500/15 px-2 py-0.5 text-[10px] font-semibold text-prism-200">
                          Admin
                        </span>
                      )}
                      {j.baneado && (
                        <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                          Baneado
                        </span>
                      )}
                    </p>
                    <p className="text-sm font-bold text-prism-300">
                      {j.mmr != null ? `MMR ${formatearMmr(j.mmr)}` : 'Sin MMR registrado'}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {resumenRolesConIconos(j.roles_preferidos)}
                    </p>
                  </div>
                </Link>

                <div className="flex shrink-0 items-center gap-2">
                  {editando === j.id ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        max={20000}
                        step={1}
                        value={valorMmr}
                        onChange={(e) => setValorMmr(e.target.value)}
                        placeholder="Ej: 4500"
                        autoFocus
                        className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
                      />
                      <button
                        onClick={() => guardarMmr(j)}
                        disabled={guardandoId === j.id}
                        className="rounded-lg bg-prism-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-prism-400 disabled:opacity-50"
                      >
                        {guardandoId === j.id ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={cancelarEdicion}
                        disabled={guardandoId === j.id}
                        className="rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => empezarEdicion(j)}
                      className="rounded-lg border border-prism-500/40 bg-prism-500/10 px-3 py-2 text-sm font-medium text-prism-200 transition hover:bg-prism-500/20"
                    >
                      {j.mmr != null ? 'Editar MMR' : 'Asignar MMR'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
