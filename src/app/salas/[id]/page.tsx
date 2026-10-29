'use client';

import { premioPorGanador } from '@/lib/importesSala';

import { Columna } from '@/components/salas/ColumnaEquipo';
import { IconoDire, IconoEspera, IconoRadiant } from '@/components/salas/IconosEquipo';
import { CabeceraSala, LobbySala, RolesSala } from '@/components/salas/PanelesSala';
import { TableroPicks } from '@/components/salas/TableroPicks';

import { useAuth } from '@/components/AuthProvider';
import ChatPanel from '@/components/ChatPanel';
import ConfirmDialog from '@/components/ConfirmDialog';
import Navbar from '@/components/Navbar';
import VivoMarcador from '@/components/VivoMarcador';
import { intentarCierreAutomatico } from '@/lib/dotaAutoClose';
import { supabase } from '@/lib/supabase';
import type { Lobby, Participante, RolDota, Sala } from '@/lib/types';
import { useArenaBody } from '@/lib/useArenaBody';
import { useRefrescoSala, type DatosSala } from '@/lib/useRefrescoSala';
import type { JugadorVivo } from '@/lib/vivo';
import { duracionDesdeInicio } from '@/lib/vivo';
import { partidaVivaMock } from '@/lib/vivoMock';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * ¿El error dice que la RPC no existe en Supabase? (SQL aún sin aplicar).
 * PostgREST responde PGRST202; Postgres, 42883.
 */
function existeLaRpc(error: { code?: string; message: string }) {
  return (
    error.code !== 'PGRST202' &&
    error.code !== '42883' &&
    !/could not find the function|schema cache/i.test(error.message)
  );
}

