'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import ChatPanel from '@/components/ChatPanel';
import Avatar from '@/components/Avatar';
import MedallaMmr from '@/components/MedallaMmr';
import PreferenciaLado from '@/components/PreferenciaLado';
import ResumenJugador from '@/components/ResumenJugador';
import { intentarCierreAutomatico } from '@/lib/dotaAutoClose';
import { reproducirSonido } from '@/lib/sonidos';
import { formatearMmr, promedioMmr, resumenRolesConIconos } from '@/lib/balance';
import type { DotaMatch, Lobby, Participante, Sala } from '@/lib/types';

type Confirmacion =
  | { tipo: 'expulsar'; userId: string; nick?: string }
  | { tipo: 'cancelar' }
  | { tipo: 'terminar' }
  | { tipo: 'cancelar_picks' };

function FilaJugador({
  p,
  actual,
  estadoSala,
  mostrarMover,
  mostrarPreferencia,
  onMover,
  onExpulsar,
}: {
  p: Participante;
  actual: number | null | undefined;
  estadoSala: string;
  mostrarMover: boolean;
  mostrarPreferencia: boolean;
  onMover: (userId: string, equipo: number | null) => void;
  onExpulsar: (p: Participante) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-white/10 px-2 py-1">
      <Link
        href={`/jugadores/${p.user_id}`}
        title={`Ver perfil de ${p.profiles?.nick ?? 'Usuario'}`}
        className="flex min-w-0 items-center gap-2 transition hover:bg-white/5"
      >
        <Avatar nick={p.profiles?.nick} src={p.profiles?.steam_avatar_url} size="sm" />
        <div className="relative min-w-0 pr-4">
          {p.verificado_at && (
            <span
              title="Listo para la partida"
              aria-label="Listo para la partida"
              className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-[5px] bg-emerald-500/20 text-[10px] font-bold leading-none text-emerald-300 ring-1 ring-inset ring-emerald-400/40"
            >
              ✓
            </span>
          )}
          <span className="block truncate text-xs font-medium text-slate-100">
            {p.es_capitan ? '⭐ ' : ''}
            {p.profiles?.nick ?? 'Usuario'}
          </span>
          <span className="block truncate text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1 font-bold text-prism-300/90">
              <MedallaMmr
                mmr={p.profiles?.mmr}
                size="xs"
                mostrarEstrellas={false}
                mostrarNombre={false}
                className="shrink-0"
              />
              {p.profiles?.mmr != null ? `MMR ${formatearMmr(p.profiles.mmr)}` : 'Sin MMR'}
            </span>
            <span className="text-slate-500">
              {' · '}
              {resumenRolesConIconos(p.profiles?.roles_preferidos)}
            </span>
          </span>
          {mostrarPreferencia && <PreferenciaLado equipo={p.preferencia_equipo} className="mt-1" />}
          {/* El resumen de Dota 2 solo aparece en la lista de espera. */}
          {actual === null && (
            <ResumenJugador key={p.user_id} userId={p.user_id} compacto className="mt-1" />
          )}
        </div>
      </Link>
      <div className="flex shrink-0 flex-wrap justify-end gap-1">
        {mostrarMover && estadoSala !== 'en_juego' && actual !== null && (
          <button
            onClick={() => onMover(p.user_id, null)}
            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/5"
            title="Mover a lista de espera"
          >
            Espera
          </button>
        )}
        {mostrarMover && estadoSala !== 'en_juego' && actual !== 1 && (
          <button
            onClick={() => onMover(p.user_id, 1)}
            className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-200 ring-1 ring-inset ring-emerald-400/20 transition hover:bg-emerald-500/20"
          >
            Radiant
          </button>
        )}
        {mostrarMover && estadoSala !== 'en_juego' && actual !== 2 && (
          <button
            onClick={() => onMover(p.user_id, 2)}
            className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-medium text-rose-200 ring-1 ring-inset ring-rose-400/20 transition hover:bg-rose-500/20"
          >
            Dire
          </button>
        )}
        {estadoSala !== 'en_juego' && (
          <button
            onClick={() => onExpulsar(p)}
            className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-medium text-rose-300 ring-1 ring-inset ring-rose-500/25 transition hover:bg-rose-500/20"
            title="Sacar de la sala y devolver la cuota"
          >
            Sacar
          </button>
        )}
      </div>
    </div>
  );
}

function Slots({
  jugadores,
  capacidad,
  equipos,
  estadoSala,
  mostrarMover,
  mostrarPreferencia,
  onMover,
  onExpulsar,
}: {
  jugadores: Participante[];
  capacidad: number;
  equipos: Record<string, number | null>;
  estadoSala: string;
  mostrarMover: boolean;
  mostrarPreferencia: boolean;
  onMover: (userId: string, equipo: number | null) => void;
  onExpulsar: (p: Participante) => void;
}) {
  return (
    <>
      {Array.from({ length: capacidad }).map((_, i) => {
        const p = jugadores[i];

        return p ? (
          <FilaJugador
            key={p.user_id}
            p={p}
            actual={equipos[p.user_id]}
            estadoSala={estadoSala}
            mostrarMover={mostrarMover}
            mostrarPreferencia={mostrarPreferencia}
            onMover={onMover}
            onExpulsar={onExpulsar}
          />
        ) : (
          <div
            key={`libre-${i}`}
            className="flex h-[36px] items-center justify-center rounded-md border border-dashed border-white/10 text-[11px] text-slate-500"
          >
            Libre
          </div>
        );
      })}
    </>
  );
}

