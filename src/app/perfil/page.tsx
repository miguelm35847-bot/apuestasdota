'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { getSteamLoginUrl } from '@/lib/steam';
import { sincronizarSteam } from '@/lib/steamClient';
import { useArenaBody } from '@/lib/useArenaBody';
import { etiquetaRol, ICONOS_ROL, ROLES_DOTA } from '@/lib/balance';
import Navbar from '@/components/Navbar';
import Avatar from '@/components/Avatar';
import type { RolDota } from '@/lib/types';

type Pestaña = 'historial' | 'movimientos' | 'billetera';

type PartidaPerfil = {
  sala_id: string;
  equipo: number | null;
  salas: {
    nombre: string;
    cuota: number;
    created_at: string;
    partidas: {
      equipo_ganador: number;
      premio_por_ganador: number;
    } | null;
  };
};

type RecargaPerfil = {
  id: string;
  monto: number;
  numero_operacion: string;
  estado: string;
  created_at: string;
};

type RetiroPerfil = {
  id: string;
  monto: number;
  destino: string;
  estado: string;
  created_at: string;
};

type MovimientoPerfil = {
  id: string;
  tipo: string;
  monto: number;
  descripcion: string | null;
  created_at: string;
};

type PerdidaPerfil = {
  id: string;
  created_at: string;
  monto: number;
  sala_nombre: string;
};

