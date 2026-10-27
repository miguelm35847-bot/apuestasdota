'use client';

import { CabeceraSalaAdmin } from '@/components/salas/admin/CabeceraSalaAdmin';
import { CierrePartidaAdmin } from '@/components/salas/admin/CierrePartidaAdmin';
import { ConfiguracionSalaAdmin } from '@/components/salas/admin/ConfiguracionSalaAdmin';
import { EquiposSalaAdmin } from '@/components/salas/admin/EquiposSalaAdmin';
import type { Confirmacion } from '@/components/salas/admin/tipos';
import type { ChangeEvent } from 'react';

import { useAuth } from '@/components/AuthProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import Navbar from '@/components/Navbar';
import { promedioMmr } from '@/lib/balance';
import { intentarCierreAutomatico } from '@/lib/dotaAutoClose';
import { reproducirSonido } from '@/lib/sonidos';
import { supabase } from '@/lib/supabase';
import type { DotaMatch, Lobby, Participante, Sala } from '@/lib/types';
import { useArenaBody } from '@/lib/useArenaBody';
import { useRefrescoSala, type DatosSala } from '@/lib/useRefrescoSala';
import type { JugadorVivo } from '@/lib/vivo';
import { duracionDesdeInicio } from '@/lib/vivo';
import { partidaVivaMock } from '@/lib/vivoMock';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

  const aplicarSala = useCallback((datos: DatosSala) => {
    if (datos.sala) {
      setSala(datos.sala);
      setAutoCierre(datos.sala.auto_cierre !== false);
      if (datos.sala.dota_match_id_esperado) setDotaMatchId(String(datos.sala.dota_match_id_esperado));
    }
    if (datos.participantes) {
      setParticipantes(datos.participantes);
      const eq: Record<string, number | null> = {};
      datos.participantes.forEach((p) => { eq[p.user_id] = p.equipo; });
      setEquipos(eq);
    }
    if (datos.lobby !== undefined) {
      setLobby(datos.lobby);
      if (datos.lobby) {
        const datosLobby = datos.lobby;
        setLobbyNombre((prev) => prev || datosLobby.nombre);
        setLobbyClave((prev) => prev || datosLobby.clave);
      }
    }
    setLoading(false);
  }, []);
  const cargarSala = useRefrescoSala(salaId, user?.id, aplicarSala);

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

  async function cambiarAutoCierre(e: ChangeEvent<HTMLInputElement>) {
    const valor = e.target.checked;
    const { error } = await supabase.rpc('admin_configurar_cierre', {
      p_sala: salaId, p_auto: valor, p_match: Number(dotaMatchId) || null,
    });
    if (error) setEstadoDeteccion('No se pudo guardar Auto: ' + error.message);
    else setAutoCierre(valor);
  }

  async function asociarPartida() {
    const { error } = await supabase.rpc('admin_configurar_cierre', {
      p_sala: salaId, p_auto: autoCierre, p_match: Number(dotaMatchId) || null,
    });
    if (error) {
      setEstadoDeteccion('No se pudo asociar la partida: ' + error.message);
      return;
    }
    await verificarPartida();
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
    vivoPorNick,
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

  // Moneda 5v5: se muestra con el avatar de los dos capitanes.
  const aMoneda = (p: Participante | null) =>
    p
      ? {
          id: p.user_id,
          nick: p.profiles?.nick ?? null,
          steam_avatar_url: p.profiles?.steam_avatar_url ?? null,
        }
      : null;
  const capitanMoneda = aMoneda(
    participantes.find((p) => p.user_id === sala.pick_ganador_moneda) ?? null
  );
  const rivalCapitan = aMoneda(
    participantes.find(
      (p) =>
        p.user_id !== sala.pick_ganador_moneda &&
        (p.user_id === sala.pick_capitan1 || p.user_id === sala.pick_capitan2)
    ) ?? null
  );
  // Todos listos y sin picks: toca elegir capitanes.
  const tocaElegirCapitanes =
    sala.cupo === 10 &&
    verificacionEstado === 'completa' &&
    picksEstado === 'inactivo' &&
    participantes.length === sala.cupo;

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

        <CabeceraSalaAdmin
          editandoNombre={editandoNombre}
          guardarNombreSala={guardarNombreSala}
          nombreSala={nombreSala}
          setNombreSala={setNombreSala}
          guardandoNombre={guardandoNombre}
          setEditandoNombre={setEditandoNombre}
          sala={sala}
          setError={setError}
          setSuccess={setSuccess}
          alternarDestacada={alternarDestacada}
          destacando={destacando}
          setConfirmacion={setConfirmacion}
          participantes={participantes}
          picksEstado={picksEstado}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <EquiposSalaAdmin
            sala={sala}
            enFasePicks={enFasePicks}
            nombreJugador={nombreJugador}
            estadoSala={estadoSala}
            picksEstado={picksEstado}
            forzarAutoPick={forzarAutoPick}
            procesandoPicks={procesandoPicks}
            setConfirmacion={setConfirmacion}
            tocaElegirCapitanes={tocaElegirCapitanes}
            participantes={participantes}
            capitan1={capitan1}
            setCapitan1={setCapitan1}
            capitan2={capitan2}
            setCapitan2={setCapitan2}
            iniciarPicks={iniciarPicks}
            capitanMoneda={capitanMoneda}
            rivalCapitan={rivalCapitan}
            mmrRadiant={mmrRadiant}
            enRadiant={enRadiant}
            slotsProps={slotsProps}
            mmrDire={mmrDire}
            enDire={enDire}
            sinEquipo={sinEquipo}
            balanceados={balanceados}
          />

          <ConfiguracionSalaAdmin
            listos={listos}
            participantes={participantes}
            verificacionEstado={verificacionEstado}
            pedirVerificacion={pedirVerificacion}
            pidiendoVerificacion={pidiendoVerificacion}
            sala={sala}
            cancelarVerificacion={cancelarVerificacion}
            tocaElegirCapitanes={tocaElegirCapitanes}
            lobbyNombre={lobbyNombre}
            setLobbyNombre={setLobbyNombre}
            lobbyClave={lobbyClave}
            setLobbyClave={setLobbyClave}
            ponerEnJuego={ponerEnJuego}
            saving={saving}
            picksEstado={picksEstado}
            lobby={lobby}
            salaId={salaId}
          />

          {sala.estado === 'en_juego' && (
            <CierrePartidaAdmin
              autoCierre={autoCierre}
              cambiarAutoCierre={cambiarAutoCierre}
              revisarCierreAuto={revisarCierreAuto}
              detectando={detectando}
              estadoDeteccion={estadoDeteccion}
              dotaMatchId={dotaMatchId}
              setDotaMatchId={setDotaMatchId}
              asociarPartida={asociarPartida}
              verificando={verificando}
              datosPartida={datosPartida}
              setEquipoGanador={setEquipoGanador}
              equipoGanador={equipoGanador}
              setConfirmacion={setConfirmacion}
              terminando={terminando}
              setDatosPartida={setDatosPartida}
            />
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
