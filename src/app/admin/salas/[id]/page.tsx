'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
};

type Participante = {
  user_id: string;
  equipo: number | null;
  profiles: {
    nick: string;
  };
};

function AdminSalaContenido() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const salaId = params.id as string;

  const [sala, setSala] = useState<Sala | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [equipos, setEquipos] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lobbyNombre, setLobbyNombre] = useState('');
  const [lobbyClave, setLobbyClave] = useState('');
  const [showTerminar, setShowTerminar] = useState(false);
  const [dotaMatchId, setDotaMatchId] = useState('');
  const [equipoGanador, setEquipoGanador] = useState('');
  const [terminando, setTerminando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [datosPartida, setDatosPartida] = useState<any | null>(null);

  const cargarSala = useCallback(async () => {
    if (!salaId || !user) return;
    setLoading(true);

    const { data: salaData } = await supabase
      .from('salas')
      .select('*')
      .eq('id', salaId)
      .single();

    if (salaData) setSala(salaData);

    const { data: partData } = await supabase
      .from('participantes_sala')
      .select('user_id, equipo, profiles(nick)')
      .eq('sala_id', salaId);

    if (partData) {
      const parts = partData as any;
      setParticipantes(parts);
      const eq: Record<string, number | null> = {};
      parts.forEach((p: any) => {
        eq[p.user_id] = p.equipo;
      });
      setEquipos(eq);
    }

    setLoading(false);
  }, [salaId, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && salaId) cargarSala();
  }, [user, salaId, cargarSala]);

  function cambiarEquipo(userId: string, equipo: number | null) {
    setEquipos((prev) => ({ ...prev, [userId]: equipo }));
  }

  async function guardarEquipos() {
    setError(null);
    setSuccess(null);
    setSaving(true);

    for (const p of participantes) {
      const equipo = equipos[p.user_id];
      if (equipo !== null && equipo !== undefined && equipo !== p.equipo) {
        const { error: rpcError } = await supabase.rpc('asignar_equipo', {
          p_sala: salaId,
          p_user: p.user_id,
          p_equipo: equipo,
        });
        if (rpcError) {
          setError(`Error asignando equipo a ${p.profiles?.nick}: ${rpcError.message}`);
          setSaving(false);
          return;
        }
      }
    }

    setSuccess('Equipos asignados correctamente');
    setSaving(false);
    cargarSala();
  }

  async function definirLobby() {
    setError(null);
    setSuccess(null);

    if (!lobbyNombre.trim()) {
      setError('Escribe el nombre del lobby');
      return;
    }
    if (!lobbyClave.trim()) {
      setError('Escribe la clave del lobby');
      return;
    }

    const { error: rpcError } = await supabase.rpc('definir_lobby', {
      p_sala: salaId,
      p_nombre: lobbyNombre.trim(),
      p_clave: lobbyClave.trim(),
    });

    if (rpcError) {
      setError('Error al definir lobby: ' + rpcError.message);
    } else {
      setSuccess('Lobby definido. La sala ahora está en juego.');
      setLobbyNombre('');
      setLobbyClave('');
      cargarSala();
    }
  }

  async function cancelarSala() {
    setError(null);
    setSuccess(null);

    if (!confirm('¿Seguro que quieres cancelar esta sala? Se reembolsará a todos los participantes.')) {
      return;
    }

    const { error: rpcError } = await supabase.rpc('cancelar_sala', {
      p_sala: salaId,
    });

    if (rpcError) {
      setError('Error al cancelar: ' + rpcError.message);
    } else {
      setSuccess('Sala cancelada. Todos los participantes fueron reembolsados.');
      cargarSala();
    }
  }

  async function verificarPartida() {
    setError(null);
    setSuccess(null);
    setDatosPartida(null);

    if (!dotaMatchId) {
      setError('Ingresa el ID de la partida');
      return;
    }

    setVerificando(true);

    try {
      const response = await fetch(`/api/dota/match?match_id=${dotaMatchId}`);
      const data = await response.json();

      if (data.error) {
        setError('Error: ' + data.error);
      } else {
        setDatosPartida(data);
        // Auto-seleccionar el equipo ganador
        setEquipoGanador(data.radiant_win ? '1' : '2');
        setSuccess('Partida verificada. Revisa los datos y confirma.');
      }
    } catch {
      setError('Error al verificar la partida');
    }

    setVerificando(false);
  }

  async function terminarPartida() {
    setError(null);
    setSuccess(null);

    const matchId = parseInt(dotaMatchId);
    if (isNaN(matchId) || matchId <= 0) {
      setError('Ingresa un ID de partida válido');
      return;
    }
    if (equipoGanador !== '1' && equipoGanador !== '2') {
      setError('Selecciona el equipo ganador');
      return;
    }

    setTerminando(true);

    const { error: rpcError } = await supabase.rpc('cerrar_partida', {
      p_sala: salaId,
      p_dota_match_id: matchId,
      p_equipo_ganador: parseInt(equipoGanador),
    });

    setTerminando(false);

    if (rpcError) {
      setError('Error al cerrar partida: ' + rpcError.message);
    } else {
      setSuccess('Partida terminada. Premios repartidos a los ganadores.');
      setShowTerminar(false);
      setDotaMatchId('');
      setEquipoGanador('');
      setDatosPartida(null);
      cargarSala();
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Cargando sala...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!sala) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">La sala no existe</p>
          <Link href="/salas" className="mt-4 inline-block text-blue-600 hover:underline">
            Volver a salas
          </Link>
        </div>
      </div>
    );
  }

  if (!['abierta', 'llena', 'en_juego'].includes(sala.estado)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-yellow-600">
            La sala no puede ser gestionada en este estado
          </p>
          <p className="text-sm text-gray-500 mt-2">Estado actual: {sala.estado}</p>
          <Link href="/salas" className="mt-4 inline-block text-blue-600 hover:underline">
            Volver a salas
          </Link>
        </div>
      </div>
    );
  }

  const equipo1Count = Object.values(equipos).filter((e) => e === 1).length;
  const equipo2Count = Object.values(equipos).filter((e) => e === 2).length;
  const balanceados = equipo1Count === equipo2Count;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Admin: {sala.nombre}</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Inicio
            </Link>
            <Link href="/salas" className="text-sm text-gray-600 hover:text-gray-900">
              Salas
            </Link>
            <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
              Panel admin
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded bg-green-50 p-3 text-sm text-green-600">{success}</div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Asignar equipos</h2>
            <div className="mt-2 text-sm text-gray-600">
              Equipo 1: {equipo1Count} | Equipo 2: {equipo2Count}
            </div>
            {!balanceados && (
              <div className="mt-2 rounded bg-yellow-50 p-2 text-sm text-yellow-700">
                Los equipos no están balanceados
              </div>
            )}

            <div className="mt-4 space-y-3">
              {participantes.map((p) => (
                <div key={p.user_id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">{p.profiles?.nick ?? 'Usuario'}</span>
                  <select
                    value={equipos[p.user_id] === 1 ? '1' : equipos[p.user_id] === 2 ? '2' : ''}
                    onChange={(e) =>
                      cambiarEquipo(p.user_id, e.target.value === '' ? null : parseInt(e.target.value))
                    }
                    className="rounded border-2 border-gray-400 bg-white px-3 py-1 text-sm text-black"
                  >
                    <option value="" className="text-black">Sin asignar</option>
                    <option value="1" className="text-black">Radiant</option>
                    <option value="2" className="text-black">Dire</option>
                  </select>
                </div>
              ))}
            </div>

            <button
              onClick={guardarEquipos}
              disabled={saving || !balanceados}
              className="mt-4 w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar equipos'}
            </button>
            {!balanceados && (
              <p className="mt-2 text-xs text-gray-500">
                Los equipos deben estar balanceados para guardar
              </p>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Definir lobby</h2>
            <p className="mt-2 text-sm text-gray-600">
              Los jugadores verán esta información cuando la sala esté en juego.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre del lobby
                </label>
                <input
                  type="text"
                  value={lobbyNombre}
                  onChange={(e) => setLobbyNombre(e.target.value)}
                  className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: Sala Pro 5v5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Clave del lobby
                </label>
                <input
                  type="text"
                  value={lobbyClave}
                  onChange={(e) => setLobbyClave(e.target.value)}
                  className="mt-1 block w-full rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: abc123"
                />
              </div>

              <button
                onClick={definirLobby}
                className="w-full rounded bg-green-600 py-2 text-white hover:bg-green-700"
              >
                Definir lobby y poner en juego
              </button>
            </div>
          </div>

          {(sala.estado === 'abierta' || sala.estado === 'llena' || sala.estado === 'en_juego') && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900">Cancelar sala</h2>
              <p className="mt-2 text-sm text-gray-600">
                Reembolsará a todos los participantes y cerrará la sala.
              </p>
              <button
                onClick={cancelarSala}
                className="mt-4 w-full rounded bg-red-600 py-2 text-white hover:bg-red-700"
              >
                Cancelar sala
              </button>
            </div>
          )}

          {sala.estado === 'en_juego' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900">Terminar partida</h2>
              <p className="mt-2 text-sm text-gray-600">
                Ingresa el ID de la partida y verifica el resultado antes de terminar.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ID de la partida de Dota 2
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={dotaMatchId}
                      onChange={(e) => setDotaMatchId(e.target.value)}
                      className="flex-1 rounded border-2 border-gray-400 bg-white px-4 py-3 text-lg text-black focus:border-blue-500 focus:outline-none"
                      placeholder="Ej: 7654321098"
                    />
                    <button
                      onClick={verificarPartida}
                      disabled={verificando || !dotaMatchId}
                      className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {verificando ? 'Verificando...' : 'Verificar'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Lo encuentras en Dotabuff o en tu perfil de Dota 2
                  </p>
                </div>

                {datosPartida && (
                  <div className="rounded bg-gray-50 p-4 space-y-2">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Ganador:</span>{' '}
                      {datosPartida.radiant_win ? 'Radiant' : 'Dire'}
                    </p>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Duración:</span>{' '}
                      {Math.floor(datosPartida.duration / 60)}m {datosPartida.duration % 60}s
                    </p>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Puntuación:</span>{' '}
                      {datosPartida.radiant_score} - {datosPartida.dire_score}
                    </p>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Equipo ganador (automático):</span>{' '}
                      {datosPartida.radiant_win ? 'Radiant' : 'Dire'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Equipo ganador (se llena automáticamente al verificar)
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEquipoGanador('1')}
                      className={`flex-1 rounded py-2 text-white ${
                        equipoGanador === '1' ? 'bg-blue-700' : 'bg-blue-400'
                      } hover:bg-blue-600`}
                    >
                      Radiant
                    </button>
                    <button
                      onClick={() => setEquipoGanador('2')}
                      className={`flex-1 rounded py-2 text-white ${
                        equipoGanador === '2' ? 'bg-red-700' : 'bg-red-400'
                      } hover:bg-red-600`}
                    >
                      Dire
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={terminarPartida}
                    disabled={terminando || !dotaMatchId}
                    className="flex-1 rounded bg-red-600 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {terminando ? 'Cerrando...' : 'Confirmar y terminar'}
                  </button>
                  <button
                    onClick={() => {
                      setShowTerminar(false);
                      setDotaMatchId('');
                      setEquipoGanador('');
                      setDatosPartida(null);
                    }}
                    className="flex-1 rounded bg-gray-200 py-2 text-gray-700 hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminSalaDetallePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-600">Cargando sala...</p>
        </div>
      }
    >
      <AdminSalaContenido />
    </Suspense>
  );
}
