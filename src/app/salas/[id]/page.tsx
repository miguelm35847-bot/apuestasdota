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

type Lobby = {
  sala_id: string;
  nombre: string;
  clave: string;
};

function SalaContenido() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const salaId = params.id as string;

  const [sala, setSala] = useState<Sala | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [miEquipo, setMiEquipo] = useState<number | null>(null);
  const [esParticipante, setEsParticipante] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [cambiandoEquipo, setCambiandoEquipo] = useState(false);

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
      setParticipantes(partData as any);
      const esPart = partData.some((p: any) => p.user_id === user.id);
      setEsParticipante(esPart);
      if (esPart) {
        const yo = partData.find((p: any) => p.user_id === user.id);
        setMiEquipo(yo?.equipo ?? null);
      }
    }

    // Cargar lobby si la sala está en juego
    if (salaData?.estado === 'en_juego' || salaData?.estado === 'terminada') {
      const { data: lobbyData } = await supabase
        .from('lobbies')
        .select('*')
        .eq('sala_id', salaId)
        .single();
      if (lobbyData) setLobby(lobbyData);
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
    if (user) {
      supabase.rpc('es_admin').then(({ data }: { data: boolean | null }) => {
        setIsAdmin(data === true);
      });
    }
  }, [user, salaId, cargarSala]);

  async function unirseASala() {
    setError(null);
    setSuccess(null);
    setJoining(true);

    const { error: rpcError } = await supabase.rpc('unirse_a_sala', {
      p_sala: salaId,
    });

    if (rpcError) {
      const errores: Record<string, string> = {
        'No autenticado': 'Debes iniciar sesión',
        'Cuenta no disponible': 'Tu cuenta está baneada',
        'La sala no existe': 'La sala no existe',
        'La sala no está abierta': 'La sala ya no está abierta',
        'Ya estás en esta sala': 'Ya estás en esta sala',
        'La sala está llena': 'La sala está llena',
        'Saldo insuficiente': 'No tienes saldo suficiente',
      };
      setError(errores[rpcError.message] ?? rpcError.message);
    } else {
      setSuccess('Te uniste a la sala correctamente');
      cargarSala();
    }
    setJoining(false);
  }

  async function salirDeSala() {
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc('salir_de_sala', {
      p_sala: salaId,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess('Saliste de la sala. Se te reembolsó la cuota.');
      router.push('/');
    }
  }

  async function cambiarEquipo(equipo: number) {
    setError(null);
    setSuccess(null);
    setCambiandoEquipo(true);

    const { error: rpcError } = await supabase.rpc('unirse_a_equipo', {
      p_sala: salaId,
      p_equipo: equipo,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess(`Ahora estás en el Equipo ${equipo}`);
      cargarSala();
    }
    setCambiandoEquipo(false);
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

  const equipo1 = participantes.filter((p) => p.equipo === 1);
  const equipo2 = participantes.filter((p) => p.equipo === 2);
  const sinEquipo = participantes.filter((p) => p.equipo === null);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{sala.nombre}</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Inicio
            </Link>
            <Link href="/salas" className="text-sm text-gray-600 hover:text-gray-900">
              Salas
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
                Panel admin
              </Link>
            )}
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
        {success && (
          <div className="mb-4 rounded bg-green-50 p-3 text-sm text-green-600">{success}</div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Información</h2>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">Estado:</span> {sala.estado}
              </p>
              <p>
                <span className="font-medium">Cuota:</span> S/ {(sala.cuota / 100).toFixed(2)}
              </p>
              <p>
                <span className="font-medium">Cupo:</span> {participantes.length}/{sala.cupo}
              </p>
              <p>
                <span className="font-medium">Comisión casa:</span> {sala.comision_bp / 100}%
              </p>
            </div>

            {(sala.estado === 'abierta' || sala.estado === 'llena' || sala.estado === 'en_juego') && (
              <div className="mt-4 space-y-2">
                {esParticipante ? (
                  <>
                    {miEquipo && sala.estado === 'llena' && (
                      <p className="text-sm text-center text-blue-600 font-medium">
                        Estás en {miEquipo === 1 ? 'Radiant' : 'Dire'} (Equipo {miEquipo})
                      </p>
                    )}
                    {sala.estado === 'llena' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => cambiarEquipo(1)}
                          disabled={cambiandoEquipo}
                          className="flex-1 rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50 text-sm"
                        >
                          {miEquipo === 1 ? '✓ Radiant' : '→ Radiant'}
                        </button>
                        <button
                          onClick={() => cambiarEquipo(2)}
                          disabled={cambiandoEquipo}
                          className="flex-1 rounded bg-red-600 py-2 text-white hover:bg-red-700 disabled:opacity-50 text-sm"
                        >
                          {miEquipo === 2 ? '✓ Dire' : '→ Dire'}
                        </button>
                      </div>
                    )}
                    <button
                      onClick={salirDeSala}
                      className="w-full rounded bg-red-600 py-2 text-white hover:bg-red-700"
                    >
                      Salir de la sala
                    </button>
                  </>
                ) : (
                  <button
                    onClick={unirseASala}
                    disabled={joining}
                    className="w-full rounded bg-green-600 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {joining ? 'Uniéndose...' : 'Unirse a la sala'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Participantes</h2>
            {participantes.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">Aún no hay participantes</p>
            ) : (
              <div className="mt-4 space-y-3">
                {sinEquipo.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Sin equipo</p>
                    <div className="mt-1 space-y-1">
                      {sinEquipo.map((p) => (
                        <p key={p.user_id} className="text-sm text-gray-900">
                          {p.profiles?.nick ?? 'Usuario'}
                          {p.user_id === user.id && ' (tú)'}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {equipo1.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-blue-500 uppercase">Equipo 1</p>
                    <div className="mt-1 space-y-1">
                      {equipo1.map((p) => (
                        <p key={p.user_id} className="text-sm text-gray-900">
                          {p.profiles?.nick ?? 'Usuario'}
                          {p.user_id === user.id && ' (tú)'}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {equipo2.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-500 uppercase">Equipo 2</p>
                    <div className="mt-1 space-y-1">
                      {equipo2.map((p) => (
                        <p key={p.user_id} className="text-sm text-gray-900">
                          {p.profiles?.nick ?? 'Usuario'}
                          {p.user_id === user.id && ' (tú)'}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {lobby && esParticipante && sala.estado === 'en_juego' && (
          <div className="mt-6 rounded-lg bg-blue-50 p-6 shadow">
            <h2 className="text-lg font-semibold text-blue-900">Lobby de Dota 2</h2>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-blue-700">Nombre del lobby</p>
                <p className="text-xl font-bold text-blue-900">{lobby.nombre}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Clave del lobby</p>
                <p className="text-xl font-bold text-blue-900">{lobby.clave}</p>
              </div>
              {miEquipo && (
                <div>
                  <p className="text-sm font-medium text-blue-700">Tu equipo</p>
                  <p className="text-xl font-bold text-blue-900">
                    Equipo {miEquipo} {miEquipo === 1 ? '(Radiant)' : '(Dire)'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {lobby && !esParticipante && sala.estado === 'en_juego' && (
          <div className="mt-6 rounded-lg bg-yellow-50 p-6 shadow">
            <p className="text-sm text-yellow-700">
              La sala está en juego. Solo los participantes pueden ver el lobby.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SalaDetallePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-600">Cargando sala...</p>
        </div>
      }
    >
      <SalaContenido />
    </Suspense>
  );
}
