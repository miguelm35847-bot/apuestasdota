'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

type Sala = {
  id: string;
  nombre: string;
  cuota: number;
  cupo: number;
  comision_bp: number;
  estado: string;
  creado_por: string;
  created_at: string;
  participantes_count?: number;
};

export default function SalasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCrear, setShowCrear] = useState(false);
  const [nombre, setNombre] = useState('');
  const [cuota, setCuota] = useState('');
  const [cupo, setCupo] = useState('10');
  const [comision, setComision] = useState('1500');
  const [creating, setCreating] = useState(false);

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
    setLoading(true);
    const { data, error: err } = await supabase
      .from('salas')
      .select('*')
      .in('estado', ['abierta', 'llena', 'en_juego'])
      .order('created_at', { ascending: false });

    if (err) {
      setError('Error al cargar salas: ' + err.message);
    } else if (data) {
      const salasConParticipantes = await Promise.all(
        data.map(async (s) => {
          const { count } = await supabase
            .from('participantes_sala')
            .select('*', { count: 'exact', head: true })
            .eq('sala_id', s.id);
          return { ...s, participantes_count: count ?? 0 };
        })
      );
      setSalas(salasConParticipantes);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) cargarSalas();
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
    const cupoNum = parseInt(cupo);
    if (isNaN(cupoNum) || cupoNum < 2 || cupoNum > 10 || cupoNum % 2 !== 0) {
      setError('El cupo debe ser un número par entre 2 y 10');
      return;
    }
    const comisionNum = parseInt(comision);
    if (isNaN(comisionNum) || comisionNum < 0 || comisionNum > 5000) {
      setError('La comisión debe estar entre 0 y 5000 (0-50%)');
      return;
    }

    setCreating(true);
    const { data, error: rpcError } = await supabase.rpc('crear_sala', {
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
      setCupo('10');
      setComision('1500');
      setShowCrear(false);
      cargarSalas();
    }
    setCreating(false);
  }

  function estadoBadge(estado: string) {
    const clases: Record<string, string> = {
      abierta: 'bg-green-100 text-green-800',
      llena: 'bg-yellow-100 text-yellow-800',
      en_juego: 'bg-blue-100 text-blue-800',
      terminada: 'bg-gray-100 text-gray-800',
      cancelada: 'bg-red-100 text-red-800',
    };
    return clases[estado] ?? 'bg-gray-100 text-gray-800';
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Salas de Dota 2</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Inicio
            </Link>
            <Link href="/recargar" className="text-sm text-gray-600 hover:text-gray-900">
              Recargar
            </Link>
            <Link href="/perfil" className="text-sm text-gray-600 hover:text-gray-900">
              Mi perfil
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Salas disponibles</h2>
          {isAdmin && (
            <button
              onClick={() => setShowCrear(!showCrear)}
              className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
            >
              {showCrear ? 'Cancelar' : 'Crear sala'}
            </button>
          )}
        </div>

        {showCrear && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nueva sala</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: Sala Pro 5v5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cuota (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={cuota}
                  onChange={(e) => setCuota(e.target.value)}
                  className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: 10.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cupo (2-10, par)</label>
                <select
                  value={cupo}
                  onChange={(e) => setCupo(e.target.value)}
                  className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black focus:border-blue-500 focus:outline-none"
                >
                  <option value="2">2 jugadores</option>
                  <option value="4">4 jugadores</option>
                  <option value="6">6 jugadores</option>
                  <option value="8">8 jugadores</option>
                  <option value="10">10 jugadores</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Comisión (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={Math.round(parseInt(comision) / 100)}
                  onChange={(e) => setComision(String(parseInt(e.target.value) * 100))}
                  className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={crearSala}
              disabled={creating}
              className="mt-4 rounded bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? 'Creando...' : 'Crear sala'}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Cargando salas...</p>
        ) : salas.length === 0 ? (
          <div className="rounded-lg bg-white p-6 shadow text-center">
            <p className="text-gray-500">No hay salas disponibles</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {salas.map((sala) => (
              <div key={sala.id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{sala.nombre}</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
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
                    className="block w-full rounded bg-blue-600 py-2 text-center text-white hover:bg-blue-700"
                  >
                    {sala.estado === 'abierta' || sala.estado === 'llena' ? 'Ver sala' : 'Ver resultado'}
                  </Link>
                  {isAdmin && (sala.estado === 'abierta' || sala.estado === 'llena' || sala.estado === 'en_juego') && (
                    <Link
                      href={`/admin/salas/${sala.id}`}
                      className="block w-full rounded bg-purple-600 py-2 text-center text-white hover:bg-purple-700"
                    >
                      Gestionar sala
                    </Link>
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
