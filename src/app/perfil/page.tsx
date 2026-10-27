'use client';

import { BilleteraPerfil } from '@/components/perfil/BilleteraPerfil';
import { CabeceraPerfil } from '@/components/perfil/CabeceraPerfil';
import { HistorialPerfil } from '@/components/perfil/HistorialPerfil';
import { PerfilCompetitivo } from '@/components/perfil/PerfilCompetitivo';
import { Aviso, NavegacionPerfil } from '@/components/perfil/PerfilUI';
import { SolicitudesPerfil } from '@/components/perfil/SolicitudesPerfil';
import type { MovimientoPerfil, PartidaPerfil, PerdidaPerfil, Pestaña, RecargaPerfil, RetiroPerfil } from '@/components/perfil/tipos';

import { useAuth } from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import { iniciarAccesoSteam } from '@/lib/steamAuth';
import { sincronizarSteam } from '@/lib/steamClient';
import { supabase } from '@/lib/supabase';
import type { RolDota } from '@/lib/types';
import { useArenaBody } from '@/lib/useArenaBody';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

async function obtenerMiSteamId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const res = await fetch('/api/perfil/steam', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { steamId?: string | null };
  return data.steamId ?? null;
}

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
  const [conteos, setConteos] = useState({ partidas: 0, movimientos: 0, billetera: 0 });
  const [cargandoTab, setCargandoTab] = useState(false);

  useEffect(() => {
    // El contenido del perfil aparece después del fallback de Suspense.
    // Resuelve también los enlaces directos al montar, cuando ya existe el destino.
    const irASeccion = () => {
      const id = window.location.hash.slice(1);
      if (id === 'steam' || id === 'perfil-dota') {
        document.getElementById(id)?.scrollIntoView({ block: 'start' });
      }
    };
    irASeccion();
    window.addEventListener('hashchange', irASeccion);
    return () => window.removeEventListener('hashchange', irASeccion);
  }, []);

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
      .select('nick, steam_avatar_url, steam_nombre, mmr, roles_preferidos')
      .eq('id', user.id)
      .single();
    if (data) {
      setNick(data.nick);
      setSteamAvatar(data.steam_avatar_url);
      setSteamNombre(data.steam_nombre);
      setMmr(data.mmr?.toString() ?? '');
      setMmrGuardado(data.mmr !== null && data.mmr !== undefined);
      setRolesPreferidos((data.roles_preferidos ?? []) as RolDota[]);
    }

    // El SteamID ya no se lee directo de profiles: el servidor lo devuelve
    // solo al usuario autenticado.
    setSteamId(await obtenerMiSteamId());

    const { data: saldoData } = await supabase.rpc('mi_saldo');
    if (saldoData !== null) setSaldo(saldoData);
  }, [user]);

  const cargarHistorial = useCallback(async () => {
    if (!user) return;
    setCargandoTab(true);
    const { data } = await supabase
      .from('participantes_sala')
      .select('sala_id, equipo, salas!inner(nombre, cuota, created_at, partidas!inner(equipo_ganador, premio_por_ganador))')
      .eq('user_id', user.id)
      .eq('salas.estado', 'terminada')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setMisPartidas(data as unknown as PartidaPerfil[]);
    setCargandoTab(false);
  }, [user]);

  const cargarMovimientos = useCallback(async () => {
    if (!user) return;
    setCargandoTab(true);
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
    setCargandoTab(false);
  }, [user]);

  const cargarBilletera = useCallback(async () => {
    if (!user) return;
    setCargandoTab(true);

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
    setCargandoTab(false);
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
  }, [pestaña, cargarHistorial]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga asíncrona de solicitudes
    if (pestaña === 'movimientos') void cargarMovimientos();
  }, [pestaña, cargarMovimientos]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga asíncrona de billetera
    if (pestaña === 'billetera') void cargarBilletera();
  }, [pestaña, cargarBilletera]);

  useEffect(() => {
    if (!user) return;
    let activo = true;

    void (async () => {
      const [partidas, recargas, retiros, movimientos] = await Promise.all([
        supabase
          .from('participantes_sala')
          .select('sala_id, salas!inner(partidas!inner(equipo_ganador))', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('salas.estado', 'terminada'),
        supabase
          .from('recargas')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('retiros')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('movimientos_billetera')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .not('tipo', 'in', '("entrada_sala","reembolso")'),
      ]);

      if (!activo) return;

      setConteos({
        partidas: partidas.count ?? 0,
        movimientos: (recargas.count ?? 0) + (retiros.count ?? 0),
        billetera: movimientos.count ?? 0,
      });
    })();

    return () => {
      activo = false;
    };
  }, [user]);

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
        Promise.all([
          supabase
            .from('profiles')
            .select('steam_avatar_url, steam_nombre')
            .eq('id', user.id)
            .single(),
          obtenerMiSteamId(),
        ]).then(([{ data }, miSteamId]) => {
          if (data) {
            setSteamAvatar(data.steam_avatar_url);
            setSteamNombre(data.steam_nombre);
          }
          setSteamId(miSteamId);
        });
      }
    }
  }, [searchParams, user]);

  async function handleVincularSteam() {
    setError(null);
    setSuccess(null);
    try { await iniciarAccesoSteam(true); }
    catch (error) { setError(error instanceof Error ? error.message : 'No se pudo iniciar la vinculación con Steam'); }
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

  const perfilCompleto = mmrGuardado;

  const movimientosSolicitudes = [
    ...recargas.map((r) => ({
      id: `recarga-${r.id}`,
      tipo: 'Recarga' as const,
      monto: r.monto,
      estado: r.estado,
      detalle: `Nº ${r.numero_operacion}`,
      fecha: r.created_at,
    })),
    ...retiros.map((r) => ({
      id: `retiro-${r.id}`,
      tipo: 'Retiro' as const,
      monto: -r.monto,
      estado: r.estado,
      detalle: r.destino,
      fecha: r.created_at,
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const movimientosBilletera = [
    ...movimientos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      monto: m.monto,
      detalle: m.descripcion ?? '-',
      fecha: m.created_at,
    })),
    ...perdidas.map((p) => ({
      id: `perdida-${p.id}`,
      tipo: 'pérdida_partida',
      monto: p.monto,
      detalle: `Perdiste en ${p.sala_nombre}`,
      fecha: p.created_at,
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Mi Perfil" />

      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && <Aviso tono="error">{error}</Aviso>}
        {success && <Aviso tono="success">{success}</Aviso>}

        {/* Cabecera: identidad, saldo y resumen */}
        <CabeceraPerfil
          nick={nick}
          steamAvatar={steamAvatar}
          perfilCompleto={perfilCompleto}
          user={user}
          steamId={steamId}
          steamNombre={steamNombre}
          handleActualizarSteam={handleActualizarSteam}
          actualizandoSteam={actualizandoSteam}
          handleVincularSteam={handleVincularSteam}
          saldo={saldo}
          conteos={conteos}
        />

        {/* Perfil competitivo */}
        <PerfilCompetitivo
          guardarPerfilDota={guardarPerfilDota}
          mmrGuardado={mmrGuardado}
          mmr={mmr}
          setMmr={setMmr}
          rolesPreferidos={rolesPreferidos}
          alternarRol={alternarRol}
          guardandoDota={guardandoDota}
        />

        {/* Pestañas */}
        <NavegacionPerfil
          pestaña={pestaña}
          setPestaña={setPestaña}
          conteos={conteos}
        />

        <div className="mt-4">
          {pestaña === 'historial' && (
            <HistorialPerfil
              cargandoTab={cargandoTab}
              misPartidas={misPartidas}
            />
          )}

          {pestaña === 'movimientos' && (
            <SolicitudesPerfil
              cargandoTab={cargandoTab}
              movimientosSolicitudes={movimientosSolicitudes}
            />
          )}

          {pestaña === 'billetera' && (
            <BilleteraPerfil
              cargandoTab={cargandoTab}
              movimientosBilletera={movimientosBilletera}
            />
          )}
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
