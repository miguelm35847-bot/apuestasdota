'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import ChatPanel from '@/components/ChatPanel';
import Avatar from '@/components/Avatar';
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
  onMover,
  onExpulsar,
}: {
  p: Participante;
  actual: number | null | undefined;
  estadoSala: string;
  onMover: (userId: string, equipo: number | null) => void;
  onExpulsar: (p: Participante) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-white/10 px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Avatar nick={p.profiles?.nick} src={p.profiles?.steam_avatar_url} />
        <div className="min-w-0">
          <span className="block truncate text-sm text-slate-100">
            {p.es_capitan ? '⭐ ' : ''}
            {p.profiles?.nick ?? 'Usuario'}
          </span>
          <span className="block truncate text-sm font-bold text-prism-300">
            {p.profiles?.mmr != null
              ? `MMR ${formatearMmr(p.profiles.mmr)}`
              : 'Sin MMR'}
          </span>
          <span className="block truncate text-[11px] text-slate-500">
            {resumenRolesConIconos(p.profiles?.roles_preferidos)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-1">
        {estadoSala !== 'en_juego' && actual !== null && (
          <button
            onClick={() => onMover(p.user_id, null)}
            className="rounded bg-white/5 px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/10"
            title="Mover a lista de espera"
          >
            Espera
          </button>
        )}
        {estadoSala !== 'en_juego' && actual !== 1 && (
          <button
            onClick={() => onMover(p.user_id, 1)}
            className="rounded bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25"
          >
            Radiant
          </button>
        )}
        {estadoSala !== 'en_juego' && actual !== 2 && (
          <button
            onClick={() => onMover(p.user_id, 2)}
            className="rounded bg-rose-500/15 px-2 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/25"
          >
            Dire
          </button>
        )}
        {estadoSala !== 'en_juego' && (
          <button
            onClick={() => onExpulsar(p)}
            className="rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-rose-500"
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
  onMover,
  onExpulsar,
}: {
  jugadores: Participante[];
  capacidad: number;
  equipos: Record<string, number | null>;
  estadoSala: string;
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
            onMover={onMover}
            onExpulsar={onExpulsar}
          />
        ) : (
          <div
            key={`libre-${i}`}
            className="flex h-[46px] items-center justify-center rounded border-2 border-dashed border-white/10 text-xs text-slate-500"
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
        'user_id, equipo, es_capitan, pick_orden, profiles(nick, steam_avatar_url, mmr, roles_preferidos)'
      )
      .eq('sala_id', salaId)
      .order('created_at', { ascending: true });

    if (partData) {
      const parts = partData as unknown as Participante[];
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
      setDotaMatchId('');
      setEquipoGanador('');
      setDatosPartida(null);
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
      titulo: 'Terminar partida',
      mensaje: `Se cerrará la partida y se repartirán los premios al equipo ${
        equipoGanador === '1' ? 'Radiant' : equipoGanador === '2' ? 'Dire' : 'seleccionado'
      }. Verifica que el ID y el ganador sean correctos.`,
      confirmar: 'Confirmar y terminar',
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
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <div className="text-center">
          <p className="text-amber-300">
            La sala no puede ser gestionada en este estado
          </p>
          <p className="mt-2 text-sm text-slate-500">Estado actual: {sala.estado}</p>
          <Link href="/salas" className="mt-4 inline-block text-prism-300 hover:underline">
            Volver a salas
          </Link>
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
    onMover: moverJugador,
    onExpulsar: (p: Participante) =>
      setConfirmacion({
        tipo: 'expulsar',
        userId: p.user_id,
        nick: p.profiles?.nick,
      }),
  };

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo={`Admin: ${sala.nombre}`} />

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

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-white">Equipos de la sala</h2>
                <span className="rounded bg-prism-500/15 px-2 py-0.5 text-xs font-bold text-prism-200 ring-1 ring-inset ring-prism-500/30">
                  {sala.modalidad ?? (sala.cupo === 2 ? '1v1' : '5v5')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sala.cupo === 10 && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      picksEstado === 'terminado'
                        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
                        : picksEstado === 'inactivo'
                          ? 'bg-white/5 text-slate-400 ring-1 ring-inset ring-white/10'
                          : 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30'
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
                <span className="text-sm text-slate-400">
                  {participantes.length}/{sala.cupo} jugadores
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Los capitanes eligen por turnos. Mientras la fase de picks esté activa no se pueden
              mover jugadores manualmente.
            </p>

            {sala.cupo === 10 && estadoSala !== 'en_juego' && (
              <div className="mt-4 rounded-xl border border-prism-500/30 bg-prism-500/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-prism-200">Fase de picks</h3>
                  {picksEstado !== 'inactivo' && (
                    <div className="flex flex-wrap gap-2">
                      {picksEstado === 'en_curso' && (
                        <button
                          onClick={forzarAutoPick}
                          disabled={procesandoPicks}
                          className="rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 transition hover:bg-amber-400 disabled:opacity-50"
                        >
                          Auto-pick ahora
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmacion({ tipo: 'cancelar_picks' })}
                        disabled={procesandoPicks}
                        className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
                      >
                        {picksEstado === 'terminado' ? 'Reiniciar picks' : 'Cancelar picks'}
                      </button>
                    </div>
                  )}
                </div>

                {picksEstado === 'inactivo' && (
                  <>
                    <p className="mt-1 text-xs text-prism-300">
                      Elige dos capitanes y lanza la moneda. El ganador decide si pickea primero o
                      elige lado; los picks son en serpiente.
                    </p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-medium text-prism-200">Capitán 1</span>
                        <select
                          value={capitan1}
                          onChange={(e) => setCapitan1(e.target.value)}
                          className="mt-1 block w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
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
                          className="mt-1 block w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
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
                      className="mt-3 w-full rounded bg-prism-500 py-2 text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:opacity-50"
                    >
                      {procesandoPicks ? 'Lanzando moneda…' : 'Lanzar moneda e iniciar picks'}
                    </button>
                    {participantes.length !== 10 && (
                      <p className="mt-2 text-xs text-prism-300">
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

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-emerald-300">Radiant</p>
                    <p className="text-[11px] font-medium text-emerald-300">
                      MMR prom: {formatearMmr(mmrRadiant)}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
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

              <div className="rounded-xl border-2 border-rose-500/30 bg-rose-500/10 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-rose-300">Dire</p>
                    <p className="text-[11px] font-medium text-rose-300">
                      MMR prom: {formatearMmr(mmrDire)}
                    </p>
                  </div>
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
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

            <div className="mt-3 rounded-xl border-2 border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-slate-400">Lista de espera</p>
                <span className="rounded-full bg-slate-600 px-2 py-0.5 text-xs font-semibold text-white">
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

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Datos del lobby</h3>
              <p className="text-xs text-slate-500">
                Se mostrarán en la sala y en la campana de los jugadores al poner en juego.
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Nombre del lobby
                  </label>
                  <input
                    type="text"
                    value={lobbyNombre}
                    onChange={(e) => setLobbyNombre(e.target.value)}
                    className="mt-1 block w-full rounded border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
                    placeholder="Ej: Sala Pro 5v5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Clave del lobby
                  </label>
                  <input
                    type="text"
                    value={lobbyClave}
                    onChange={(e) => setLobbyClave(e.target.value)}
                    className="mt-1 block w-full rounded border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
                    placeholder="Ej: abc123"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={ponerEnJuego}
              disabled={saving || picksEstado === 'eleccion' || picksEstado === 'en_curso'}
              className="mt-4 w-full rounded bg-emerald-500 py-3 text-base font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving
                ? 'Guardando...'
                : sala.estado === 'en_juego'
                  ? 'Actualizar datos del lobby'
                  : 'Guardar cambios y poner en juego'}
            </button>
            {picksEstado === 'eleccion' || picksEstado === 'en_curso' ? (
              <p className="mt-2 text-xs text-amber-300">
                Termina la fase de picks para poner la partida en juego.
              </p>
            ) : null}
            <p className="mt-2 text-xs text-slate-500">
              {sala.estado === 'en_juego'
                ? 'La partida ya está en juego. Aquí solo puedes corregir el nombre o la clave.'
                : 'Al guardar, la sala pasa a "en juego" y los jugadores reciben el aviso con el nombre y la clave del lobby.'}
            </p>
          </div>

          {lobby && (
            <div className="rounded-2xl border border-prism-500/30 bg-prism-500/10 p-6">
              <h2 className="font-display text-lg font-bold text-prism-100">Lobby en juego</h2>
              <p className="mt-1 text-sm text-prism-300">
                Estos datos ya están publicados para todos los jugadores de la sala.
              </p>
              <div className="mt-3 space-y-2">
                <p className="text-sm text-prism-100">
                  <span className="font-semibold">Nombre:</span> {lobby.nombre}
                </p>
                <p className="text-sm text-prism-100">
                  <span className="font-semibold">Clave:</span> {lobby.clave}
                </p>
              </div>
            </div>
          )}

          {(sala.estado === 'abierta' || sala.estado === 'llena' || sala.estado === 'en_juego') && (
            <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
              <h2 className="font-display text-lg font-bold text-white">Cancelar sala</h2>
              <p className="mt-2 text-sm text-slate-400">
                Reembolsará a todos los participantes y cerrará la sala.
              </p>
              <button
                onClick={() => setConfirmacion({ tipo: 'cancelar' })}
                className="mt-4 w-full rounded bg-rose-600 py-2 text-white transition hover:bg-rose-500"
              >
                Cancelar sala
              </button>
            </div>
          )}

          {sala.estado === 'en_juego' && (
            <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft">
              <h2 className="font-display text-lg font-bold text-white">Terminar partida</h2>
              <p className="mt-2 text-sm text-slate-400">
                Ingresa el ID de la partida y verifica el resultado antes de terminar.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    ID de la partida de Dota 2
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={dotaMatchId}
                      onChange={(e) => setDotaMatchId(e.target.value)}
                      className="flex-1 rounded border-2 border-white/15 bg-white/5 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus:border-prism-400 focus:outline-none"
                      placeholder="Ej: 7654321098"
                    />
                    <button
                      onClick={verificarPartida}
                      disabled={verificando || !dotaMatchId}
                      className="rounded bg-prism-500 px-4 py-2 text-white transition hover:bg-prism-400 disabled:opacity-50"
                    >
                      {verificando ? 'Verificando...' : 'Verificar'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Lo encuentras en Dotabuff o en tu perfil de Dota 2
                  </p>
                </div>

                {datosPartida && (
                  <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm text-slate-200">
                      <span className="font-medium">Ganador:</span>{' '}
                      {datosPartida.radiant_win ? 'Radiant' : 'Dire'}
                    </p>
                    <p className="text-sm text-slate-200">
                      <span className="font-medium">Duración:</span>{' '}
                      {Math.floor(datosPartida.duration / 60)}m {datosPartida.duration % 60}s
                    </p>
                    <p className="text-sm text-slate-200">
                      <span className="font-medium">Puntuación:</span>{' '}
                      {datosPartida.radiant_score} - {datosPartida.dire_score}
                    </p>
                    <p className="text-sm text-slate-200">
                      <span className="font-medium">Equipo ganador (automático):</span>{' '}
                      {datosPartida.radiant_win ? 'Radiant' : 'Dire'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Equipo ganador (se llena automáticamente al verificar)
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEquipoGanador('1')}
                      className={`flex-1 rounded py-2 text-white transition ${
                        equipoGanador === '1' ? 'bg-emerald-600' : 'bg-emerald-900'
                      } hover:bg-emerald-500`}
                    >
                      Radiant
                    </button>
                    <button
                      onClick={() => setEquipoGanador('2')}
                      className={`flex-1 rounded py-2 text-white transition ${
                        equipoGanador === '2' ? 'bg-rose-600' : 'bg-rose-900'
                      } hover:bg-rose-500`}
                    >
                      Dire
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmacion({ tipo: 'terminar' })}
                    disabled={terminando || !dotaMatchId || !equipoGanador}
                    className="flex-1 rounded bg-rose-600 py-2 text-white transition hover:bg-rose-500 disabled:opacity-50"
                  >
                    {terminando ? 'Cerrando...' : 'Confirmar y terminar'}
                  </button>
                  <button
                    onClick={() => {
                      setDotaMatchId('');
                      setEquipoGanador('');
                      setDatosPartida(null);
                    }}
                    className="flex-1 rounded bg-white/5 py-2 text-slate-300 transition hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <section className="mt-6">
          <ChatPanel
            salaId={salaId}
            titulo="Chat de la sala"
            descripcion="Vista de administrador: puedes leer y escribir para moderar"
            altura="h-[420px]"
          />
        </section>
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