function AdminSalaContenido() {
  useArenaBody();
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
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [lobbyNombre, setLobbyNombre] = useState('');
  const [lobbyClave, setLobbyClave] = useState('');
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [procesandoConfirmacion, setProcesandoConfirmacion] = useState(false);
  const [dotaMatchId, setDotaMatchId] = useState('');
  const [equipoGanador, setEquipoGanador] = useState('');
  const [terminando, setTerminando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [datosPartida, setDatosPartida] = useState<DotaMatch | null>(null);
  const [capitan1, setCapitan1] = useState('');
  const [capitan2, setCapitan2] = useState('');
  const [procesandoPicks, setProcesandoPicks] = useState(false);
  const [autoCierre, setAutoCierre] = useState(true);
  const [detectando, setDetectando] = useState(false);
  const [estadoDeteccion, setEstadoDeteccion] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreSala, setNombreSala] = useState('');
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [destacando, setDestacando] = useState(false);
  const [pidiendoVerificacion, setPidiendoVerificacion] = useState(false);
  const cierreAutoEnviado = useRef(false);

  const cargarSala = useCallback(async () => {
    if (!salaId || !user) return;

    const { data: salaData } = await supabase
      .from('salas')
      .select('*')
      .eq('id', salaId)
      .single();

    if (salaData) setSala(salaData as unknown as Sala);

    const { data: partData } = await supabase
      .from('participantes_sala')
      .select(
        'user_id, equipo, es_capitan, pick_orden, verificado_at, profiles(nick, steam_avatar_url, mmr, roles_preferidos)'
      )
      .eq('sala_id', salaId)
      .order('created_at', { ascending: true });

    // La preferencia de lado es un dato opcional: si el SQL todavía no está
    // aplicado, el panel admin debe funcionar igual.
    const { data: prefData } = await supabase
      .from('participantes_sala')
      .select('user_id, preferencia_equipo')
      .eq('sala_id', salaId);

    const preferencias = new Map(
      (prefData ?? []).map((p) => [p.user_id, (p as { preferencia_equipo?: number | null }).preferencia_equipo ?? null])
    );

    if (partData) {
      const parts = (partData as unknown as Participante[]).map((p) => ({
        ...p,
        preferencia_equipo: preferencias.get(p.user_id) ?? null,
      }));
      setParticipantes(parts);
      const eq: Record<string, number | null> = {};
      parts.forEach((p) => {
        eq[p.user_id] = p.equipo;
      });
      setEquipos(eq);
    }

    const { data: lobbyData } = await supabase
      .from('lobbies')
      .select('*')
      .eq('sala_id', salaId)
      .maybeSingle();

    if (lobbyData) {
      const datosLobby = lobbyData as unknown as Lobby;
      setLobby(datosLobby);
      setLobbyNombre((prev) => prev || datosLobby.nombre);
      setLobbyClave((prev) => prev || datosLobby.clave);
    }

    setLoading(false);
  }, [salaId, user]);

  const revisarCierreAuto = useCallback(async () => {
    if (!salaId || cierreAutoEnviado.current) return;

    setDetectando(true);

    const resultado = await intentarCierreAutomatico(salaId);

    setDetectando(false);

    if (!resultado) {
      setEstadoDeteccion('No se pudo consultar la detección automática.');
      return;
    }

    if (resultado.cerrada) {
      cierreAutoEnviado.current = true;
      setEstadoDeteccion('Partida detectada y cerrada automáticamente.');
      setSuccess('Partida terminada automáticamente. Premios repartidos a los ganadores.');
      void cargarSala();
      return;
    }

    setEstadoDeteccion(resultado.reason ?? 'Esperando el fin de la partida…');
  }, [salaId, cargarSala]);

  // Detección automática del final de la partida mientras la sala está en juego.
  useEffect(() => {
    if (!salaId || sala?.estado !== 'en_juego' || !autoCierre) return;

    cierreAutoEnviado.current = false;

    const inicial = setTimeout(() => {
      void revisarCierreAuto();
    }, 8000);
    const intervalo = setInterval(() => {
      void revisarCierreAuto();
    }, 60000);

    return () => {
      clearTimeout(inicial);
      clearInterval(intervalo);
    };
  }, [salaId, sala?.estado, autoCierre, revisarCierreAuto]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    if (user && salaId) cargarSala();
  }, [user, salaId, cargarSala]);

  // Cambios en vivo mientras el admin gestiona la sala
  useEffect(() => {
    if (!salaId || !user) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const refrescar = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cargarSala(), 250);
    };

    const channel = supabase
      .channel(`sala-admin-${salaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participantes_sala',
          filter: `sala_id=eq.${salaId}`,
        },
        refrescar
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participantes_sala',
          filter: `sala_id=eq.${salaId}`,
        },
        refrescar
      )
      .on(
        // Sin filtro: los DELETE no siempre incluyen sala_id
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'participantes_sala' },
        refrescar
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'salas', filter: `id=eq.${salaId}` },
        refrescar
      )
      .on(
        // Roles/MMR de los jugadores: se ven al instante.
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        refrescar
      )
      .subscribe();

    const interval = setInterval(() => cargarSala(), 5000);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [salaId, user, cargarSala]);

  // El fin de partida se avisa por notificación (suena para todos los jugadores
  // de la sala, estén o no dentro de ella), así que aquí no se duplica el tono.

  // Auto-pick si el turno venció (por si el capitán no está conectado)
  useEffect(() => {
    if (!salaId) return;
    const estado = sala?.picks_estado;
    const expira = sala?.pick_turno_expira_at;
    if (estado !== 'en_curso' || !expira) return;

    const restante = new Date(expira).getTime() - Date.now();
    const disparar = () => {
      supabase
        .rpc('auto_pickear_si_vencido', { p_sala: salaId, p_forzar: false })
        .then(() => cargarSala());
    };

    if (restante <= 0) {
      disparar();
      const retry = setInterval(disparar, 3000);
      return () => clearInterval(retry);
    }

    const timer = setTimeout(disparar, restante + 250);
    return () => clearTimeout(timer);
  }, [salaId, sala?.picks_estado, sala?.pick_turno_user_id, sala?.pick_turno_expira_at, cargarSala]);

  async function moverJugador(userId: string, equipo: number | null) {
    setError(null);
    setSuccess(null);
    setEquipos((prev) => ({ ...prev, [userId]: equipo }));

    const { error: rpcError } = await supabase.rpc('asignar_equipo', {
      p_sala: salaId,
      p_user: userId,
      p_equipo: equipo,
    });

    if (rpcError) {
      setError('No se pudo mover: ' + rpcError.message);
    }
    cargarSala();
  }

  async function guardarNombreSala() {
    if (!sala) return;

    const nuevo = nombreSala.trim();
    if (nuevo.length < 3) {
      setError('El nombre debe tener al menos 3 caracteres');
      return;
    }
    if (nuevo.length > 60) {
      setError('El nombre no puede superar los 60 caracteres');
      return;
    }
    if (nuevo === sala.nombre) {
      setEditandoNombre(false);
      return;
    }

    setError(null);
    setSuccess(null);
    setGuardandoNombre(true);

    const { error: rpcError } = await supabase.rpc('admin_renombrar_sala', {
      p_sala: salaId,
      p_nombre: nuevo,
    });

    if (rpcError) {
      const detalle = rpcError.message.includes('Could not find the function')
        ? 'falta ejecutar el SQL de admin_renombrar_sala en Supabase'
        : rpcError.message;
      setError('No se pudo cambiar el nombre: ' + detalle);
    } else {
      setSuccess('Nombre de la sala actualizado.');
      setEditandoNombre(false);
      await cargarSala();
    }

    setGuardandoNombre(false);
  }

  async function alternarDestacada() {
    if (!sala) return;

    setError(null);
    setSuccess(null);
    setDestacando(true);

    const { error: rpcError } = await supabase.rpc('admin_destacar_sala', {
      p_sala: salaId,
      p_destacar: !sala.destacada,
    });

    if (rpcError) {
      const detalle = rpcError.message.includes('Could not find the function')
        ? 'falta ejecutar el SQL de admin_destacar_sala en Supabase'
        : rpcError.message;
      setError('No se pudo actualizar la sala destacada: ' + detalle);
    } else {
      setSuccess(
        sala.destacada
          ? 'La sala ya no se muestra como destacada.'
          : 'Sala destacada en el landing.'
      );
      await cargarSala();
    }

    setDestacando(false);
  }

  async function iniciarPicks() {
    setError(null);
    setSuccess(null);

    if (!sala || sala.cupo !== 10) {
      setError('La fase de picks es solo para salas 5v5');
      return;
    }
    if (participantes.length !== 10) {
      setError(`Faltan jugadores: hay ${participantes.length} de 10`);
      return;
    }
    if (!capitan1 || !capitan2) {
      setError('Elige los dos capitanes');
      return;
    }
    if (capitan1 === capitan2) {
      setError('Los capitanes deben ser diferentes');
      return;
    }

    setProcesandoPicks(true);

    const { error: rpcError } = await supabase.rpc('iniciar_picks', {
      p_sala: salaId,
      p_capitan1: capitan1,
      p_capitan2: capitan2,
    });

    if (rpcError) {
      setError('No se pudo iniciar la fase de picks: ' + rpcError.message);
    } else {
      setSuccess('Moneda lanzada. Los capitanes deben elegir.');
      cargarSala();
    }
    setProcesandoPicks(false);
  }

  async function cancelarPicks() {
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc('cancelar_picks', {
      p_sala: salaId,
    });

    if (rpcError) {
      setError('No se pudo cancelar la fase de picks: ' + rpcError.message);
    } else {
      setSuccess('Fase de picks cancelada. Todos vuelven a la lista de espera.');
      cargarSala();
    }
  }

  async function forzarAutoPick() {
    setError(null);
    setSuccess(null);
    setProcesandoPicks(true);

    const { error: rpcError } = await supabase.rpc('auto_pickear_si_vencido', {
      p_sala: salaId,
      p_forzar: true,
    });

    if (rpcError) {
      setError('No se pudo hacer el auto-pick: ' + rpcError.message);
    } else {
      cargarSala();
    }
    setProcesandoPicks(false);
  }

  async function pedirVerificacion() {
    setError(null);
    setSuccess(null);
    setPidiendoVerificacion(true);

    const { error: rpcError } = await supabase.rpc('admin_pedir_verificacion', {
      p_sala: salaId,
    });

    if (rpcError) {
      setError('No se pudo pedir la verificación: ' + rpcError.message);
    } else {
      setSuccess('Verificación enviada. Los jugadores reciben una notificación y un aviso sonoro.');
      reproducirSonido('verificacion');
      cargarSala();
    }

    setPidiendoVerificacion(false);
  }

  async function cancelarVerificacion() {
    setError(null);
    setSuccess(null);
    setPidiendoVerificacion(true);

    const { error: rpcError } = await supabase.rpc('admin_cancelar_verificacion', {
      p_sala: salaId,
    });

    if (rpcError) {
      setError('No se pudo cancelar la verificación: ' + rpcError.message);
    } else {
      setSuccess('Verificación cancelada.');
      cargarSala();
    }

    setPidiendoVerificacion(false);
  }

  async function expulsarJugador(userId: string) {
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc('expulsar_de_sala', {
      p_sala: salaId,
      p_user: userId,
    });

    if (rpcError) {
      setError('No se pudo sacar al jugador: ' + rpcError.message);
    } else {
      setSuccess('Jugador sacado de la sala. Se le devolvió la cuota.');
      cargarSala();
    }
  }

  async function ponerEnJuego() {
    setError(null);
    setSuccess(null);

    if (sala?.picks_estado === 'eleccion' || sala?.picks_estado === 'en_curso') {
      setError('Termina la fase de picks antes de poner la partida en juego');
      return;
    }

    if (!lobbyNombre.trim()) {
      setError('Escribe el nombre del lobby');
      return;
    }
    if (!lobbyClave.trim()) {
      setError('Escribe la clave del lobby');
      return;
    }

    const total = participantes.length;
    const sinAsignar = participantes.filter((p) => !equipos[p.user_id]);
    const radiant = participantes.filter((p) => equipos[p.user_id] === 1).length;
    const dire = participantes.filter((p) => equipos[p.user_id] === 2).length;
    const mitad = Math.floor((sala?.cupo ?? 0) / 2);

    if (total !== sala?.cupo) {
      setError(`Faltan jugadores: hay ${total} de ${sala?.cupo}`);
      return;
    }
    if (sinAsignar.length > 0) {
      setError('Todos deben tener equipo: la lista de espera debe quedar vacía');
      return;
    }
    if (radiant !== mitad || dire !== mitad) {
      setError('Los equipos no están balanceados');
      return;
    }

    setSaving(true);

    const { error: lobbyError } = await supabase.rpc('definir_lobby', {
      p_sala: salaId,
      p_nombre: lobbyNombre.trim(),
      p_clave: lobbyClave.trim(),
    });

    setSaving(false);

    if (lobbyError) {
      setError('Error al poner en juego: ' + lobbyError.message);
    } else {
      setSuccess('Cambios guardados. La partida está en juego y los jugadores fueron avisados.');
      cargarSala();
    }
  }

  async function cancelarSala() {
    setError(null);
    setSuccess(null);

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Sesión expirada. Vuelve a iniciar sesión.');
        setVerificando(false);
        return;
      }

      const response = await fetch(`/api/dota/match?match_id=${dotaMatchId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
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

  /** Avisa a los jugadores de la sala que la partida terminó (suena el aviso). */
  async function avisarFinDePartida() {
    const { error: notifError } = await supabase.rpc('notificar_sala_terminada', {
      p_sala: salaId,
    });
    if (notifError) console.error('No se pudo avisar el fin de partida:', notifError.message);
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

    // Guardamos también duración y marcador cuando la partida fue verificada.
    // Si el SQL nuevo aún no está aplicado, caemos al cierre clásico.
    const { error: rpcError } = await supabase.rpc('cerrar_partida_con_detalle', {
      p_sala: salaId,
      p_dota_match_id: matchId,
      p_equipo_ganador: parseInt(equipoGanador),
      p_duracion: datosPartida?.duration ?? null,
      p_radiant_score: datosPartida?.radiant_score ?? null,
      p_dire_score: datosPartida?.dire_score ?? null,
      p_auto: false,
    });

    if (rpcError && /could not find the function|schema cache|does not exist/i.test(rpcError.message)) {
      const { error: fallbackError } = await supabase.rpc('cerrar_partida', {
        p_sala: salaId,
        p_dota_match_id: matchId,
        p_equipo_ganador: parseInt(equipoGanador),
      });

      setTerminando(false);

      if (fallbackError) {
        setError('Error al cerrar partida: ' + fallbackError.message);
      } else {
        setSuccess('Partida terminada. Premios repartidos a los ganadores.');
        setDotaMatchId('');
        setEquipoGanador('');
        setDatosPartida(null);
        void avisarFinDePartida();
        cargarSala();
      }
      return;
    }

    setTerminando(false);

    if (rpcError) {
      setError('Error al cerrar partida: ' + rpcError.message);
    } else {
      setSuccess('Partida terminada. Premios repartidos a los ganadores.');
      setDotaMatchId('');
      setEquipoGanador('');
      setDatosPartida(null);
      void avisarFinDePartida();
      cargarSala();
    }
  }

  async function ejecutarConfirmacion() {
    if (!confirmacion) return;

    const actual = confirmacion;
    setProcesandoConfirmacion(true);

    try {
      if (actual.tipo === 'expulsar') {
        await expulsarJugador(actual.userId);
      } else if (actual.tipo === 'cancelar') {
        await cancelarSala();
      } else if (actual.tipo === 'cancelar_picks') {
        await cancelarPicks();
      } else {
        await terminarPartida();
      }
    } finally {
      setProcesandoConfirmacion(false);
      setConfirmacion(null);
    }
  }

  function datosConfirmacion() {
    if (!confirmacion) {
      return { titulo: '', mensaje: '', confirmar: 'Confirmar' };
    }

    if (confirmacion.tipo === 'expulsar') {
      return {
        titulo: 'Sacar jugador de la sala',
        mensaje: `¿Sacar a ${confirmacion.nick ?? 'este jugador'}? Se le devolverá la cuota y dejará de estar en la sala.`,
        confirmar: 'Sacar jugador',
      };
    }

    if (confirmacion.tipo === 'cancelar') {
      return {
        titulo: 'Cancelar sala',
        mensaje:
          'Se reembolsará a todos los participantes y la sala quedará cancelada. Esta acción no se puede deshacer.',
        confirmar: 'Cancelar sala',
      };
    }

    if (confirmacion.tipo === 'cancelar_picks') {
      return {
        titulo: 'Cancelar fase de picks',
        mensaje:
          'Se cancelarán los picks y todos los jugadores volverán a la lista de espera. Los capitanes y equipos elegidos se borrarán.',
        confirmar: 'Cancelar picks',
      };
    }

    return {
      titulo: datosPartida ? 'Terminar partida' : 'Cerrar con ganador manual',
      mensaje: `Se cerrará la partida y se repartirán los premios al equipo ${
        equipoGanador === '1' ? 'Radiant' : equipoGanador === '2' ? 'Dire' : 'seleccionado'
      }. ${
        datosPartida
          ? 'Verifica que el ID y el ganador sean correctos.'
          : 'No se pudo verificar con Steam/OpenDota: se guardará el ganador manual y no se registrarán duración ni marcador.'
      }`,
      confirmar: datosPartida ? 'Confirmar y terminar' : 'Cerrar con ganador manual',
    };
  }

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

  if (!['abierta', 'llena', 'en_juego'].includes(sala.estado)) {
    const terminada = sala.estado === 'terminada';

    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <div className="text-center">
          <p className={terminada ? 'text-emerald-300' : 'text-amber-300'}>
            {terminada
              ? 'Partida terminada. Los premios ya fueron repartidos.'
              : 'La sala no puede ser gestionada en este estado'}
          </p>
          <p className="mt-2 text-sm text-slate-400">Estado actual: {sala.estado}</p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            {terminada && (
              <Link href="/salas/historial" className="text-prism-300 hover:underline">
                Ver historial
              </Link>
            )}
            <Link href="/" className="inline-block text-prism-300 hover:underline">
              Ir al inicio
            </Link>
            <Link href="/salas" className="inline-block text-prism-300 hover:underline">
              Volver a salas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const equipo1Count = Object.values(equipos).filter((e) => e === 1).length;
  const equipo2Count = Object.values(equipos).filter((e) => e === 2).length;
  const balanceados = equipo1Count === equipo2Count;

  const sinEquipo = participantes.filter((p) => !equipos[p.user_id]);
  const enRadiant = participantes.filter((p) => equipos[p.user_id] === 1);
  const enDire = participantes.filter((p) => equipos[p.user_id] === 2);
  const estadoSala = sala.estado;
  const picksEstado = sala.picks_estado ?? 'inactivo';
  const enFasePicks = picksEstado === 'eleccion' || picksEstado === 'en_curso';
  const dialogo = datosConfirmacion();
  const mmrRadiant = promedioMmr(enRadiant.map((p) => p.profiles?.mmr));
  const mmrDire = promedioMmr(enDire.map((p) => p.profiles?.mmr));
  const nombreJugador = (id?: string | null) =>
    participantes.find((p) => p.user_id === id)?.profiles?.nick ?? '—';

  const slotsProps = {
    equipos,
    estadoSala: enFasePicks ? 'en_juego' : estadoSala,
    // En 1v1 los equipos los define el sorteo: el admin no los mueve a mano.
    mostrarMover: sala.cupo !== 2,
    // La preferencia de lado solo se mira durante la fase de picks.
    mostrarPreferencia: enFasePicks,
    onMover: moverJugador,
    onExpulsar: (p: Participante) =>
      setConfirmacion({
        tipo: 'expulsar',
        userId: p.user_id,
        nick: p.profiles?.nick,
      }),
  };

  const verificacionEstado = sala.verificacion_estado ?? 'inactiva';
  const listos = participantes.filter((p) => p.verificado_at).length;

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo={`Admin: ${sala.nombre}`} />

      <main className="mx-auto max-w-6xl px-4 py-5">
        {error && (
          <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-sm text-rose-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {editandoNombre ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void guardarNombreSala();
                }}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
              >
                <Image
                  src="/dota2.svg"
                  alt=""
                  width={20}
                  height={20}
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0"
                />
                <input
                  value={nombreSala}
                  onChange={(event) => setNombreSala(event.target.value)}
                  maxLength={60}
                  autoFocus
                  aria-label="Nombre de la sala"
                  placeholder="Nombre de la sala"
                  className="min-w-0 flex-1 rounded-lg border border-prism-500/40 bg-white/5 px-2.5 py-1.5 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-prism-400 focus:outline-none sm:max-w-sm"
                />
                <button
                  type="submit"
                  disabled={guardandoNombre}
                  className="rounded-lg bg-prism-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-prism-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardandoNombre ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoNombre(false)}
                  disabled={guardandoNombre}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar edición
                </button>
              </form>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <Image
                  src="/dota2.svg"
                  alt=""
                  width={20}
                  height={20}
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0"
                />
                <h1 className="min-w-0 truncate font-display text-lg font-bold text-white">
                  {sala.nombre}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setNombreSala(sala.nombre);
                    setError(null);
                    setSuccess(null);
                    setEditandoNombre(true);
                  }}
                  className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10"
                  title="Cambiar el nombre de la sala"
                >
                  <span aria-hidden="true">✎</span> Cambiar nombre
                </button>
                <button
                  type="button"
                  onClick={() => void alternarDestacada()}
                  disabled={destacando}
                  className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    sala.destacada
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                  title={
                    sala.destacada
                      ? 'Quitar esta sala de la portada'
                      : 'Mostrar esta sala en la portada'
                  }
                >
                  {destacando
                    ? 'Guardando…'
                    : sala.destacada
                      ? '★ Quitar destacada'
                      : '☆ Destacar'}
                </button>
              </div>
            )}
            <button
              onClick={() => setConfirmacion({ tipo: 'cancelar' })}
              className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15"
            >
              Cancelar sala
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-prism-500/15 px-2.5 py-1 font-bold text-prism-200 ring-1 ring-inset ring-prism-500/30">
              {sala.modalidad ?? (sala.cupo === 2 ? '1v1' : '5v5')}
            </span>
            {sala.destacada && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-bold text-amber-200 ring-1 ring-inset ring-amber-500/30">
                ★ Destacada en landing
              </span>
            )}
            <span className="rounded-full bg-white/5 px-2.5 py-1 font-semibold text-slate-300 ring-1 ring-inset ring-white/10">
              {sala.estado === 'abierta'
                ? 'Abierta'
                : sala.estado === 'llena'
                  ? 'Llena'
                  : 'En juego'}
            </span>
            <span className="text-slate-400">
              {participantes.length}/{sala.cupo} jugadores
            </span>
            {sala.cupo === 10 && (
              <span
                className={`rounded-full px-2.5 py-1 font-semibold ring-1 ring-inset ${
                  picksEstado === 'terminado'
                    ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                    : picksEstado === 'inactivo'
                      ? 'bg-white/5 text-slate-400 ring-white/10'
                      : 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
                }`}
              >
                {picksEstado === 'inactivo'
                  ? 'Picks sin iniciar'
                  : picksEstado === 'eleccion'
                    ? 'Moneda / elección'
                    : picksEstado === 'en_curso'
                      ? `Pick ${participantes.filter((p) => p.equipo !== null && !p.es_capitan).length + 1}/8`
                      : 'Picks completados'}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-white">Equipos</h2>
              <span className="text-xs text-slate-400">
                Mueve jugadores entre equipos y espera
              </span>
            </div>

            {sala.cupo === 2 && enFasePicks && (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
                Sorteo 1v1: <strong>{nombreJugador(sala.pick_decision_user_id)}</strong> elige su
                lado (Radiant o Dire). El otro jugador irá al lado contrario.
              </div>
            )}

            {sala.cupo === 10 && estadoSala !== 'en_juego' && (
              <div className="mt-3 rounded-xl border border-prism-500/25 bg-prism-500/[0.06] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-prism-200">Fase de picks</h3>
                  {picksEstado !== 'inactivo' && (
                    <div className="flex flex-wrap gap-1.5">
                      {picksEstado === 'en_curso' && (
                        <button
                          onClick={forzarAutoPick}
                          disabled={procesandoPicks}
                          className="rounded-md bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-inset ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-50"
                        >
                          Auto-pick ahora
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmacion({ tipo: 'cancelar_picks' })}
                        disabled={procesandoPicks}
                        className="rounded-md bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200 ring-1 ring-inset ring-rose-500/25 transition hover:bg-rose-500/25 disabled:opacity-50"
                      >
                        {picksEstado === 'terminado' ? 'Reiniciar picks' : 'Cancelar picks'}
                      </button>
                    </div>
                  )}
                </div>

                {picksEstado === 'inactivo' && (
                  <>
                    <p className="mt-1 text-xs text-prism-300">
                      Elige dos capitanes y lanza la moneda.
                    </p>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-medium text-prism-200">Capitán 1</span>
                        <select
                          value={capitan1}
                          onChange={(e) => setCapitan1(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-100"
                        >
                          <option value="">Elegir jugador…</option>
                          {participantes.map((p) => (
                            <option key={p.user_id} value={p.user_id}>
                              {p.profiles?.nick ?? 'Usuario'} · {formatearMmr(p.profiles?.mmr)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-prism-200">Capitán 2</span>
                        <select
                          value={capitan2}
                          onChange={(e) => setCapitan2(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-100"
                        >
                          <option value="">Elegir jugador…</option>
                          {participantes.map((p) => (
                            <option key={p.user_id} value={p.user_id}>
                              {p.profiles?.nick ?? 'Usuario'} · {formatearMmr(p.profiles?.mmr)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      onClick={iniciarPicks}
                      disabled={procesandoPicks || participantes.length !== 10}
                      className="mt-2 w-full rounded-lg bg-prism-500 py-1.5 text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:opacity-50"
                    >
                      {procesandoPicks ? 'Lanzando moneda…' : 'Lanzar moneda e iniciar picks'}
                    </button>
                    {participantes.length !== 10 && (
                      <p className="mt-1.5 text-xs text-prism-300">
                        La sala debe tener 10 jugadores para iniciar.
                      </p>
                    )}
                  </>
                )}

                {picksEstado === 'eleccion' && (
                  <div className="mt-2 text-sm text-prism-200">
                    <p>
                      🪙 La moneda eligió a{' '}
                      <strong>{nombreJugador(sala.pick_ganador_moneda)}</strong>.
                    </p>
                    <p className="mt-1 text-xs text-prism-300">
                      Ahora decide <strong>{nombreJugador(sala.pick_decision_user_id)}</strong>:{' '}
                      {sala.pick_decision_tipo === 'moneda'
                        ? 'pickear primero o elegir lado'
                        : 'elegir Radiant o Dire'}
                      . La decisión se toma desde la sala del jugador.
                    </p>
                  </div>
                )}

                {picksEstado === 'en_curso' && (
                  <p className="mt-2 text-sm text-prism-200">
                    Turno de <strong>{nombreJugador(sala.pick_turno_user_id)}</strong>. Si no
                    pickea en 60 segundos, el sistema elegirá automáticamente al mejor disponible.
                  </p>
                )}

                {picksEstado === 'terminado' && (
                  <p className="mt-2 text-sm text-emerald-300">
                    Picks completados. Los equipos quedaron 5/5; ya puedes definir el lobby y poner
                    la partida en juego.
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.04] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-200">
                      Radiant
                    </p>
                    <p className="truncate text-[11px] font-medium text-emerald-200/60">
                      MMR prom: {formatearMmr(mmrRadiant)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-emerald-100 ring-1 ring-inset ring-emerald-400/20">
                    {enRadiant.length}/{Math.floor(sala.cupo / 2)}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <Slots
                    {...slotsProps}
                    jugadores={enRadiant}
                    capacidad={Math.floor(sala.cupo / 2)}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-rose-400/15 bg-rose-500/[0.04] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-200">Dire</p>
                    <p className="truncate text-[11px] font-medium text-rose-200/60">
                      MMR prom: {formatearMmr(mmrDire)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-rose-100 ring-1 ring-inset ring-rose-400/20">
                    {enDire.length}/{Math.floor(sala.cupo / 2)}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <Slots
                    {...slotsProps}
                    jugadores={enDire}
                    capacidad={Math.floor(sala.cupo / 2)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Lista de espera
                </p>
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-300 ring-1 ring-inset ring-white/10">
                  {sinEquipo.length}/{sala.cupo}
                </span>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <Slots {...slotsProps} jugadores={sinEquipo} capacidad={sala.cupo} />
              </div>
            </div>

            {!balanceados && (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-300">
                Los equipos no están balanceados: Radiant {enRadiant.length} vs Dire {enDire.length}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-white">Verificación</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Avisa a todos que están listos. Solo informa: no bloquea el inicio.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold tabular-nums text-slate-300 ring-1 ring-inset ring-white/10">
                  {listos}/{participantes.length}
                </span>
              </div>

              {verificacionEstado === 'inactiva' && (
                <>
                  <button
                    onClick={pedirVerificacion}
                    disabled={pidiendoVerificacion || participantes.length < sala.cupo}
                    className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-400 disabled:opacity-50"
                  >
                    {pidiendoVerificacion ? 'Enviando...' : 'Pedir verificación'}
                  </button>
                  {participantes.length < sala.cupo && (
                    <p className="mt-1.5 text-[11px] text-amber-300">
                      La sala debe estar completa ({participantes.length}/{sala.cupo}) para pedir la
                      verificación.
                    </p>
                  )}
                </>
              )}

              {verificacionEstado === 'pendiente' && (
                <>
                  <p className="mt-2 text-xs text-amber-200">
                    Esperando confirmaciones: <strong>{listos}</strong> de {participantes.length}{' '}
                    listos. Los que confirmaron tienen ✓ en su slot.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={pedirVerificacion}
                      disabled={pidiendoVerificacion}
                      className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      Volver a pedir
                    </button>
                    <button
                      onClick={cancelarVerificacion}
                      disabled={pidiendoVerificacion}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}

              {verificacionEstado === 'completa' && (
                <>
                  <p className="mt-2 text-xs text-emerald-200">
                    Todos los jugadores confirmaron que están listos ({listos}/
                    {participantes.length}).
                  </p>
                  <button
                    onClick={pedirVerificacion}
                    disabled={pidiendoVerificacion}
                    className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                  >
                    Pedir de nuevo
                  </button>
                </>
              )}
            </div>

            <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft">
              <h2 className="font-display text-base font-bold text-white">Lobby</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Nombre y clave que verán los jugadores al poner en juego.
              </p>

              <div className="mt-3 space-y-2">
                <label className="block">
                  <span className="text-xs font-medium text-slate-300">Nombre del lobby</span>
                  <input
                    type="text"
                    value={lobbyNombre}
                    onChange={(e) => setLobbyNombre(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
                    placeholder="Ej: Sala Pro 5v5"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-300">Clave del lobby</span>
                  <input
                    type="text"
                    value={lobbyClave}
                    onChange={(e) => setLobbyClave(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
                    placeholder="Ej: abc123"
                  />
                </label>
              </div>

              <button
                onClick={ponerEnJuego}
                disabled={saving || picksEstado === 'eleccion' || picksEstado === 'en_curso'}
                className="mt-3 w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving
                  ? 'Guardando...'
                  : sala.estado === 'en_juego'
                    ? 'Actualizar datos del lobby'
                    : 'Guardar cambios y poner en juego'}
              </button>
              {picksEstado === 'eleccion' || picksEstado === 'en_curso' ? (
                <p className="mt-1.5 text-[11px] text-amber-300">
                  Termina la fase de picks para poner la partida en juego.
                </p>
              ) : null}
              <p className="mt-1.5 text-[11px] text-slate-400">
                {sala.estado === 'en_juego'
                  ? 'Puedes corregir el nombre o la clave.'
                  : 'Al guardar, la sala pasa a «en juego» y se avisa a los jugadores.'}
              </p>
              {lobby && (
                <div className="mt-2 rounded-lg border border-prism-500/20 bg-prism-500/[0.08] px-2.5 py-2 text-[11px] text-prism-200">
                  <span className="font-semibold">Publicado:</span> {lobby.nombre} · Clave{' '}
                  {lobby.clave}
                </div>
              )}
            </div>

            <ChatPanel
              salaId={salaId}
              titulo="Chat de la sala"
              descripcion="Coordina con los jugadores"
              altura="h-[340px]"
            />
          </div>

          {sala.estado === 'en_juego' && (
            <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-white">Terminar partida</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    La app busca la partida automáticamente. También puedes ingresar el ID y verificar el resultado.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={autoCierre}
                      onChange={(e) => setAutoCierre(e.target.checked)}
                      className="h-3.5 w-3.5 accent-emerald-500"
                    />
                    Auto
                  </label>
                  <button
                    onClick={() => void revisarCierreAuto()}
                    disabled={detectando}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                  >
                    {detectando ? 'Buscando…' : 'Detectar ahora'}
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-400">
                <span
                  className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                    detectando ? 'animate-pulse bg-amber-400' : autoCierre ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
                <span>
                  {detectando
                    ? 'Buscando la partida en Steam…'
                    : !autoCierre
                      ? 'Detección automática desactivada.'
                      : estadoDeteccion ??
                        'Detección automática activa: revisa cada 60 segundos.'}
                </span>
              </div>

              <p className="mt-1.5 text-[11px] text-slate-400">
                ¿Lobby personalizado/practice sin ticket? Steam no lo expone en su API.
                Elige el ganador y confirma manualmente; no se guardarán duración ni marcador.
              </p>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    ID de la partida de Dota 2
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={dotaMatchId}
                      onChange={(e) => setDotaMatchId(e.target.value)}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
                      placeholder="Ej: 7654321098"
                    />
                    <button
                      onClick={verificarPartida}
                      disabled={verificando || !dotaMatchId}
                      className="rounded-lg bg-prism-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-prism-400 disabled:opacity-50"
                    >
                      {verificando ? 'Verificando...' : 'Verificar'}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Lo encuentras en Dotabuff o en tu perfil de Dota 2.
                  </p>
                </div>

                {datosPartida && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-200 sm:grid-cols-3">
                    <p>
                      <span className="text-slate-400">Ganador:</span>{' '}
                      {datosPartida.radiant_win ? 'Radiant' : 'Dire'}
                    </p>
                    <p>
                      <span className="text-slate-400">Duración:</span>{' '}
                      {Math.floor(datosPartida.duration / 60)}m {datosPartida.duration % 60}s
                    </p>
                    <p>
                      <span className="text-slate-400">Puntuación:</span>{' '}
                      {datosPartida.radiant_score} - {datosPartida.dire_score}
                    </p>
                    {datosPartida.fuente && (
                      <p className="col-span-2 text-[11px] text-slate-400 sm:col-span-3">
                        Datos obtenidos vía{' '}
                        {datosPartida.fuente === 'opendota' ? 'OpenDota' : 'Steam'}.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Equipo ganador (se llena automáticamente al verificar)
                  </label>
                  <div className="mt-1 flex gap-2">
                    <button
                      onClick={() => setEquipoGanador('1')}
                      className={`flex-1 rounded-md border py-1.5 text-sm font-semibold transition ${
                        equipoGanador === '1'
                          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      Radiant
                    </button>
                    <button
                      onClick={() => setEquipoGanador('2')}
                      className={`flex-1 rounded-md border py-1.5 text-sm font-semibold transition ${
                        equipoGanador === '2'
                          ? 'border-rose-400/30 bg-rose-500/15 text-rose-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      Dire
                    </button>
                  </div>
                </div>

                {!datosPartida && (
                  <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
                    Sin verificación automática: se cerrará con el ganador que elijas manualmente.
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmacion({ tipo: 'terminar' })}
                    disabled={terminando || !dotaMatchId || !equipoGanador}
                    className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
                  >
                    {terminando
                      ? 'Cerrando...'
                      : datosPartida
                        ? 'Confirmar y terminar'
                        : 'Cerrar con ganador manual'}
                  </button>
                  <button
                    onClick={() => {
                      setDotaMatchId('');
                      setEquipoGanador('');
                      setDatosPartida(null);
                    }}
                    className="flex-1 rounded-lg bg-white/5 py-2 text-sm text-slate-300 transition hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        abierto={confirmacion !== null}
        titulo={dialogo.titulo}
        mensaje={dialogo.mensaje}
        confirmar={dialogo.confirmar}
        peligro
        procesando={procesandoConfirmacion}
        onConfirmar={ejecutarConfirmacion}
        onCancelar={() => setConfirmacion(null)}
      />
    </div>
  );
}

export default function AdminSalaDetallePage() {
  return (
    <Suspense
      fallback={
        <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
          <p>Cargando sala...</p>
        </div>
      }
    >
      <AdminSalaContenido />
    </Suspense>
  );
}
