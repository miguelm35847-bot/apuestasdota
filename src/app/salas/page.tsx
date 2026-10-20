'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';

type Sala = {
  id: string;
  nombre: string;
  cuota: number;
  cupo: number;
  comision_bp: number;
  estado: string;
  modalidad?: string;
  destacada?: boolean;
  creado_por: string;
  created_at: string;
  participantes_count?: number;
  participantes_sala?: { count: number }[];
};

export default function SalasPage() {
  useArenaBody();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCrear, setShowCrear] = useState(false);
  const [nombre, setNombre] = useState('');
  const [cuota, setCuota] = useState('');
  const [modalidad, setModalidad] = useState<'1v1' | '5v5'>('5v5');
  const [comision, setComision] = useState('1500');
  const [creating, setCreating] = useState(false);
  const [destacandoId, setDestacandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc('es_admin').then(({ data }: { data: boolean | null }) => {
      setIsAdmin(data === true);
    });
  }, [user]);

  const cargarSalas = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('salas')
      .select('*, participantes_sala(count)')
      .in('estado', ['abierta', 'llena', 'en_juego'])
      .order('created_at', { ascending: false });

    if (err) {
      setError('Error al cargar salas: ' + err.message);
    } else if (data) {
      // Una sola consulta: el conteo viene incluido por sala
      const filas = data as unknown as Sala[];
      setSalas(
        filas.map((s) => ({
          ...s,
          participantes_count: s.participantes_sala?.[0]?.count ?? 0,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    if (user) cargarSalas();
  }, [user, cargarSalas]);

  // Entradas y salidas en vivo también en la lista de salas
  useEffect(() => {
    if (!user) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const refrescar = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cargarSalas(), 300);
    };

    const channel = supabase
      .channel('lista-salas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, refrescar)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participantes_sala' },
        refrescar
      )
      .subscribe();

    const interval = setInterval(() => cargarSalas(), 5000);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, cargarSalas]);

  async function crearSala() {
    setError(null);
    if (!nombre.trim()) {
      setError('Escribe un nombre para la sala');
      return;
    }
    const cuotaNum = parseFloat(cuota);
    if (isNaN(cuotaNum) || cuotaNum < 1) {
      setError('La cuota mínima es S/ 1.00');
      return;
    }
    const cupoNum = modalidad === '1v1' ? 2 : 10;
    const comisionNum = parseInt(comision);
    if (isNaN(comisionNum) || comisionNum < 0 || comisionNum > 5000) {
      setError('La comisión debe estar entre 0 y 5000 (0-50%)');
      return;
    }

    setCreating(true);
    const { error: rpcError } = await supabase.rpc('crear_sala', {
      p_nombre: nombre.trim(),
      p_cuota: Math.round(cuotaNum * 100),
      p_cupo: cupoNum,
      p_comision_bp: comisionNum,
    });

    if (rpcError) {
      setError('Error al crear sala: ' + rpcError.message);
    } else {
      setNombre('');
      setCuota('');
      setModalidad('5v5');
      setComision('1500');
      setShowCrear(false);
      cargarSalas();
    }
    setCreating(false);
  }

  async function alternarDestacada(sala: Sala) {
    setError(null);
    setDestacandoId(sala.id);

    const { error: rpcError } = await supabase.rpc('admin_destacar_sala', {
      p_sala: sala.id,
      p_destacar: !sala.destacada,
    });

    if (rpcError) {
      const detalle = rpcError.message.includes('Could not find the function')
        ? 'falta ejecutar el SQL de admin_destacar_sala en Supabase'
        : rpcError.message;
      setError('No se pudo actualizar la sala destacada: ' + detalle);
    } else {
      await cargarSalas();
    }

    setDestacandoId(null);
  }

  function estadoBadge(estado: string) {
    const clases: Record<string, string> = {
      abierta: 'bg-emerald-500/15 text-emerald-300',
      llena: 'bg-amber-500/15 text-amber-300',
      en_juego: 'bg-prism-500/15 text-prism-200',
      terminada: 'bg-white/5 text-slate-400',
      cancelada: 'bg-rose-500/15 text-rose-300',
    };
    return clases[estado] ?? 'bg-white/5 text-slate-300';
  }

  if (authLoading) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Salas de Dota 2" />

      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">Salas disponibles</h2>
          {isAdmin && (
            <button
              onClick={() => setShowCrear(!showCrear)}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              {showCrear ? 'Cancelar' : 'Crear sala'}
            </button>
          )}
        </div>

        {showCrear && (
          <div className="arena-card mb-6 rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
            <h3 className="mb-4 font-display text-lg font-bold text-white">Nueva sala</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
                  placeholder="Ej: Sala Pro 5v5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Cuota (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={cuota}
                  onChange={(e) => setCuota(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
                  placeholder="Ej: 10.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Modalidad</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalidad('1v1')}
                    className={`rounded border-2 px-4 py-3 text-lg font-semibold ${
                      modalidad === '1v1'
                        ? 'border-prism-400 bg-prism-500/15 text-prism-200'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    1 vs 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalidad('5v5')}
                    className={`rounded border-2 px-4 py-3 text-lg font-semibold ${
                      modalidad === '5v5'
                        ? 'border-prism-400 bg-prism-500/15 text-prism-200'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    5 vs 5
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {modalidad === '1v1' ? '2 jugadores: 1 Radiant y 1 Dire' : '10 jugadores: 5 Radiant y 5 Dire'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Comisión (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={Math.round(parseInt(comision) / 100)}
                  onChange={(e) => setComision(String(parseInt(e.target.value) * 100))}
                  className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={crearSala}
              disabled={creating}
              className="mt-4 rounded-lg bg-emerald-500 px-6 py-2.5 font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {creating ? 'Creando...' : 'Crear sala'}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-slate-500">Cargando salas...</p>
        ) : salas.length === 0 ? (
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 text-center shadow-arena-soft">
            <p className="text-slate-500">No hay salas disponibles</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {salas.map((sala) => (
              <div
                key={sala.id}
                className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-white">{sala.nombre}</h3>
                      <span className="rounded bg-prism-500/15 px-2 py-0.5 text-xs font-bold text-prism-200 ring-1 ring-inset ring-prism-500/30">
                        {sala.modalidad ?? (sala.cupo === 2 ? '1v1' : '5v5')}
                      </span>
                      {sala.destacada && (
                        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-inset ring-amber-500/30">
                          ★ Destacada
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-slate-400">
                      <p>
                        <span className="font-medium">Cuota:</span> S/ {(sala.cuota / 100).toFixed(2)}
                      </p>
                      <p>
                        <span className="font-medium">Cupo:</span> {sala.participantes_count}/{sala.cupo}
                      </p>
                      <p>
                        <span className="font-medium">Comisión:</span> {sala.comision_bp / 100}%
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-block rounded px-2 py-1 text-xs font-medium ${estadoBadge(sala.estado)}`}
                  >
                    {sala.estado}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <Link
                    href={`/salas/${sala.id}`}
                    className="block w-full rounded-lg bg-prism-500 py-2 text-center font-semibold text-white shadow-arena-glow transition hover:bg-prism-400"
                  >
                    {sala.estado === 'abierta' || sala.estado === 'llena' ? 'Ver sala' : 'Ver resultado'}
                  </Link>
                  {isAdmin && (sala.estado === 'abierta' || sala.estado === 'llena' || sala.estado === 'en_juego') && (
                    <Link
                      href={`/admin/salas/${sala.id}`}
                      className="block w-full rounded-lg border border-prism-500/30 bg-prism-500/10 py-2 text-center font-semibold text-prism-200 transition hover:bg-prism-500/20"
                    >
                      Gestionar sala
                    </Link>
                  )}
                  {isAdmin && (sala.estado === 'abierta' || sala.estado === 'llena' || sala.estado === 'en_juego') && (
                    <button
                      type="button"
                      onClick={() => void alternarDestacada(sala)}
                      disabled={destacandoId === sala.id}
                      className={`block w-full rounded-lg border py-2 text-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        sala.destacada
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {destacandoId === sala.id
                        ? 'Guardando…'
                        : sala.destacada
                          ? '★ Quitar de destacadas'
                          : '☆ Destacar en landing'}
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
