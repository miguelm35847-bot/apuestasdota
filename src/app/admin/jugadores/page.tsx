'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';
import AdminNav from '@/components/AdminNav';
import AdminPageHeader from '@/components/AdminPageHeader';
import Avatar from '@/components/Avatar';
import Toast from '@/components/Toast';
import { formatearMmr, resumenRolesConIconos } from '@/lib/balance';
import type { RolDota } from '@/lib/types';

type Jugador = {
  id: string;
  nick: string | null;
  mmr: number | null;
  roles_preferidos: RolDota[] | null;
  steam_avatar_url: string | null;
  rol: string | null;
  baneado: boolean | null;
};

type TipoAccionSaldo = 'recarga' | 'multa';

type AccionSaldo = {
  tipo: TipoAccionSaldo;
  jugador: Jugador;
};

function formatSoles(centimos: number) {
  return `S/ ${(centimos / 100).toFixed(2)}`;
}

export default function AdminJugadoresPage() {
  useArenaBody();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [saldos, setSaldos] = useState<Record<string, number>>({});
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [valorMmr, setValorMmr] = useState('');
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [accion, setAccion] = useState<AccionSaldo | null>(null);
  const [monto, setMonto] = useState('');
  const [motivoMulta, setMotivoMulta] = useState('');
  const [procesandoSaldo, setProcesandoSaldo] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const cargarSaldos = useCallback(async () => {
    const acumulado: Record<string, number> = {};
    const tam = 1000;

    for (let desde = 0; ; desde += tam) {
      const { data, error: saldosError } = await supabase
        .from('movimientos_billetera')
        .select('user_id, monto')
        .range(desde, desde + tam - 1);

      if (saldosError) {
        console.error('Error cargando saldos:', saldosError);
        break;
      }

      const filas = (data ?? []) as { user_id: string; monto: number }[];
      for (const fila of filas) {
        if (!fila.user_id) continue;
        acumulado[fila.user_id] = (acumulado[fila.user_id] ?? 0) + Number(fila.monto);
      }

      if (filas.length < tam) break;
    }

    setSaldos(acumulado);
  }, []);

  const cargarJugadores = useCallback(async () => {
    setCargando(true);
    const [{ data, error: loadError }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, nick, mmr, roles_preferidos, steam_avatar_url, rol, baneado')
        .order('nick', { ascending: true }),
      cargarSaldos(),
    ]);

    if (loadError) {
      console.error('Error cargando jugadores:', loadError);
      setError('Error al cargar jugadores: ' + loadError.message);
      setCargando(false);
      return;
    }

    setJugadores((data ?? []) as Jugador[]);
    setCargando(false);
  }, [cargarSaldos]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc('es_admin').then(({ data }: { data: boolean | null }) => {
      if (data === true) {
        setIsAdmin(true);
        cargarJugadores();
      } else {
        setIsAdmin(false);
      }
    });
  }, [user, cargarJugadores]);

  function empezarEdicion(j: Jugador) {
    setError(null);
    setSuccess(null);
    setEditando(j.id);
    setValorMmr(j.mmr != null ? String(j.mmr) : '');
  }

  function cancelarEdicion() {
    setEditando(null);
    setValorMmr('');
  }

  async function guardarMmr(j: Jugador) {
    setError(null);
    setSuccess(null);

    const numero = valorMmr.trim() === '' ? null : Number(valorMmr);

    if (numero === null || !Number.isInteger(numero) || numero < 0 || numero > 20000) {
      setError('El MMR debe ser un número entero entre 0 y 20000');
      return;
    }

    setGuardandoId(j.id);

    const { error: rpcError } = await supabase.rpc('admin_editar_mmr', {
      p_user: j.id,
      p_mmr: numero,
    });

    if (rpcError) {
      setError('No se pudo actualizar el MMR: ' + rpcError.message);
    } else {
      setJugadores((prev) => prev.map((p) => (p.id === j.id ? { ...p, mmr: numero } : p)));
      setSuccess(`MMR de ${j.nick ?? 'usuario'} actualizado a ${numero}`);
      setEditando(null);
      setValorMmr('');
    }

    setGuardandoId(null);
  }

  function abrirAccion(j: Jugador, tipo: TipoAccionSaldo) {
    setError(null);
    setSuccess(null);
    setAviso(null);
    setErrorModal(null);

    if (j.id === user?.id) {
      setError('No puedes recargar ni multar tu propia cuenta desde este panel.');
      return;
    }

    setAccion({ tipo, jugador: j });
    setMonto('');
    setMotivoMulta('');
  }

  function cerrarAccion() {
    if (procesandoSaldo) return;
    setAccion(null);
    setMonto('');
    setMotivoMulta('');
    setErrorModal(null);
  }

  async function confirmarAccion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accion || procesandoSaldo) return;

    const montoCentimos = Math.round(Number(monto) * 100);
    const montoValido =
      monto.trim() !== '' &&
      Number.isFinite(Number(monto)) &&
      Number.isSafeInteger(montoCentimos) &&
      montoCentimos > 0;

    if (!montoValido) {
      setErrorModal('Ingresa un monto mayor a S/ 0.00.');
      return;
    }

    const motivo = motivoMulta.trim();
    if (accion.tipo === 'multa' && !motivo) {
      setErrorModal('Escribe el motivo o la regla incumplida.');
      return;
    }

    setProcesandoSaldo(true);
    setErrorModal(null);
    setError(null);
    setAviso(null);
    setSuccess(null);

    const delta = accion.tipo === 'recarga' ? montoCentimos : -montoCentimos;

    if (accion.tipo === 'recarga') {
      const { error: rpcError } = await supabase.rpc('ajuste_admin', {
        p_user: accion.jugador.id,
        p_monto: montoCentimos,
        p_motivo: 'Recarga manual',
      });

      if (rpcError) {
        setErrorModal('No se pudo aplicar el movimiento: ' + rpcError.message);
        setProcesandoSaldo(false);
        return;
      }

      const { error: notifError } = await supabase.rpc('notificar_usuario', {
        p_user: accion.jugador.id,
        p_tipo: 'recarga_aprobada',
        p_mensaje: `Se acreditó una recarga manual de ${formatSoles(montoCentimos)} a tu saldo.`,
      });
      if (notifError) {
        console.error('Error creando notificación de recarga:', notifError.message);
        setAviso('El saldo se acreditó, pero no se pudo crear la notificación al jugador.');
      }
    } else {
      // La RPC aplica el movimiento, deja la multa en el panel de actividades y
      // notifica al jugador, todo en una sola operación.
      const { error: rpcError } = await supabase.rpc('admin_aplicar_multa', {
        p_user: accion.jugador.id,
        p_monto: montoCentimos,
        p_motivo: motivo,
      });

      if (rpcError) {
        setErrorModal('No se pudo aplicar la multa: ' + rpcError.message);
        setProcesandoSaldo(false);
        return;
      }
    }

    const jugadorAfectado = accion.jugador;
    setSaldos((prev) => ({
      ...prev,
      [jugadorAfectado.id]: (prev[jugadorAfectado.id] ?? 0) + delta,
    }));
    setAccion(null);
    setMonto('');
    setMotivoMulta('');
    setProcesandoSaldo(false);
    setSuccess(
      accion.tipo === 'recarga'
        ? `Recarga de ${formatSoles(montoCentimos)} acreditada a ${jugadorAfectado.nick ?? 'usuario'}.`
        : `Multa de ${formatSoles(montoCentimos)} aplicada a ${jugadorAfectado.nick ?? 'usuario'}.`
    );
    void cargarSaldos();
  }

  if (authLoading || isAdmin === null) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <p>Verificando permisos...</p>
      </div>
    );
  }

  if (!user || isAdmin === false) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <div className="text-center">
          <p className="text-rose-300">No tienes permisos para ver esta página</p>
          <Link href="/" className="mt-4 inline-block text-prism-300 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const filtro = busqueda.trim().toLowerCase();
  const visibles = filtro
    ? jugadores.filter(
        (j) =>
          (j.nick ?? '').toLowerCase().includes(filtro) ||
          (j.mmr != null && String(j.mmr).includes(filtro))
      )
    : jugadores;

  const montoCentimos = Math.round(Number(monto) * 100);
  const montoValido =
    monto.trim() !== '' &&
    Number.isFinite(Number(monto)) &&
    Number.isSafeInteger(montoCentimos) &&
    montoCentimos > 0;
  const saldoAccion = accion ? (saldos[accion.jugador.id] ?? 0) : undefined;
  const quedaNegativo =
    accion?.tipo === 'multa' && saldoAccion !== undefined && montoValido && montoCentimos > saldoAccion;
  const puedeConfirmar =
    Boolean(accion) &&
    montoValido &&
    !procesandoSaldo &&
    (accion?.tipo !== 'multa' || motivoMulta.trim().length > 0);

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Admin - Jugadores" />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <AdminNav />

        <AdminPageHeader
          titulo="Jugadores"
          descripcion="Corrige el MMR, acredita recargas manuales y aplica multas por faltas a las reglas."
          badge={
            !cargando ? (
              <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                {jugadores.length} {jugadores.length === 1 ? 'registrado' : 'registrados'}
              </span>
            ) : undefined
          }
        />

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}
        {aviso && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            {aviso}
          </div>
        )}
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nick o MMR"
          className="mb-4 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
        />

        {cargando ? (
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 text-center shadow-arena-soft">
            <p className="text-slate-400">Cargando jugadores...</p>
          </div>
        ) : visibles.length === 0 ? (
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] px-6 py-12 text-center shadow-arena-soft">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/20">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <p className="mt-4 font-display text-lg font-bold text-white">
              No se encontraron jugadores
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Prueba con otro nick o revisa el MMR ingresado.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibles.map((j) => (
              <div
                key={j.id}
                className="arena-card flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-arena-soft sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  href={`/jugadores/${j.id}`}
                  title={`Ver perfil de ${j.nick ?? 'Usuario'}`}
                  className="flex min-w-0 items-center gap-3 rounded-xl transition hover:bg-white/5"
                >
                  <Avatar nick={j.nick} src={j.steam_avatar_url} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-slate-100">
                      {j.nick ?? 'Usuario'}
                      {j.rol === 'admin' && (
                        <span className="rounded-full bg-prism-500/15 px-2 py-0.5 text-[10px] font-semibold text-prism-200">
                          Admin
                        </span>
                      )}
                      {j.baneado && (
                        <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                          Baneado
                        </span>
                      )}
                    </p>
                    <p className="text-sm font-bold text-prism-300">
                      {j.mmr != null ? `MMR ${formatearMmr(j.mmr)}` : 'Sin MMR registrado'}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-300">
                      Saldo: {formatSoles(saldos[j.id] ?? 0)}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {resumenRolesConIconos(j.roles_preferidos)}
                    </p>
                  </div>
                </Link>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => abrirAccion(j, 'recarga')}
                    disabled={j.id === user?.id}
                    title={j.id === user?.id ? 'No puedes recargar tu propia cuenta' : 'Acreditar saldo manualmente'}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Recargar
                  </button>
                  <button
                    onClick={() => abrirAccion(j, 'multa')}
                    disabled={j.id === user?.id}
                    title={j.id === user?.id ? 'No puedes multar tu propia cuenta' : 'Aplicar una multa por faltas a las reglas'}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Multar
                  </button>
                  {editando === j.id ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        max={20000}
                        step={1}
                        value={valorMmr}
                        onChange={(e) => setValorMmr(e.target.value)}
                        placeholder="Ej: 4500"
                        autoFocus
                        className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
                      />
                      <button
                        onClick={() => guardarMmr(j)}
                        disabled={guardandoId === j.id}
                        className="rounded-lg bg-prism-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-prism-400 disabled:opacity-50"
                      >
                        {guardandoId === j.id ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={cancelarEdicion}
                        disabled={guardandoId === j.id}
                        className="rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => empezarEdicion(j)}
                      className="rounded-lg border border-prism-500/40 bg-prism-500/10 px-3 py-2 text-sm font-medium text-prism-200 transition hover:bg-prism-500/20"
                    >
                      {j.mmr != null ? 'Editar MMR' : 'Asignar MMR'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {accion && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="saldo-dialog-title"
          >
            <div className="arena-card w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="saldo-dialog-title" className="font-display text-lg font-bold text-white">
                    {accion.tipo === 'recarga' ? 'Recargar saldo' : 'Aplicar multa'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {accion.tipo === 'recarga'
                      ? 'Acredita el saldo verificado por Yape, WhatsApp o en persona.'
                      : 'Descuenta saldo por una falta a las reglas de la sala.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cerrarAccion}
                  disabled={procesandoSaldo}
                  aria-label="Cerrar"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <Avatar nick={accion.jugador.nick} src={accion.jugador.steam_avatar_url} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {accion.jugador.nick ?? 'Usuario'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Saldo actual: {saldoAccion === undefined ? '—' : formatSoles(saldoAccion)}
                  </p>
                </div>
              </div>

              <form onSubmit={confirmarAccion} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="monto-saldo" className="text-xs font-semibold text-slate-300">
                    Monto en soles
                  </label>
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      S/
                    </span>
                    <input
                      id="monto-saldo"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                      className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
                    />
                  </div>
                </div>

                {accion.tipo === 'multa' && (
                  <div>
                    <label htmlFor="motivo-multa" className="text-xs font-semibold text-slate-300">
                      Motivo / regla incumplida
                    </label>
                    <textarea
                      id="motivo-multa"
                      rows={3}
                      maxLength={200}
                      value={motivoMulta}
                      onChange={(e) => setMotivoMulta(e.target.value)}
                      placeholder="Ej: incumplió la regla de pausas"
                      className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
                    />
                    <p className="mt-1 text-right text-[11px] text-slate-500">
                      {motivoMulta.length}/200
                    </p>
                  </div>
                )}

                <p className="text-xs leading-relaxed text-slate-400">
                  {accion.tipo === 'recarga' ? (
                    <>
                      No se pedirá motivo; quedará registrado como{' '}
                      <span className="font-semibold text-slate-200">Recarga manual</span>.
                    </>
                  ) : (
                    <>
                      Se descontará del saldo del jugador.
                      {quedaNegativo && (
                        <span className="font-semibold text-amber-300">
                          {' '}
                          La multa no puede ser mayor al saldo disponible (
                          {formatSoles(saldoAccion ?? 0)}).
                        </span>
                      )}
                    </>
                  )}
                </p>

                {errorModal && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                    {errorModal}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={cerrarAccion}
                    disabled={procesandoSaldo}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!puedeConfirmar}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                      accion.tipo === 'recarga'
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    {procesandoSaldo
                      ? 'Procesando...'
                      : accion.tipo === 'recarga'
                        ? 'Acreditar saldo'
                        : 'Aplicar multa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Toast mensaje={success} tipo="success" onClose={() => setSuccess(null)} />
      </main>
    </div>
  );
}