function PerfilContenido() {
  useArenaBody();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [pestaña, setPestaña] = useState<Pestaña>('historial');
  const [nick, setNick] = useState<string | null>(null);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [steamAvatar, setSteamAvatar] = useState<string | null>(null);
  const [steamNombre, setSteamNombre] = useState<string | null>(null);
  const [actualizandoSteam, setActualizandoSteam] = useState(false);
  const [mmr, setMmr] = useState('');
  const [mmrGuardado, setMmrGuardado] = useState(false);
  const [rolesPreferidos, setRolesPreferidos] = useState<RolDota[]>([]);
  const [guardandoDota, setGuardandoDota] = useState(false);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado para historial
  const [misPartidas, setMisPartidas] = useState<PartidaPerfil[]>([]);

  // Estado para movimientos
  const [recargas, setRecargas] = useState<RecargaPerfil[]>([]);
  const [retiros, setRetiros] = useState<RetiroPerfil[]>([]);

  // Estado para billetera
  const [movimientos, setMovimientos] = useState<MovimientoPerfil[]>([]);
  const [perdidas, setPerdidas] = useState<PerdidaPerfil[]>([]);

  const cargarDatosPerfil = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('nick, steam_id, steam_avatar_url, steam_nombre, mmr, roles_preferidos')
      .eq('id', user.id)
      .single();
    if (data) {
      setNick(data.nick);
      setSteamId(data.steam_id);
      setSteamAvatar(data.steam_avatar_url);
      setSteamNombre(data.steam_nombre);
      setMmr(data.mmr?.toString() ?? '');
      setMmrGuardado(data.mmr !== null && data.mmr !== undefined);
      setRolesPreferidos((data.roles_preferidos ?? []) as RolDota[]);
    }

    const { data: saldoData } = await supabase.rpc('mi_saldo');
    if (saldoData !== null) setSaldo(saldoData);
  }, [user]);

  const cargarHistorial = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('participantes_sala')
      .select('sala_id, equipo, salas(*, partidas(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setMisPartidas(data as unknown as PartidaPerfil[]);
  }, [user]);

  const cargarMovimientos = useCallback(async () => {
    if (!user) return;
    const { data: recargasData } = await supabase
      .from('recargas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (recargasData) setRecargas(recargasData as unknown as RecargaPerfil[]);

    const { data: retirosData } = await supabase
      .from('retiros')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (retirosData) setRetiros(retirosData as unknown as RetiroPerfil[]);
  }, [user]);

  const cargarBilletera = useCallback(async () => {
    if (!user) return;

    // Movimientos normales (sin entrada_sala ni reembolso)
    const { data } = await supabase
      .from('movimientos_billetera')
      .select('*')
      .eq('user_id', user.id)
      .not('tipo', 'in', '("entrada_sala","reembolso")')
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) setMovimientos(data as unknown as MovimientoPerfil[]);

    // Pérdidas: calcular en navegador desde participantes_sala
    let partidas = misPartidas;
    if (partidas.length === 0) {
      const { data: historialData } = await supabase
        .from('participantes_sala')
        .select('sala_id, equipo, salas(*, partidas(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      partidas = (historialData as unknown as PartidaPerfil[]) ?? [];
    }

    const perdidasCalculadas = partidas
      .filter((p) => {
        const ganador = p.salas?.partidas?.equipo_ganador;
        const miEquipo = p.equipo;
        return ganador && miEquipo && ganador !== miEquipo;
      })
      .map((p) => ({
        id: `perdida-${p.sala_id}`,
        created_at: p.salas?.created_at ?? '',
        monto: -(p.salas?.cuota ?? 0),
        sala_nombre: p.salas?.nombre ?? 'Sala',
      }));

    setPerdidas(perdidasCalculadas);
  }, [user, misPartidas]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del perfil
    void cargarDatosPerfil();
  }, [user, cargarDatosPerfil]);

  useEffect(() => {
    const onPerfilRefresh = () => {
      void cargarDatosPerfil();
    };

    window.addEventListener('perfil:refresh', onPerfilRefresh);
    return () => window.removeEventListener('perfil:refresh', onPerfilRefresh);
  }, [cargarDatosPerfil]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga al cambiar de pestaña
    if (pestaña === 'historial') void cargarHistorial();
    if (pestaña === 'movimientos') void cargarMovimientos();
    if (pestaña === 'billetera') void cargarBilletera();
  }, [pestaña, user, cargarHistorial, cargarMovimientos, cargarBilletera]);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- aviso de error desde la URL
      setError(errorMessages[errorParam] || 'Error desconocido');
    }

    if (successParam === 'linked') {
      setSuccess('Cuenta de Steam vinculada correctamente');
      if (user) {
        supabase
          .from('profiles')
          .select('steam_id, steam_avatar_url, steam_nombre')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setSteamId(data.steam_id);
              setSteamAvatar(data.steam_avatar_url);
              setSteamNombre(data.steam_nombre);
            }
          });
      }
    }
  }, [searchParams, user]);

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

  async function handleActualizarSteam() {
    setError(null);
    setSuccess(null);
    setActualizandoSteam(true);

    const resumen = await sincronizarSteam();

    if (!resumen) {
      setError('No se pudieron actualizar los datos de Steam');
    } else {
      setSteamId(resumen.steamId);
      setSteamAvatar(resumen.avatarUrl);
      setSteamNombre(resumen.nombre);
      setSuccess('Datos de Steam actualizados');
      window.dispatchEvent(new Event('perfil:refresh'));
    }

    setActualizandoSteam(false);
  }

  function alternarRol(rol: RolDota) {
    setRolesPreferidos((prev) => {
      if (prev.includes(rol)) return prev.filter((r) => r !== rol);
      if (prev.length >= 3) return prev;
      return [...prev, rol];
    });
  }

  async function guardarPerfilDota(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    setError(null);
    setSuccess(null);

    // El MMR ya está registrado: solo se pueden editar los roles.
    if (mmrGuardado) {
      setGuardandoDota(true);
      const { error: saveError } = await supabase.rpc('guardar_roles_preferidos', {
        p_roles: rolesPreferidos,
      });
      if (saveError) {
        setError('No se pudieron guardar tus roles: ' + saveError.message);
      } else {
        setSuccess('Roles guardados correctamente');
        window.dispatchEvent(new Event('perfil:refresh'));
      }
      setGuardandoDota(false);
      return;
    }

    const mmrNumero = mmr.trim() === '' ? null : Number(mmr);

    if (mmrNumero === null) {
      setError('Ingresa tu MMR');
      return;
    }
    if (!Number.isInteger(mmrNumero) || mmrNumero < 0 || mmrNumero > 20000) {
      setError('El MMR debe ser un número entero entre 0 y 20000');
      return;
    }

    setGuardandoDota(true);

    const { error: saveError } = await supabase.rpc('guardar_perfil_competitivo', {
      p_mmr: mmrNumero,
      p_roles: rolesPreferidos,
    });

    if (saveError) {
      setError('No se pudo guardar tu perfil: ' + saveError.message);
    } else {
      setMmrGuardado(true);
      setSuccess('Perfil guardado correctamente');
      window.dispatchEvent(new Event('perfil:refresh'));
    }

    setGuardandoDota(false);
  }

  const pestañas: { id: Pestaña; nombre: string }[] = [
    { id: 'historial', nombre: 'Mis partidas' },
    { id: 'movimientos', nombre: 'Recargas y retiros' },
    { id: 'billetera', nombre: 'Billetera' },
  ];
  const perfilCompleto = mmrGuardado;

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Mi Perfil" />

      <main className="mx-auto max-w-5xl px-4 py-8">
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

        {/* Datos del perfil */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
            <div className="flex items-center gap-4">
              <Avatar nick={nick} src={steamAvatar} size="xl" ringClass="ring-2 ring-white/20" />
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold text-white">Datos del perfil</h2>
                <p className="mt-0.5 truncate text-sm text-slate-500">{nick || '...'}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-slate-400">
                <span className="font-medium">Nick:</span> {nick || '...'}
              </p>
              <p className="text-sm text-slate-400">
                <span className="font-medium">Email:</span> {user?.email}
              </p>
              <p className="text-sm text-slate-400">
                <span className="font-medium">Steam:</span>{' '}
                {steamId
                  ? steamNombre
                    ? `${steamNombre} (${steamId})`
                    : `Vinculado (${steamId})`
                  : 'No vinculado'}
              </p>
              {steamId && (
                <button
                  onClick={handleActualizarSteam}
                  disabled={actualizandoSteam}
                  className="text-sm font-medium text-prism-300 hover:text-prism-200 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actualizandoSteam ? 'Actualizando...' : 'Actualizar datos de Steam'}
                </button>
              )}
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
                  className="block w-full rounded-lg bg-emerald-500 py-2 text-center font-semibold text-emerald-950 transition hover:bg-emerald-400"
                >
                  Recargar saldo
                </Link>
              </div>
            )}
          </div>

          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
            <h2 className="font-display text-lg font-bold text-white">Tu saldo</h2>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {saldo !== null ? `S/ ${(saldo / 100).toFixed(2)}` : '...'}
            </p>
          </div>
        </div>

        {/* Perfil competitivo */}
        <div className="mt-6 arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Perfil competitivo</h2>
              <p className="mt-1 text-sm text-slate-400">
                Tu MMR es público y lo ven los capitanes al elegir. Solo se puede registrar una
                vez; si necesitas corregirlo, contacta a un administrador. Los roles son opcionales.
              </p>
            </div>
            <span
              className={`inline-block shrink-0 self-start rounded-full px-3 py-1 text-xs font-semibold ${
                perfilCompleto
                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30'
              }`}
            >
              {perfilCompleto ? 'MMR listo' : 'Falta tu MMR'}
            </span>
          </div>

          <form onSubmit={guardarPerfilDota} className="mt-4">
            <label className="block max-w-xs">
              <span className="text-sm font-medium text-slate-300">MMR</span>
              <input
                type="number"
                min={0}
                max={20000}
                step={1}
                value={mmr}
                onChange={(e) => setMmr(e.target.value)}
                placeholder="Ej: 4500"
                disabled={mmrGuardado}
                readOnly={mmrGuardado}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-slate-500"
              />
              {mmrGuardado && (
                <span className="mt-1 block text-xs text-slate-500">
                  El MMR solo se registra una vez. Si necesitas corregirlo, contacta a un
                  administrador.
                </span>
              )}
            </label>

            <div className="mt-4">
              <p className="text-sm font-medium text-slate-300">
                Preferencias de rol{' '}
                <span className="font-normal text-slate-500">(opcional, hasta 3 en orden)</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROLES_DOTA.map((rol) => {
                  const posicion = rolesPreferidos.indexOf(rol.id);
                  const seleccionado = posicion >= 0;
                  return (
                    <button
                      key={rol.id}
                      type="button"
                      onClick={() => alternarRol(rol.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        seleccionado
                          ? 'border-prism-400 bg-prism-500/20 text-prism-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span aria-hidden="true">{ICONOS_ROL[rol.id]}</span>
                      <span>
                        {seleccionado ? `${posicion + 1}. ` : ''}
                        {rol.nombre}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Orden actual:{' '}
                {rolesPreferidos.length > 0
                  ? rolesPreferidos.map((rol, i) => `${i + 1}. ${etiquetaRol(rol)}`).join(' → ')
                  : 'ninguno'}
              </p>
            </div>

            <button
              type="submit"
              disabled={guardandoDota}
              className="mt-4 w-full rounded-lg bg-prism-500 py-2.5 font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:opacity-50"
            >
              {guardandoDota ? 'Guardando...' : mmrGuardado ? 'Guardar roles' : 'Guardar perfil'}
            </button>
          </form>
        </div>

        {/* Pestañas */}
        <div className="mt-6">
          <div className="flex gap-2 border-b border-white/10">
            {pestañas.map((p) => (
              <button
                key={p.id}
                onClick={() => setPestaña(p.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-0.5 ${
                  pestaña === p.id
                    ? 'border-prism-400 text-prism-300'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {p.nombre}
              </button>
            ))}
          </div>

          <div className="mt-4 arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
            {pestaña === 'historial' && (
              <div>
                <h3 className="font-display text-lg font-bold text-white mb-4">Mis partidas</h3>
                {misPartidas.length === 0 ? (
                  <p className="text-sm text-slate-500">Aún no has jugado ninguna partida.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="pb-2 text-left font-medium text-slate-400">Sala</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Fecha</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Equipo</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Resultado</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {misPartidas.map((p) => {
                          const ganador = p.salas?.partidas?.equipo_ganador;
                          const miEquipo = p.equipo;
                          const gano = ganador !== null && ganador !== undefined && miEquipo === ganador;
                          const monto = gano
                            ? (p.salas?.partidas?.premio_por_ganador ?? 0)
                            : -(p.salas?.cuota ?? 0);
                          return (
                            <tr key={p.sala_id} className="border-b border-white/5">
                              <td className="py-2 text-slate-100">{p.salas?.nombre ?? 'Sala'}</td>
                              <td className="py-2 text-slate-100">
                                {new Date(p.salas?.created_at ?? '').toLocaleDateString('es-PE')}
                              </td>
                              <td className="py-2 text-slate-100">
                                {miEquipo === 1 ? 'Radiant' : miEquipo === 2 ? 'Dire' : 'Sin asignar'}
                              </td>
                              <td className="py-2">
                                {ganador ? (
                                  <span
                                    className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                                      gano ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                                    }`}
                                  >
                                    {gano ? 'Ganaste' : 'Perdiste'}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">En curso</span>
                                )}
                              </td>
                              <td className={`py-2 font-medium ${gano ? 'text-emerald-300' : 'text-rose-300'}`}>
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
                <h3 className="font-display text-lg font-bold text-white mb-4">Recargas y retiros</h3>

                <h4 className="text-sm font-semibold text-slate-300 mb-2">Recargas</h4>
                {recargas.length === 0 ? (
                  <p className="text-sm text-slate-500 mb-4">No tienes recargas.</p>
                ) : (
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="pb-2 text-left font-medium text-slate-400">Fecha</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Monto</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Nº Operación</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recargas.map((r) => (
                          <tr key={r.id} className="border-b border-white/5">
                            <td className="py-2 text-slate-100">
                              {new Date(r.created_at).toLocaleDateString('es-PE')}
                            </td>
                            <td className="py-2 text-slate-100">S/ {(r.monto / 100).toFixed(2)}</td>
                            <td className="py-2 text-slate-100">{r.numero_operacion}</td>
                            <td className="py-2">
                              <span
                                className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                                  r.estado === 'aprobada'
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : r.estado === 'pendiente'
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'bg-rose-500/15 text-rose-300'
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

                <h4 className="text-sm font-semibold text-slate-300 mb-2">Retiros</h4>
                {retiros.length === 0 ? (
                  <p className="text-sm text-slate-500">No tienes retiros.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="pb-2 text-left font-medium text-slate-400">Fecha</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Monto</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Destino</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retiros.map((r) => (
                          <tr key={r.id} className="border-b border-white/5">
                            <td className="py-2 text-slate-100">
                              {new Date(r.created_at).toLocaleDateString('es-PE')}
                            </td>
                            <td className="py-2 text-slate-100">S/ {(r.monto / 100).toFixed(2)}</td>
                            <td className="py-2 text-slate-100">{r.destino}</td>
                            <td className="py-2">
                              <span
                                className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                                  r.estado === 'pagado'
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : r.estado === 'solicitado'
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'bg-rose-500/15 text-rose-300'
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
                <h3 className="font-display text-lg font-bold text-white mb-4">Movimientos de billetera</h3>
                {movimientos.length === 0 && perdidas.length === 0 ? (
                  <p className="text-sm text-slate-500">No tienes movimientos.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="pb-2 text-left font-medium text-slate-400">Fecha</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Tipo</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Monto</th>
                          <th className="pb-2 text-left font-medium text-slate-400">Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientos.map((m) => (
                          <tr key={m.id} className="border-b border-white/5">
                            <td className="py-2 text-slate-100">
                              {new Date(m.created_at).toLocaleDateString('es-PE')}
                            </td>
                            <td className="py-2 text-slate-100">{m.tipo}</td>
                            <td className={`py-2 font-medium ${m.monto > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {m.monto > 0 ? '+' : ''}S/ {(m.monto / 100).toFixed(2)}
                            </td>
                            <td className="py-2 text-slate-100">{m.descripcion ?? '-'}</td>
                          </tr>
                        ))}
                        {perdidas.map((p) => (
                          <tr key={`perdida-${p.id}`} className="border-b border-white/5">
                            <td className="py-2 text-slate-100">
                              {new Date(p.created_at).toLocaleDateString('es-PE')}
                            </td>
                            <td className="py-2 text-slate-100">pérdida_partida</td>
                            <td className="py-2 font-medium text-rose-300">
                              -S/ {(Math.abs(p.monto) / 100).toFixed(2)}
                            </td>
                            <td className="py-2 text-slate-100">
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
    <Suspense
      fallback={
        <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
          Cargando...
        </div>
      }
    >
      <PerfilContenido />
    </Suspense>
  );
}