function SalaContenido() {
  useArenaBody();
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
  const [procesandoPicks, setProcesandoPicks] = useState(false);
  const [segundosTurno, setSegundosTurno] = useState<number | null>(null);
  const [rolesSala, setRolesSala] = useState<RolDota[]>([]);
  const [guardandoRoles, setGuardandoRoles] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [confirmandoListo, setConfirmandoListo] = useState(false);
  const [segundosSalida, setSegundosSalida] = useState(5);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const eraParticipante = useRef(false);
  const autoPickEnviado = useRef(false);
  const cierreAutoEnviado = useRef(false);
  const guardadoRolesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rolesSaveSeq = useRef(0);

  const miPerfil = user
    ? (participantes.find((p) => p.user_id === user.id)?.profiles ?? null)
    : null;
  const rolesGuardadosKey = (miPerfil?.roles_preferidos ?? []).join(',');

  const usuarioId = user?.id;
  const contextoParticipacion = useRef('');
  const aplicarSala = useCallback((datos: DatosSala) => {
    if (!usuarioId) return;
    const contexto = `${salaId}:${usuarioId}`;
    if (contextoParticipacion.current !== contexto) {
      contextoParticipacion.current = contexto;
      eraParticipante.current = false;
    }
    if (datos.sala) setSala(datos.sala);
    if (datos.participantes) {
      const parts = datos.participantes;
      setParticipantes(parts);
      const esPart = parts.some((p) => p.user_id === usuarioId);
      if (eraParticipante.current && !esPart) {
        eraParticipante.current = false;
        window.dispatchEvent(new Event('saldo:refresh'));
        router.push('/');
        return;
      }
      eraParticipante.current = esPart;
      setEsParticipante(esPart);
      setMiEquipo(parts.find((p) => p.user_id === usuarioId)?.equipo ?? null);
    }
    if (datos.lobby !== undefined) setLobby(datos.lobby);
    setLoading(false);
  }, [salaId, usuarioId, router]);
  const cargarSala = useRefrescoSala(salaId, usuarioId, aplicarSala);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (usuarioId) {
      supabase.rpc('es_admin').then(({ data }: { data: boolean | null }) => {
        setIsAdmin(data === true);
      });
    }
  }, [usuarioId]);

  // Cuenta regresiva del turno de picks y auto-pick a los 60 s
  useEffect(() => {
    const estado = sala?.picks_estado ?? 'inactivo';
    const expira = sala?.pick_turno_expira_at;

    if (!salaId || estado !== 'en_curso' || !expira) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpieza del contador
      setSegundosTurno(null);
      return;
    }

    autoPickEnviado.current = false;
    const expiraMs = new Date(expira).getTime();

    const actualizar = () => {
      const restante = Math.max(0, Math.ceil((expiraMs - Date.now()) / 1000));
      setSegundosTurno(restante);

      if (restante === 0 && !autoPickEnviado.current) {
        autoPickEnviado.current = true;
        supabase
          .rpc('auto_pickear_si_vencido', { p_sala: salaId, p_forzar: false })
          .then(({ error: rpcError }) => {
            if (rpcError) autoPickEnviado.current = false;
            else cargarSala();
          });
      }
    };

    actualizar();
    const interval = setInterval(actualizar, 1000);
    return () => clearInterval(interval);
  }, [
    salaId,
    sala?.picks_estado,
    sala?.pick_turno_user_id,
    sala?.pick_turno_expira_at,
    cargarSala,
  ]);

  // Cierre automático: cualquier jugador con la sala abierta puede disparar la detección.
  useEffect(() => {
    if (!salaId || sala?.estado !== 'en_juego') return;

    cierreAutoEnviado.current = false;

    const revisar = async () => {
      if (cierreAutoEnviado.current) return;

      const resultado = await intentarCierreAutomatico(salaId);
      if (!resultado || cierreAutoEnviado.current) return;

      if (resultado.cerrada) {
        cierreAutoEnviado.current = true;
        setSuccess('Partida finalizada automáticamente. Revisa el resultado en tu historial.');
        void cargarSala();
      }
    };

    const inicial = setTimeout(() => {
      void revisar();
    }, 12000);
    const intervalo = setInterval(() => {
      void revisar();
    }, 90000);

    return () => {
      clearTimeout(inicial);
      clearInterval(intervalo);
    };
  }, [salaId, sala?.estado, cargarSala]);

  // Al terminar o cancelarse la sala, nadie puede quedarse dentro: se oculta
  // de los listados y volvemos al inicio automáticamente.
  const estadoSalaActual = sala?.estado;

  useEffect(() => {
    if (estadoSalaActual !== 'terminada' && estadoSalaActual !== 'cancelada') {
      return;
    }

    window.dispatchEvent(new Event('saldo:refresh'));

    const intervalo = setInterval(() => {
      setSegundosSalida((restante) => Math.max(0, restante - 1));
    }, 1000);
    const salida = setTimeout(() => {
      router.replace('/');
    }, 5000);

    return () => {
      clearInterval(intervalo);
      clearTimeout(salida);
    };
  }, [estadoSalaActual, router]);

  // Mantiene la selección local sincronizada con los roles guardados.
  useEffect(() => {
    const roles = rolesGuardadosKey ? (rolesGuardadosKey.split(',') as RolDota[]) : [];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza roles guardados
    setRolesSala(roles);
  }, [rolesGuardadosKey]);

  // Limpia el guardado pendiente si se sale de la sala.
  useEffect(() => {
    return () => {
      if (guardadoRolesTimeout.current) clearTimeout(guardadoRolesTimeout.current);
    };
  }, []);

  async function unirseASala() {
    if (!sala || joining) return;
    setError(null);
    setSuccess(null);
    setJoining(true);

    const { error: rpcError } = await supabase.rpc('unirse_a_sala_con_importes', {
      p_sala: salaId,
      p_cuota_esperada: sala.cuota,
      p_premio_esperado: premioPorGanador(sala),
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
        'Debes vincular tu cuenta de Steam primero': 'Vincula tu cuenta de Steam en tu perfil para poder jugar',
        'Completa tu MMR': 'Completa tu MMR en Mi perfil antes de unirte a una sala',
      };
      const traducido = Object.entries(errores).find(([clave]) =>
        rpcError.message.includes(clave)
      )?.[1];
      setError(traducido ?? rpcError.message);
      if (rpcError.message.includes('Los importes de la sala cambiaron')) await cargarSala();
    } else {
      window.dispatchEvent(new Event('saldo:refresh'));
      cargarSala();
    }
    setJoining(false);
  }

  async function salirDeSala() {
    setError(null);
    setSuccess(null);
    eraParticipante.current = false;
    setSaliendo(true);

    // En una 5v5 llena, abandonar cuesta una multa: la RPC hace la salida
    // normal (reembolso) y cobra la multa en la misma transacción.
    const conMulta = sala?.cupo === 10 && sala?.estado === 'llena';

    let { error: rpcError } = conMulta
      ? await supabase.rpc('salir_de_sala_con_multa', { p_sala: salaId })
      : await supabase.rpc('salir_de_sala', { p_sala: salaId });

    // Si la RPC de la multa todavía no está aplicada en Supabase, se sale con
    // la función de siempre para no dejar al jugador atrapado en la sala.
    if (conMulta && rpcError && !existeLaRpc(rpcError)) {
      ({ error: rpcError } = await supabase.rpc('salir_de_sala', { p_sala: salaId }));
    }

    if (rpcError) {
      setError(rpcError.message);
    } else {
      window.dispatchEvent(new Event('saldo:refresh'));
      router.push('/');
      window.dispatchEvent(new Event('salas:refresh'));
    }

    setSaliendo(false);
  }

  async function confirmarListo() {
    setError(null);
    setSuccess(null);
    setConfirmandoListo(true);

    const { error: rpcError } = await supabase.rpc('confirmar_verificacion', {
      p_sala: salaId,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess('Listo. Ahora esperamos a los demás jugadores.');
      window.dispatchEvent(new Event('verificacion:refresh'));
      cargarSala();
    }

    setConfirmandoListo(false);
  }

  async function cambiarEquipo(equipo: number | null) {
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
      cargarSala();
    }
    setCambiandoEquipo(false);
  }

  function alternarRolSala(rol: RolDota) {
    const next = rolesSala.includes(rol)
      ? rolesSala.filter((r) => r !== rol)
      : rolesSala.length >= 3
        ? rolesSala
        : [...rolesSala, rol];

    if (next === rolesSala) return;

    const version = ++rolesSaveSeq.current;
    setRolesSala(next);
    setGuardandoRoles(true);

    if (guardadoRolesTimeout.current) clearTimeout(guardadoRolesTimeout.current);
    guardadoRolesTimeout.current = setTimeout(() => {
      guardarRolesSala(next, version);
    }, 300);
  }

  async function guardarRolesSala(next: RolDota[], version: number) {
    if (!user || version !== rolesSaveSeq.current) return;

    setGuardandoRoles(true);
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc('guardar_roles_preferidos', {
      p_roles: next,
    });

    if (version !== rolesSaveSeq.current) return;

    if (rpcError) {
      setError('No se pudieron guardar tus roles: ' + rpcError.message);
      setRolesSala(rolesGuardadosKey ? (rolesGuardadosKey.split(',') as RolDota[]) : []);
      cargarSala();
    } else {
      setParticipantes((prev) =>
        prev.map((p) =>
          p.user_id === user.id
            ? {
                ...p,
                profiles: p.profiles
                  ? { ...p.profiles, roles_preferidos: next }
                  : p.profiles,
              }
            : p
        )
      );
    }

    setGuardandoRoles(false);
  }

  async function elegirRadiantOLastPick(opcion: 'radiant' | 'lastpick') {
    setError(null);
    setSuccess(null);
    setProcesandoPicks(true);

    const { error: rpcError } = await supabase.rpc('elegir_radiant_o_lastpick', {
      p_sala: salaId,
      p_opcion: opcion,
    });

    if (rpcError) {
      const faltaSql =
        rpcError.code === 'PGRST202' ||
        rpcError.code === '42883' ||
        /could not find the function|schema cache/i.test(rpcError.message);
      setError(
        faltaSql
          ? 'Falta aplicar docs/sql/2026-10-21-eleccion-radiant-lastpick.sql en Supabase para elegir Radiant o LastPick.'
          : rpcError.message
      );
    } else {
      setSuccess(
        opcion === 'radiant'
          ? 'Elegiste Radiant: pickeas primero.'
          : 'Elegiste LastPick: juegas Dire y pickeas segundo.'
      );
      cargarSala();
    }
    setProcesandoPicks(false);
  }

  async function elegirPreferencia(equipo: number | null) {
    setError(null);

    const { error: rpcError } = await supabase.rpc('elegir_preferencia_equipo', {
      p_sala: salaId,
      p_equipo: equipo,
    });

    if (rpcError) {
      setError('No se pudo guardar tu preferencia: ' + rpcError.message);
      return;
    }

    cargarSala();
  }

  async function elegirLado(equipo: number) {
    setError(null);
    setSuccess(null);
    setProcesandoPicks(true);

    const { error: rpcError } = await supabase.rpc('elegir_lado', {
      p_sala: salaId,
      p_equipo: equipo,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      cargarSala();
    }
    setProcesandoPicks(false);
  }

  async function pickearJugador(userIdObjetivo: string) {
    setError(null);
    setSuccess(null);
    setProcesandoPicks(true);

    const { error: rpcError } = await supabase.rpc('pickear_jugador', {
      p_sala: salaId,
      p_user: userIdObjetivo,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      cargarSala();
    }
    setProcesandoPicks(false);
  }

  async function copiar(texto: string, campo: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(campo);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setError('No se pudo copiar. Cópialo manualmente.');
    }
  }

  async function compartirSala() {
    if (!sala) return;

    const url = `${window.location.origin}/salas/${sala.id}`;
    const texto = `Sala "${sala.nombre}" en KódigoDota`;

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: sala.nombre, text: texto, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiado('sala');
        setTimeout(() => setCopiado(null), 2000);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('No se pudo compartir el enlace');
      }
    }
  }

  // Partida en vivo de la sala (MOCK hasta que llegue el league_id de Valve).
  const partidaViva = useMemo(
    () =>
      sala?.estado === 'en_juego'
        ? partidaVivaMock(
            participantes,
            sala.iniciada_at ? duracionDesdeInicio(sala.iniciada_at) : undefined
          )
        : null,
    [sala, participantes]
  );
  const vivoPorNick = useMemo(() => {
    const mapa = new Map<string, JugadorVivo>();
    if (!partidaViva) return mapa;
    for (const jugador of [...partidaViva.radiant.jugadores, ...partidaViva.dire.jugadores]) {
      mapa.set(jugador.nick, jugador);
    }
    return mapa;
  }, [partidaViva]);

  if (authLoading || loading) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <p>Cargando sala...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!sala) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <div className="text-center">
          <p className="text-rose-300">La sala no existe</p>
          <Link href="/salas" className="mt-4 inline-block text-prism-300 hover:underline">
            Volver a salas
          </Link>
        </div>
      </div>
    );
  }

  if (sala.estado === 'terminada' || sala.estado === 'cancelada') {
    const terminada = sala.estado === 'terminada';

    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] px-4 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 text-center shadow-arena-soft">
          <div
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
              terminada
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            {terminada ? '✓' : '!'}
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-white">
            {terminada ? 'Partida finalizada' : 'Sala cancelada'}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {terminada
              ? 'Los premios ya fueron repartidos. Esta sala se cerró y ya no aparece en la lista.'
              : 'La sala fue cancelada y se reembolsó a los participantes.'}
          </p>
          <p className="mt-4 text-sm text-slate-400">
            Volviendo al inicio en {segundosSalida} s…
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => router.replace('/')}
              className="rounded-lg bg-prism-500 px-4 py-2 text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400"
            >
              Ir al inicio ahora
            </button>
            {terminada && (
              <Link
                href="/salas/historial"
                className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Ver historial
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const userId = user.id;
  const limiteEquipo = Math.max(1, Math.floor(sala.cupo / 2));
  const espera = participantes.filter((p) => p.equipo === null);
  const radiant = participantes.filter((p) => p.equipo === 1);
  const dire = participantes.filter((p) => p.equipo === 2);

  // Multa por abandonar una sala 5v5 llena (10/10).
  const multaAbandono = sala.cupo === 10 && sala.estado === 'llena' ? 200 : 0;

  const pozo = sala.cuota * sala.cupo;
  const premio = premioPorGanador(sala);

  const picksEstado = sala.picks_estado ?? 'inactivo';
  const enFasePicks = picksEstado === 'eleccion' || picksEstado === 'en_curso';
  const puedeMoverse =
    esParticipante &&
    picksEstado === 'inactivo' &&
    // En 1v1 los equipos los decide la moneda, no los jugadores.
    sala.cupo !== 2 &&
    (sala.estado === 'abierta' || sala.estado === 'llena');
  const puedeUnirse = !esParticipante && sala.estado === 'abierta' && participantes.length < sala.cupo;
  const puedeEditarRoles =
    esParticipante &&
    picksEstado === 'inactivo' &&
    (sala.estado === 'abierta' || sala.estado === 'llena');

  const verificacionEstado = sala.verificacion_estado ?? 'inactiva';
  const listos = participantes.filter((p) => p.verificado_at).length;
  const totalEnSala = participantes.length;
  const yoVerificado = Boolean(
    participantes.find((p) => p.user_id === user?.id)?.verificado_at
  );

  const columnaProps = {
    esParticipante,
    miEquipo,
    userId,
    puedeMoverse,
    cambiandoEquipo,
    vivoPorNick,
    onCambiarEquipo: cambiarEquipo,
  };

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo={sala.nombre} />

      <main className="mx-auto max-w-[1800px] px-4 py-4">
        {(error || success) && (
          <div className="mb-3 space-y-2">
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {success}
              </div>
            )}
          </div>
        )}

        <div
          className={`grid gap-4 ${
            esParticipante ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : ''
          }`}
        >
          <div className="space-y-3">
        {/* Cabecera de la sala */}
        <CabeceraSala
          sala={sala}
          participantes={participantes}
          pozo={pozo}
          premio={premio}
          compartirSala={compartirSala}
          copiado={copiado}
        />

        {/* Acciones de entrada */}
        {puedeUnirse && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-emerald-200">
                Hay espacio. Al unirte entras a la <strong>lista de espera</strong> y luego eliges
                equipo.
              </p>
              <button
                onClick={unirseASala}
                disabled={joining}
                className="rounded-lg bg-emerald-500 px-5 py-2 font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {joining ? 'Uniéndome...' : 'Unirme a la sala'}
              </button>
            </div>
          </div>
        )}

        {!esParticipante && sala.estado === 'llena' && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            La sala está llena. Espera a que el admin inicie la partida.
          </div>
        )}

        {/* Marcador en vivo de la partida */}
        {partidaViva && (
          <div className="mb-3 space-y-2">
            <VivoMarcador partida={partidaViva} />
            <Link
              href={`/salas/${sala.id}/partida`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/15"
            >
              Ver datos de la partida (K/D/A, ítems, oro y mapa) →
            </Link>
          </div>
        )}

        {/* Verificación "Estoy listo" */}
        {verificacionEstado !== 'inactiva' && (
          <div
            className={`rounded-xl border p-3 ${
              verificacionEstado === 'completa'
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : 'border-amber-500/30 bg-amber-500/10'
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p
                  className={`text-sm font-semibold ${
                    verificacionEstado === 'completa' ? 'text-emerald-200' : 'text-amber-200'
                  }`}
                >
                  {verificacionEstado === 'completa'
                    ? 'Todos los jugadores confirmaron que están listos.'
                    : 'El admin pide confirmar que estás listo para la partida.'}
                </p>
                <p className="mt-0.5 text-xs text-slate-300">
                  {listos}/{totalEnSala} listos
                  {verificacionEstado === 'pendiente' && esParticipante && !yoVerificado
                    ? ' · pulsa el botón para avisar que estás listo'
                    : ''}
                  {verificacionEstado === 'pendiente' && yoVerificado
                    ? ' · ya confirmaste, esperando a los demás'
                    : ''}
                </p>
              </div>

              {verificacionEstado === 'pendiente' && esParticipante && !yoVerificado && (
                <button
                  onClick={confirmarListo}
                  disabled={confirmandoListo}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-400 disabled:opacity-50"
                >
                  {confirmandoListo ? 'Enviando...' : 'Estoy listo'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mis roles (solo informativo, se guarda automáticamente) */}
        {esParticipante && (
          <RolesSala
            rolesSala={rolesSala}
            alternarRolSala={alternarRolSala}
            puedeEditarRoles={puedeEditarRoles}
            guardandoRoles={guardandoRoles}
          />
        )}

        {/* Fase de picks o columnas */}
        {enFasePicks ? (
          <TableroPicks
            sala={sala}
            participantes={participantes}
            userId={userId}
            segundosTurno={segundosTurno}
            procesando={procesandoPicks}
            miPreferencia={
              participantes.find((p) => p.user_id === userId)?.preferencia_equipo ?? null
            }
            onPreferencia={elegirPreferencia}
            onElegirRadiantOLastPick={elegirRadiantOLastPick}
            onElegirLado={elegirLado}
            onPickear={pickearJugador}
          />
        ) : (
          <section>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h2 className="font-display text-base font-bold text-white">Jugadores en la sala</h2>
              {puedeMoverse && (
                <p className="text-xs text-slate-500">
                  Elige una columna para moverte. Cada equipo admite {limiteEquipo}.
                </p>
              )}
            </div>

            <div className="space-y-3">
              {(espera.length > 0 || participantes.length === 0) && (
                <Columna
                  {...columnaProps}
                  equipo={null}
                  titulo="Lista de espera"
                  descripcion="Jugadores sin equipo asignado"
                  jugadores={espera}
                  capacidad={sala.cupo}
                  horizontal
                  compacta
                  columnas={sala.cupo === 2
                    ? 'grid-cols-1 @min-[420px]:grid-cols-2'
                    : 'grid-cols-1 @min-[420px]:grid-cols-2 @min-[660px]:grid-cols-3 @min-[960px]:grid-cols-5'}
                  tono="neutral"
                  icono={<IconoEspera />}
                />
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <Columna
                  {...columnaProps}
                  equipo={1}
                  titulo="Radiant"
                  descripcion="Equipo verde"
                  jugadores={radiant}
                  capacidad={limiteEquipo}
                  compactarVacios={espera.length > 0 || participantes.length === 0}
                  tono="radiant"
                  icono={<IconoRadiant />}
                />
                <Columna
                  {...columnaProps}
                  equipo={2}
                  titulo="Dire"
                  descripcion="Equipo rojo"
                  jugadores={dire}
                  capacidad={limiteEquipo}
                  compactarVacios={espera.length > 0 || participantes.length === 0}
                  tono="dire"
                  icono={<IconoDire />}
                />
              </div>
            </div>
          </section>
        )}

        {/* Lobby */}
        {lobby &&
          (esParticipante || isAdmin) &&
          (sala.estado === 'en_juego' || sala.estado === 'terminada') && (
          <LobbySala
            sala={sala}
            lobby={lobby}
            copiar={copiar}
            copiado={copiado}
          />
        )}

        {esParticipante && sala.estado === 'en_juego' && !lobby && (
          <div className="mt-4 rounded-xl border border-prism-500/30 bg-prism-500/10 p-4 text-sm text-prism-200">
            La partida está en juego. El admin publicará los datos del lobby en un momento.
          </div>
        )}

        {esParticipante && picksEstado === 'inactivo' && (sala.estado === 'abierta' || sala.estado === 'llena') && (
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <button
              onClick={() => (multaAbandono > 0 ? setConfirmarSalida(true) : salirDeSala())}
              disabled={saliendo}
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-6 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-60"
            >
              {saliendo
                ? 'Saliendo...'
                : multaAbandono > 0
                  ? `Salir de la sala (multa de S/ ${(multaAbandono / 100).toFixed(2)})`
                  : `Salir de la sala y recuperar S/ ${(sala.cuota / 100).toFixed(2)}`}
            </button>
            {multaAbandono > 0 && (
              <p className="max-w-sm text-center text-[11px] leading-snug text-slate-500">
                La sala está llena: te devolvemos la cuota menos la multa de{' '}
                <span className="font-semibold text-rose-300">
                  S/ {(multaAbandono / 100).toFixed(2)}
                </span>{' '}
                por abandonar.
              </p>
            )}
          </div>
        )}

        <ConfirmDialog
          abierto={confirmarSalida}
          titulo="Abandonar la sala"
          mensaje={`La sala está llena (10/10). Si te sales ahora se te devuelve la cuota y se te cobra una multa de S/ ${(
            multaAbandono / 100
          ).toFixed(2)} por abandonar.`}
          confirmar="Sí, salir"
          cancelar="Me quedo"
          peligro
          procesando={saliendo}
          onConfirmar={salirDeSala}
          onCancelar={() => setConfirmarSalida(false)}
        />
          </div>

          {esParticipante && (
            <aside className="h-fit lg:sticky lg:top-20">
              <ChatPanel
                salaId={sala.id}
                titulo="Chat de la sala"
                descripcion="Solo jugadores dentro de esta sala"
                altura="h-[420px] lg:h-[calc(100vh-18rem)] min-h-[320px]"
              />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SalaDetallePage() {
  return (
    <Suspense
      fallback={
        <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
          <p>Cargando sala...</p>
        </div>
      }
    >
      <SalaContenido />
    </Suspense>
  );
}
