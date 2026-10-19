'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { getSteamLoginUrl } from '@/lib/steam';
import NotificationBell from '@/components/NotificationBell';

type Pestaña = 'historial' | 'movimientos' | 'billetera';

function PerfilContenido() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pestaña, setPestaña] = useState<Pestaña>('historial');
  const [nick, setNick] = useState<string | null>(null);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado para historial
  const [misPartidas, setMisPartidas] = useState<any[]>([]);

  // Estado para movimientos
  const [recargas, setRecargas] = useState<any[]>([]);
  const [retiros, setRetiros] = useState<any[]>([]);

  // Estado para billetera
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [perdidas, setPerdidas] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    cargarDatosPerfil();
  }, [user]);

  useEffect(() => {
    if (pestaña === 'historial') cargarHistorial();
    if (pestaña === 'movimientos') cargarMovimientos();
    if (pestaña === 'billetera') cargarBilletera();
  }, [pestaña, user]);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const successParam = searchParams.get('steam');

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        steam_auth_failed: 'La autenticación con Steam falló',
        steam_already_linked: 'Esta cuenta de Steam ya está vinculada a otro usuario',
        steam_link_failed: 'Error al vincular la cuenta de Steam',
        not_authenticated: 'Debes iniciar sesión primero',
        unknown: 'Error desconocido',
      };
      setError(errorMessages[errorParam] || 'Error desconocido');
    }

    if (successParam === 'linked') {
      setSuccess('Cuenta de Steam vinculada correctamente');
      if (user) {
        supabase
          .from('profiles')
          .select('steam_id')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) setSteamId(data.steam_id);
          });
      }
    }
  }, [searchParams, user]);

  async function cargarDatosPerfil() {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('nick, steam_id')
      .eq('id', user.id)
      .single();
    if (data) {
      setNick(data.nick);
      setSteamId(data.steam_id);
    }
    const { data: saldoData } = await supabase.rpc('mi_saldo');
    if (saldoData !== null) setSaldo(saldoData);
  }

  async function cargarHistorial() {
    if (!user) return;
    const { data } = await supabase
      .from('participantes_sala')
      .select('sala_id, equipo, salas(*, partidas(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setMisPartidas(data);
  }

  async function cargarMovimientos() {
    if (!user) return;
    const { data: recargasData } = await supabase
      .from('recargas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (recargasData) setRecargas(recargasData);

    const { data: retirosData } = await supabase
      .from('retiros')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (retirosData) setRetiros(retirosData);
  }

  async function cargarBilletera() {
    if (!user) return;

    // Movimientos normales (sin entrada_sala ni reembolso)
    const { data } = await supabase
      .from('movimientos_billetera')
      .select('*')
      .eq('user_id', user.id)
      .not('tipo', 'in', '("entrada_sala","reembolso")')
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) setMovimientos(data);

    // Pérdidas: calcular en navegador desde participantes_sala
    if (misPartidas.length === 0) {
      cargarHistorial();
      return;
    }

    const perdidasCalculadas = misPartidas
      .filter((p: any) => {
        const ganador = p.salas?.partidas?.equipo_ganador;
        const miEquipo = p.equipo;
        return ganador && miEquipo && ganador !== miEquipo;
      })
      .map((p: any) => ({
        id: `perdida-${p.sala_id}`,
        created_at: p.salas?.created_at,
        monto: -(p.salas?.cuota ?? 0),
        sala_nombre: p.salas?.nombre ?? 'Sala',
      }));

    setPerdidas(perdidasCalculadas);
  }

  async function handleVincularSteam() {
    setError(null);
    setSuccess(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('No se pudo obtener la sesión actual');
      return;
    }
    const origin = window.location.origin;
    const returnUrl = `${origin}/api/auth/steam/callback`;
    const steamUrl = getSteamLoginUrl(returnUrl, session.access_token);
    window.location.href = steamUrl;
  }

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const pestañas: { id: Pestaña; nombre: string }[] = [
    { id: 'historial', nombre: 'Mis partidas' },
    { id: 'movimientos', nombre: 'Recargas y retiros' },
    { id: 'billetera', nombre: 'Billetera' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Mi Perfil</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Inicio
            </Link>
            <Link href="/salas" className="text-sm text-gray-600 hover:text-gray-900">
              Salas
            </Link>
            <Link href="/recargar" className="text-sm text-gray-600 hover:text-gray-900">
              Recargar
            </Link>
            <Link href="/retirar" className="text-sm text-gray-600 hover:text-gray-900">
              Retirar
            </Link>
            <NotificationBell />
            <button
              onClick={handleSignOut}
              className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Cerrar sesión
            </button>
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

        {/* Datos del perfil */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Datos del perfil</h2>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Nick:</span> {nick || '...'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {user?.email}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Steam:</span>{' '}
                {steamId ? `Vinculado (${steamId})` : 'No vinculado'}
              </p>
            </div>
            {!steamId && (
              <button
                onClick={handleVincularSteam}
                className="mt-4 w-full rounded bg-[#171a21] py-3 text-white hover:bg-[#2a475e] flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Vincular cuenta de Steam
              </button>
            )}
            {steamId && (
              <div className="mt-4">
                <Link
                  href="/recargar"
                  className="block w-full rounded bg-green-600 py-2 text-center text-white hover:bg-green-700"
                >
                  Recargar saldo
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Tu saldo</h2>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {saldo !== null ? `S/ ${(saldo / 100).toFixed(2)}` : '...'}
            </p>
          </div>
        </div>

        {/* Pestañas */}
        <div className="mt-6">
          <div className="flex gap-2 border-b border-gray-200">
            {pestañas.map((p) => (
              <button
                key={p.id}
                onClick={() => setPestaña(p.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-0.5 ${
                  pestaña === p.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.nombre}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-lg bg-white p-6 shadow">
            {pestaña === 'historial' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Mis partidas</h3>
                {misPartidas.length === 0 ? (
                  <p className="text-sm text-gray-500">Aún no has jugado ninguna partida.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="pb-2 text-left font-medium text-gray-600">Sala</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Fecha</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Equipo</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Resultado</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {misPartidas.map((p: any) => {
                          const ganador = p.salas?.partidas?.equipo_ganador;
                          const miEquipo = p.equipo;
                          const gano = ganador !== null && ganador !== undefined && miEquipo === ganador;
                          const monto = gano
                            ? (p.salas?.partidas?.premio_por_ganador ?? 0)
                            : -(p.salas?.cuota ?? 0);
                          return (
                            <tr key={p.sala_id} className="border-b border-gray-100">
                              <td className="py-2 text-gray-900">{p.salas?.nombre ?? 'Sala'}</td>
                              <td className="py-2 text-gray-900">
                                {new Date(p.salas?.created_at ?? '').toLocaleDateString('es-PE')}
                              </td>
                              <td className="py-2 text-gray-900">
                                {miEquipo === 1 ? 'Radiant' : miEquipo === 2 ? 'Dire' : 'Sin asignar'}
                              </td>
                              <td className="py-2">
                                {ganador ? (
                                  <span
                                    className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                                      gano ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {gano ? 'Ganaste' : 'Perdiste'}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">En curso</span>
                                )}
                              </td>
                              <td className={`py-2 font-medium ${gano ? 'text-green-600' : 'text-red-600'}`}>
                                {gano ? '+' : ''}S/ {(monto / 100).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {pestaña === 'movimientos' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recargas y retiros</h3>

                <h4 className="text-sm font-semibold text-gray-700 mb-2">Recargas</h4>
                {recargas.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-4">No tienes recargas.</p>
                ) : (
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="pb-2 text-left font-medium text-gray-600">Fecha</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Monto</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Nº Operación</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recargas.map((r) => (
                          <tr key={r.id} className="border-b border-gray-100">
                            <td className="py-2 text-gray-900">
                              {new Date(r.created_at).toLocaleDateString('es-PE')}
                            </td>
                            <td className="py-2 text-gray-900">S/ {(r.monto / 100).toFixed(2)}</td>
                            <td className="py-2 text-gray-900">{r.numero_operacion}</td>
                            <td className="py-2">
                              <span
                                className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                                  r.estado === 'aprobada'
                                    ? 'bg-green-100 text-green-800'
                                    : r.estado === 'pendiente'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {r.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h4 className="text-sm font-semibold text-gray-700 mb-2">Retiros</h4>
                {retiros.length === 0 ? (
                  <p className="text-sm text-gray-500">No tienes retiros.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="pb-2 text-left font-medium text-gray-600">Fecha</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Monto</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Destino</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retiros.map((r) => (
                          <tr key={r.id} className="border-b border-gray-100">
                            <td className="py-2 text-gray-900">
                              {new Date(r.created_at).toLocaleDateString('es-PE')}
                            </td>
                            <td className="py-2 text-gray-900">S/ {(r.monto / 100).toFixed(2)}</td>
                            <td className="py-2 text-gray-900">{r.destino}</td>
                            <td className="py-2">
                              <span
                                className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                                  r.estado === 'pagado'
                                    ? 'bg-green-100 text-green-800'
                                    : r.estado === 'solicitado'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {r.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {pestaña === 'billetera' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Movimientos de billetera</h3>
                {movimientos.length === 0 && perdidas.length === 0 ? (
                  <p className="text-sm text-gray-500">No tienes movimientos.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="pb-2 text-left font-medium text-gray-600">Fecha</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Tipo</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Monto</th>
                          <th className="pb-2 text-left font-medium text-gray-600">Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientos.map((m) => (
                          <tr key={m.id} className="border-b border-gray-100">
                            <td className="py-2 text-gray-900">
                              {new Date(m.created_at).toLocaleDateString('es-PE')}
                            </td>
                            <td className="py-2 text-gray-900">{m.tipo}</td>
                            <td className={`py-2 font-medium ${m.monto > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {m.monto > 0 ? '+' : ''}S/ {(m.monto / 100).toFixed(2)}
                            </td>
                            <td className="py-2 text-gray-900">{m.descripcion ?? '-'}</td>
                          </tr>
                        ))}
                        {perdidas.map((p) => (
                          <tr key={`perdida-${p.id}`} className="border-b border-gray-100">
                            <td className="py-2 text-gray-900">
                              {new Date(p.created_at).toLocaleDateString('es-PE')}
                            </td>
                            <td className="py-2 text-gray-900">pérdida_partida</td>
                            <td className="py-2 font-medium text-red-600">
                              -S/ {(Math.abs(p.monto) / 100).toFixed(2)}
                            </td>
                            <td className="py-2 text-gray-900">
                              Perdiste en {p.sala_nombre}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
      <PerfilContenido />
    </Suspense>
  );
}
