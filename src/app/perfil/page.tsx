'use client';

import { useCallback, useEffect, useState, Suspense, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { sincronizarSteam } from '@/lib/steamClient';
import { useArenaBody } from '@/lib/useArenaBody';
import { etiquetaRol, ICONOS_ROL, ROLES_DOTA } from '@/lib/balance';
import Navbar from '@/components/Navbar';
import Avatar from '@/components/Avatar';
import MedallaMmr from '@/components/MedallaMmr';
import PlayerLinks from '@/components/PlayerLinks';
import SteamIcon from '@/components/SteamIcon';
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

const PESTAÑAS: { id: Pestaña; nombre: string; nombreCorto: string }[] = [
  { id: 'historial', nombre: 'Mis partidas', nombreCorto: 'Partidas' },
  { id: 'movimientos', nombre: 'Recargas y retiros', nombreCorto: 'Solicitudes' },
  { id: 'billetera', nombre: 'Billetera', nombreCorto: 'Billetera' },
];

function IconoPestana({ id, className = 'h-4 w-4' }: { id: Pestaña; className?: string }) {
  if (id === 'historial') {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (id === 'movimientos') {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 7h11" />
        <path d="M14 4l3 3-3 3" />
        <path d="M17 17H6" />
        <path d="M10 20l-3-3 3-3" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 14h2" />
    </svg>
  );
}

function EstadoPill({ estado }: { estado: string }) {
  const estilos: Record<string, string> = {
    aprobada: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    pagado: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    pendiente: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    solicitado: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    rechazada: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    rechazado: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
        estilos[estado] ?? 'bg-white/5 text-slate-300 ring-white/10'
      }`}
    >
      {estado}
    </span>
  );
}

function Aviso({ tono, children }: { tono: 'error' | 'success'; children: ReactNode }) {
  const esError = tono === 'error';
  return (
    <div
      role={esError ? 'alert' : 'status'}
      className={`mb-4 flex items-start gap-2.5 rounded-xl border p-3 text-sm ${
        esError
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      }`}
    >
      <svg
        className="mt-0.5 h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {esError ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="m8.5 12.5 2.5 2.5 4.5-5" />
          </>
        )}
      </svg>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function PanelTab({
  titulo,
  descripcion,
  cargando,
  vacio,
  vacioTexto,
  vacioAccion,
  children,
  id,
}: {
  titulo: string;
  descripcion?: string;
  cargando: boolean;
  vacio: boolean;
  vacioTexto: string;
  vacioAccion?: { href: string; label: string };
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      role={id ? 'tabpanel' : undefined}
      aria-labelledby={id ? `${id}-tab` : undefined}
      className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft sm:p-6"
    >
      <div className="mb-4">
        <h3 className="font-display text-lg font-bold text-white">{titulo}</h3>
        {descripcion && <p className="mt-0.5 text-sm text-slate-400">{descripcion}</p>}
      </div>

      {cargando ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : vacio ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
          <p className="text-sm text-slate-400">{vacioTexto}</p>
          {vacioAccion && (
            <Link
              href={vacioAccion.href}
              className="mt-3 inline-flex rounded-lg border border-prism-500/30 bg-prism-500/10 px-4 py-2 text-sm font-semibold text-prism-200 transition hover:bg-prism-500/20"
            >
              {vacioAccion.label}
            </Link>
          )}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

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
      .select('sala_id, equipo, salas(*, partidas(*))')
      .eq('user_id', user.id)
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
    if (pestaña === 'movimientos') void cargarMovimientos();
    if (pestaña === 'billetera') void cargarBilletera();
  }, [pestaña, user, cargarHistorial, cargarMovimientos, cargarBilletera]);

  useEffect(() => {
    if (!user) return;
    let activo = true;

    void (async () => {
      const [partidas, recargas, retiros, movimientos] = await Promise.all([
        supabase
          .from('participantes_sala')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('No se pudo obtener la sesión actual');
      return;
    }

    try {
      const response = await fetch('/api/auth/steam/start', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(data.error || 'No se pudo iniciar la vinculación con Steam');
        return;
      }

      window.location.href = data.url;
    } catch {
      setError('No se pudo iniciar la vinculación con Steam');
    }
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
        <section className="arena-card relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-arena-soft">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(99,102,241,0.14),transparent_55%)]"
          />
          <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-center">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar nick={nick} src={steamAvatar} size="xl" ringClass="ring-2 ring-white/20" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold text-white">{nick || 'Jugador'}</h1>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                      perfilCompleto
                        ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
                    }`}
                  >
                    {perfilCompleto ? 'MMR listo' : 'Falta tu MMR'}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-400">{user?.email}</p>
                {user && (
                  <Link
                    href={`/jugadores/${user.id}`}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-prism-500/20 bg-prism-500/10 px-3 py-1 text-xs font-semibold text-prism-200 transition hover:border-prism-400/40 hover:bg-prism-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-500/40"
                  >
                    Ver mi perfil público
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M7 17 17 7" />
                      <path d="M8 7h9v9" />
                    </svg>
                  </Link>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                      steamId
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/10 bg-white/5 text-slate-300'
                    }`}
                  >
                    <SteamIcon className="h-3.5 w-3.5 shrink-0 text-[#66c0f4]" />
                    <span className="max-w-[170px] truncate">
                      {steamId
                        ? steamNombre
                          ? `Steam: ${steamNombre}`
                          : 'Steam vinculado'
                        : 'Steam sin vincular'}
                    </span>
                  </span>
                  {steamId ? (
                    <button
                      onClick={handleActualizarSteam}
                      disabled={actualizandoSteam}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Actualizar datos de Steam"
                    >
                      <SteamIcon className="h-3.5 w-3.5 text-[#66c0f4]" />
                      {actualizandoSteam ? 'Actualizando...' : 'Actualizar'}
                    </button>
                  ) : (
                    <button
                      onClick={handleVincularSteam}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#1b2838] px-3 py-1 font-semibold text-white ring-1 ring-inset ring-[#66c0f4]/40 shadow-[0_6px_18px_-10px_rgba(102,192,244,0.9)] transition hover:bg-[#2a475e] hover:ring-[#66c0f4]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66c0f4]/50"
                    >
                      <SteamIcon className="h-3.5 w-3.5 text-[#66c0f4]" />
                      Vincular con Steam
                    </button>
                  )}
                  <PlayerLinks steamId={steamId} tamano="md" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300/80">
                    Saldo disponible
                  </p>
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  />
                </div>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums text-emerald-300">
                  {saldo !== null ? `S/ ${(saldo / 100).toFixed(2)}` : '...'}
                </p>
                <p className="mt-1 text-xs text-slate-400">Listo para jugar o retirar.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/recargar"
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
                >
                  Recargar
                </Link>
                <Link
                  href="/retirar"
                  className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-500/40"
                >
                  Retirar
                </Link>
              </div>
            </div>
          </div>

          <div className="relative grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-white/[0.02]">
            {[
              { label: 'Partidas', valor: conteos.partidas, icono: 'historial' as const },
              { label: 'Solicitudes', valor: conteos.movimientos, icono: 'movimientos' as const },
              { label: 'Movimientos', valor: conteos.billetera, icono: 'billetera' as const },
            ].map((item) => (
              <div
                key={item.label}
                className="flex min-w-0 items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4"
              >
                <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-400 sm:flex">
                  <IconoPestana id={item.icono} className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-[11px]">
                    {item.label}
                  </p>
                  <p className="font-display text-xl font-bold tabular-nums text-white sm:text-2xl">
                    {item.valor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Perfil competitivo */}
        <section className="mt-6 arena-card rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-prism-500/15 text-prism-200 ring-1 ring-inset ring-prism-500/20">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
                <path d="M7 6H4v2a4 4 0 0 0 4 4" />
                <path d="M17 6h3v2a4 4 0 0 1-4 4" />
              </svg>
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Perfil competitivo</h2>
              <p className="mt-1 text-sm text-slate-400">
                Tu MMR es público y lo ven los capitanes al elegir. Solo se puede registrar una
                vez; si necesitas corregirlo, contacta a un administrador. Los roles son opcionales.
              </p>
            </div>
          </div>

          <form onSubmit={guardarPerfilDota} className="mt-5">
            <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <div>
                <span className="text-sm font-medium text-slate-300">MMR</span>
                {mmrGuardado ? (
                  <div className="mt-1 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
                    <MedallaMmr
                      mmr={mmr.trim() === '' ? null : Number(mmr)}
                      size="sm"
                      mostrarNombre={false}
                    />
                    <span className="font-display text-2xl font-bold tabular-nums text-white">
                      {mmr || '—'}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                      Bloqueado
                    </span>
                  </div>
                ) : (
                  <input
                    type="number"
                    min={0}
                    max={20000}
                    step={1}
                    value={mmr}
                    onChange={(e) => setMmr(e.target.value)}
                    placeholder="Ej: 4500"
                    aria-label="MMR"
                    className="mt-1 block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
                  />
                )}
                <p className="mt-2 text-xs text-slate-400">
                  {mmrGuardado
                    ? 'El MMR solo se registra una vez. Si necesitas corregirlo, contacta a un administrador.'
                    : 'Ingresa tu MMR actual (0 a 20000).'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-300">
                  Preferencias de rol{' '}
                  <span className="font-normal text-slate-400">(opcional, hasta 3 en orden)</span>
                </p>
                <div role="group" aria-label="Preferencias de rol" className="mt-2 flex flex-wrap gap-2">
                  {ROLES_DOTA.map((rol) => {
                    const posicion = rolesPreferidos.indexOf(rol.id);
                    const seleccionado = posicion >= 0;
                    return (
                      <button
                        key={rol.id}
                        type="button"
                        onClick={() => alternarRol(rol.id)}
                        aria-pressed={seleccionado}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-500/40 ${
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
                <p className="mt-2 text-xs text-slate-400">
                  Orden actual:{' '}
                  {rolesPreferidos.length > 0
                    ? rolesPreferidos.map((rol, i) => `${i + 1}. ${etiquetaRol(rol)}`).join(' → ')
                    : 'ninguno'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={guardandoDota}
                className="w-full rounded-lg bg-prism-500 px-6 py-2.5 font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:opacity-50 sm:w-auto"
              >
                {guardandoDota ? 'Guardando...' : mmrGuardado ? 'Guardar roles' : 'Guardar perfil'}
              </button>
              {!mmrGuardado && (
                <p className="text-xs text-slate-400">
                  El MMR quedará bloqueado después de guardarlo.
                </p>
              )}
            </div>
          </form>
        </section>

        {/* Pestañas */}
        <div className="sticky top-16 z-20 -mx-4 mt-6 border-b border-white/10 bg-[#0a0e17]/85 px-4 py-3 backdrop-blur lg:top-[72px]">
          <div
            role="tablist"
            aria-label="Secciones del perfil"
            className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/5 p-1 sm:flex"
          >
            {PESTAÑAS.map((p) => {
              const activo = pestaña === p.id;
              const cantidad =
                p.id === 'historial'
                  ? conteos.partidas
                  : p.id === 'movimientos'
                  ? conteos.movimientos
                  : conteos.billetera;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  id={`panel-${p.id}-tab`}
                  aria-selected={activo}
                  aria-controls={`panel-${p.id}`}
                  onClick={() => setPestaña(p.id)}
                  className={`flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 py-2.5 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-500/40 sm:flex-1 sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm ${
                    activo
                      ? 'bg-prism-500 text-white shadow-arena-glow'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <IconoPestana id={p.id} />
                  <span className="truncate sm:hidden">{p.nombreCorto}</span>
                  <span className="hidden sm:inline">{p.nombre}</span>
                  {cantidad > 0 && (
                    <span
                      className={`rounded-full px-1 py-0.5 text-[9px] font-bold tabular-nums sm:px-1.5 sm:text-[10px] ${
                        activo ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {cantidad}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          {pestaña === 'historial' && (
            <PanelTab
              id="panel-historial"
              titulo="Mis partidas"
              descripcion="Tus últimas 20 partidas."
              cargando={cargandoTab && misPartidas.length === 0}
              vacio={misPartidas.length === 0}
              vacioTexto="Aún no has jugado ninguna partida."
              vacioAccion={{ href: '/salas', label: 'Ver salas disponibles' }}
            >
              <div className="space-y-3">
                {misPartidas.map((p) => {
                  const ganador = p.salas?.partidas?.equipo_ganador;
                  const miEquipo = p.equipo;
                  const gano =
                    ganador !== null && ganador !== undefined && miEquipo === ganador;
                  const enCurso = !ganador;
                  const monto = gano
                    ? p.salas?.partidas?.premio_por_ganador ?? 0
                    : -(p.salas?.cuota ?? 0);
                  return (
                    <article
                      key={p.sala_id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">
                          {p.salas?.nombre ?? 'Sala'}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>
                            {new Date(p.salas?.created_at ?? '').toLocaleDateString('es-PE')}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                miEquipo === 1
                                  ? 'bg-emerald-400'
                                  : miEquipo === 2
                                  ? 'bg-rose-400'
                                  : 'bg-slate-500'
                              }`}
                            />
                            {miEquipo === 1
                              ? 'Radiant'
                              : miEquipo === 2
                              ? 'Dire'
                              : 'Sin asignar'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {enCurso ? (
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-400 ring-1 ring-inset ring-white/10">
                            En curso
                          </span>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                              gano
                                ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-300 ring-rose-500/30'
                            }`}
                          >
                            {gano ? 'Ganaste' : 'Perdiste'}
                          </span>
                        )}
                        <span
                          className={`font-display text-lg font-bold tabular-nums ${
                            enCurso ? 'text-slate-400' : gano ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {enCurso
                            ? '—'
                            : `${gano ? '+' : '-'}S/ ${(Math.abs(monto) / 100).toFixed(2)}`}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </PanelTab>
          )}

          {pestaña === 'movimientos' && (
            <PanelTab
              id="panel-movimientos"
              titulo="Recargas y retiros"
              descripcion="Solicitudes enviadas desde tu cuenta."
              cargando={cargandoTab && movimientosSolicitudes.length === 0}
              vacio={movimientosSolicitudes.length === 0}
              vacioTexto="No tienes recargas ni retiros todavía."
              vacioAccion={{ href: '/recargar', label: 'Recargar saldo' }}
            >
              <div className="space-y-3">
                {movimientosSolicitudes.map((m) => (
                  <article
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          m.tipo === 'Recarga'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                        aria-hidden="true"
                      >
                        {m.tipo === 'Recarga' ? '↓' : '↑'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{m.tipo}</p>
                        <p className="truncate text-xs text-slate-400">
                          {m.detalle} · {new Date(m.fecha).toLocaleDateString('es-PE')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <EstadoPill estado={m.estado} />
                      <span
                        className={`font-display text-lg font-bold tabular-nums ${
                          m.monto >= 0 ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {m.monto >= 0 ? '+' : '-'}S/ {(Math.abs(m.monto) / 100).toFixed(2)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </PanelTab>
          )}

          {pestaña === 'billetera' && (
            <PanelTab
              id="panel-billetera"
              titulo="Movimientos de billetera"
              descripcion="Ajustes, premios y pérdidas de tus partidas."
              cargando={cargandoTab && movimientosBilletera.length === 0}
              vacio={movimientosBilletera.length === 0}
              vacioTexto="No tienes movimientos de billetera."
              vacioAccion={{ href: '/salas', label: 'Entrar a una sala' }}
            >
              <div className="space-y-3">
                {movimientosBilletera.map((m) => (
                  <article
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          m.monto >= 0
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                        aria-hidden="true"
                      >
                        {m.monto >= 0 ? '↓' : '↑'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold capitalize text-white">
                          {m.tipo.replace(/_/g, ' ')}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {m.detalle} · {new Date(m.fecha).toLocaleDateString('es-PE')}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-display text-lg font-bold tabular-nums ${
                        m.monto >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {m.monto >= 0 ? '+' : '-'}S/ {(Math.abs(m.monto) / 100).toFixed(2)}
                    </span>
                  </article>
                ))}
              </div>
            </PanelTab>
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
