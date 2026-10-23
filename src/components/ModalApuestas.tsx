'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import type { SalaApuesta } from '@/components/ApuestasProvider';
import { formatoSoles } from '@/lib/actividades';
import Avatar from '@/components/Avatar';
import ApuestasPublicas from '@/components/ApuestasPublicas';
import { CAMPOS_APUESTA, PAGINA_APUESTAS, ladoApuesta as lado, type Apuesta } from '@/lib/apuestas';
import { useCambiosApuestas } from '@/lib/useCambiosApuestas';
const errorApuesta = (mensaje: string) => /schema cache|does not exist|Could not find/i.test(mensaje)
  ? 'Las apuestas todavía no están habilitadas. Inténtalo más tarde.' : mensaje;

export default function ModalApuestas({ sala, onCerrar }: { sala: SalaApuesta; onCerrar: () => void }) {
  const { user, loading: autenticando } = useAuth();
  const dialogo = useRef<HTMLDialogElement>(null);
  const bloqueo = useRef(false);
  const solicitud = useRef(0);
  const peticion = useRef<{ id: string; equipo: number } | null>(null);
  const [equipo, setEquipo] = useState(1);
  const [apuestas, setApuestas] = useState<Apuesta[]>([]);
  const [paginaOfertas, setPaginaOfertas] = useState(0);
  const [paginaPropias, setPaginaPropias] = useState(0);
  const [totalOfertas, setTotalOfertas] = useState(0);
  const [totalPropias, setTotalPropias] = useState(0);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [enJuego, setEnJuego] = useState(false);
  const [limite, setLimite] = useState<number>(Infinity);
  const [ahora, setAhora] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<Apuesta | null>(null);

  useEffect(() => {
    const dialog = dialogo.current;
    const anterior = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!user) return;
    const actual = ++solicitud.current;
    try {
      const [ofertas, propias, balance, partida] = await Promise.all([
        supabase.from('apuestas_sala').select(CAMPOS_APUESTA, { count: 'exact' }).eq('sala_id', sala.id).eq('estado', 'pendiente')
          .neq('creador_id', user.id).eq('equipo_creador', equipo === 1 ? 2 : 1)
          .order('creado_en', { ascending: false }).order('id', { ascending: false }).range(paginaOfertas * PAGINA_APUESTAS, (paginaOfertas + 1) * PAGINA_APUESTAS - 1),
        supabase.from('apuestas_sala').select(CAMPOS_APUESTA, { count: 'exact' }).eq('sala_id', sala.id).or(`creador_id.eq.${user.id},aceptante_id.eq.${user.id}`)
          .order('creado_en', { ascending: false }).order('id', { ascending: false }).range(paginaPropias * PAGINA_APUESTAS, (paginaPropias + 1) * PAGINA_APUESTAS - 1),
        supabase.rpc('mi_saldo'),
        supabase.from('salas').select('estado,iniciada_at').eq('id', sala.id).maybeSingle(),
      ]);
      if (actual !== solicitud.current) return;
      const fallo = ofertas.error ?? propias.error ?? balance.error ?? partida.error;
      if (fallo) throw new Error(errorApuesta(fallo.message));
      const unicas = new Map<string, Apuesta>();
      for (const a of [...(ofertas.data ?? []), ...(propias.data ?? [])] as unknown as Apuesta[]) unicas.set(a.id, a);
      setApuestas([...unicas.values()].sort((a, b) => b.creado_en.localeCompare(a.creado_en)));
      setTotalOfertas(ofertas.count ?? 0);
      setTotalPropias(propias.count ?? 0);
      setPaginaOfertas((p) => Math.min(p, Math.max(0, Math.ceil((ofertas.count ?? 0) / PAGINA_APUESTAS) - 1)));
      setPaginaPropias((p) => Math.min(p, Math.max(0, Math.ceil((propias.count ?? 0) / PAGINA_APUESTAS) - 1)));
      setSaldo(typeof balance.data === 'number' ? balance.data : null);
      setLimite(partida.data?.iniciada_at ? new Date(partida.data.iniciada_at).getTime()+25*60000 : 0);
      setEnJuego(partida.data?.estado === 'en_juego' && !!partida.data.iniciada_at && Date.now() < new Date(partida.data.iniciada_at).getTime() + 25 * 60000);
      setErrorCarga(null);
    } catch (e) {
      if (actual === solicitud.current) setErrorCarga(e instanceof Error ? e.message : 'No se pudieron cargar las apuestas.');
    } finally {
      if (actual === solicitud.current) setCargando(false);
    }
  }, [sala.id, user, equipo, paginaOfertas, paginaPropias]);

  useCambiosApuestas(sala.id, cargar, !!user);

  async function operar(accion: 'crear' | 'aceptar' | 'cancelar', apuesta?: Apuesta) {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setProcesando(true);
    setError(null);
    setAviso(null);
    try {
      if (accion === 'crear' && peticion.current?.equipo !== equipo) peticion.current = { id: crypto.randomUUID(), equipo };
      const rpc = accion === 'crear' ? 'crear_apuesta_sala' : accion === 'aceptar' ? 'aceptar_apuesta_sala' : 'cancelar_apuesta_sala';
      const args = accion === 'crear' ? { p_sala: sala.id, p_equipo: equipo, p_id: peticion.current!.id } : { p_apuesta: apuesta!.id };
      const { error: fallo } = await supabase.rpc(rpc, args);
      if (fallo) throw new Error(errorApuesta(fallo.message));
      if (accion === 'crear') peticion.current = null;
      setConfirmar(null);
      setAviso(accion === 'crear' ? 'Oferta publicada. Falta que otro usuario la acepte; todavía no se cobró saldo.'
        : accion === 'aceptar' ? 'Apuesta confirmada. Cada usuario aportó S/ 5.50. El ganador recibirá S/ 10.00.' : 'Oferta cancelada. No se cobró saldo.');
      window.dispatchEvent(new Event('saldo:refresh'));
      window.dispatchEvent(new Event('apuestas:refresh'));
      if (accion === 'crear') setPaginaPropias(0);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la operación. Reintenta.');
      await cargar();
    } finally {
      bloqueo.current = false;
      setProcesando(false);
    }
  }

  const propias = apuestas.filter((a) => a.creador_id === user?.id || a.aceptante_id === user?.id);
  const ofertas = apuestas.filter((a) => a.estado === 'pendiente' && a.creador_id !== user?.id && a.equipo_creador !== equipo);
  useEffect(() => { const timer=setInterval(()=>setAhora(Date.now()),1000);return()=>clearInterval(timer); },[]);
  const ventanaAbierta = enJuego && ahora < limite;
  const habilitado = ventanaAbierta && !cargando && !errorCarga && !procesando && saldo !== null && saldo >= 550;

  return (
    <dialog ref={dialogo} aria-labelledby="apuestas-titulo" onCancel={(e) => { e.preventDefault(); if (!bloqueo.current) onCerrar(); }}
      className="arena-card m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-white/10 p-5 font-sans text-slate-100 shadow-arena backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="apuestas-titulo" className="font-display text-lg font-bold tracking-tight text-white">Apuestas de la partida</h2>
          <p className="mt-1 break-words text-sm text-slate-400">{sala.nombre}</p>
        </div>
        <button type="button" autoFocus aria-label="Cerrar apuestas" disabled={procesando} onClick={onCerrar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-slate-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400/40 disabled:opacity-40">×</button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4"><p className="text-xs font-medium text-slate-400">Tu aporte</p><p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">S/ 5.50</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4"><p className="text-xs font-medium text-slate-400">Premio total</p><p className="mt-1 font-display text-2xl font-bold tabular-nums text-amber-300">S/ 10.00</p></div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">Elige Radiant o Dire. Solo se cobra cuando otro usuario acepta el lado contrario.</p>
      <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs leading-5 text-slate-400">
        <summary className="cursor-pointer font-semibold text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400/40">Hasta el minuto 25 · Cómo funciona</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Las apuestas cierran 25 minutos después de que la sala entra en juego.</li>
          <li>Ambos aportan S/ 5.50. El premio de S/ 10.00 incluye tu aporte.</li>
          <li>Una apuesta confirmada no se puede retirar. Si se cancela la sala, ambos recuperan su aporte.</li>
          <li>Los jugadores no pueden apostar en su propia partida.</li>
        </ul>
      </details>
      <p className="mt-3 border-l-2 border-amber-400/40 pl-3 text-xs leading-5 text-slate-400"><span className="font-semibold text-amber-200">Marcador de ejemplo.</span> El pago usa el resultado registrado al cerrar la sala.</p>

      {autenticando ? <p className="mt-4 text-sm">Comprobando sesión…</p> : !user ? (
        <Link href={`/login?next=${encodeURIComponent(`/salas/${sala.id}/partida`)}`} onClick={onCerrar} className="mt-4 block rounded-lg bg-prism-500 p-3 text-center text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400">Inicia sesión para apostar</Link>
      ) : <>
        <p className="mt-5 text-sm text-slate-400">Tu saldo: <strong className="font-semibold tabular-nums text-white">{saldo === null ? '…' : formatoSoles(saldo)}</strong></p>
        {cargando && <p className="mt-3 text-sm text-slate-400">Cargando apuestas…</p>}
        {errorCarga && <div role="alert" className="mt-3 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{errorCarga}<button type="button" onClick={() => void cargar()} className="ml-2 underline">Reintentar</button></div>}
        {!cargando && !errorCarga && !ventanaAbierta && <p role="status" className="mt-3 text-sm text-amber-200">Apuestas cerradas: terminó el plazo de 25 minutos o la sala ya no está en juego.</p>}
        {!cargando && !errorCarga && ventanaAbierta && <>
          <fieldset disabled={procesando} className="mt-4">
            <legend className="mb-3 font-display text-sm font-semibold tracking-tight text-white">¿Quién ganará?</legend>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map((n) => <label key={n} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold ${equipo === n ? n === 1 ? 'border-emerald-400 bg-emerald-400/15 text-emerald-200' : 'border-rose-400 bg-rose-400/15 text-rose-200' : 'border-white/10 text-slate-400'}`}>
                <input type="radio" name="equipo-apuesta" value={n} checked={equipo === n} className={`h-4 w-4 ${n === 1 ? 'accent-emerald-400' : 'accent-rose-400'}`} onChange={() => { setEquipo(n); setPaginaOfertas(0); setConfirmar(null); }} />{lado(n)}
              </label>)}
            </div>
          </fieldset>
          {saldo !== null && saldo < 550 && <p className="mt-2 text-xs text-amber-200">Necesitas S/ 5.50 para apostar. <Link href="/recargar" onClick={onCerrar} className="underline">Recargar saldo</Link></p>}
          <h3 className="mt-5 font-display text-sm font-semibold tracking-tight text-white">Aceptar una oferta</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">Tú eliges {lado(equipo)}. Tu rival, {lado(equipo === 1 ? 2 : 1)}.</p>
          {ofertas.length === 0 ? <p className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-slate-400">Todavía no hay ofertas para ese lado. Puedes publicar la tuya.</p> : <ul className="mt-3 space-y-2">
            {ofertas.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 p-3">
              <div className="flex min-w-0 items-center gap-3"><Avatar nick={a.creador?.nick} src={a.creador?.steam_avatar_url} size="sm" /><div className="min-w-0 text-xs leading-5"><p className="truncate text-sm font-semibold text-slate-100">{a.creador?.nick ?? 'Jugador'}</p><p className="text-slate-400">Apuesta a {lado(a.equipo_creador)}</p></div></div>
              <button type="button" disabled={!habilitado} onClick={() => { setConfirmar(a); setError(null); }} className="rounded-lg bg-prism-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-prism-400 disabled:opacity-40">Apostar a {lado(equipo)}</button>
            </li>)}
          </ul>}
          <Paginacion pagina={paginaOfertas} total={totalOfertas} cambiar={setPaginaOfertas} etiqueta="ofertas" deshabilitado={procesando} />
          {confirmar && <div className="mt-3 rounded-xl border border-prism-400/25 bg-prism-500/10 p-4">
            <p className="text-sm leading-6 text-slate-300">Apostarás <strong className="text-white">S/ 5.50 a {lado(confirmar.equipo_creador === 1 ? 2 : 1)}</strong> frente a {confirmar.creador?.nick ?? 'otro jugador'}. Si ganas recibirás S/ 10.00. Una vez confirmada, no se puede retirar.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={!habilitado} onClick={() => void operar('aceptar', confirmar)} className="rounded-lg bg-prism-500 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-prism-400 disabled:opacity-40">Confirmar apuesta · S/ 5.50</button>
              <button type="button" disabled={procesando} onClick={() => setConfirmar(null)} className="px-3 py-2 text-xs text-slate-300">Volver</button>
            </div>
          </div>}
          <div className="mt-5 border-t border-white/10 pt-4">
            <h3 className="font-display text-sm font-semibold tracking-tight text-white">Publicar mi oferta</h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">Sin límite de ofertas. Se cobra al encontrar rival y ambos deben tener saldo.</p>
            <button type="button" disabled={!habilitado} onClick={() => void operar('crear')} className="mt-3 w-full rounded-lg border border-prism-400/25 bg-prism-500/10 p-3 text-sm font-semibold text-prism-200 transition hover:bg-prism-500/20 disabled:opacity-40">{`Ofrecer S/ 5.50 a ${lado(equipo)}`}</button>
          </div>
        </>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
        {aviso && <p role="status" className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">{aviso}</p>}
        {procesando && <p role="status" className="mt-2 text-xs text-slate-400">Procesando…</p>}
        <h3 className="mt-5 font-display text-sm font-semibold tracking-tight text-white">Mis apuestas en esta sala</h3>
        {propias.length === 0 ? <p className="mt-2 text-xs text-slate-400">Aún no tienes apuestas.</p> : <ul className="mt-2 space-y-2">
          {propias.map((a) => {
            const miEquipo = a.creador_id === user.id ? a.equipo_creador : a.equipo_creador === 1 ? 2 : 1;
            const estado = a.estado === 'pendiente' ? 'Esperando rival · sin cobro' : a.estado === 'aceptada' ? 'Confirmada · S/ 5.50 aportados' : a.estado === 'liquidada' ? a.ganador_id === user.id ? 'Ganaste · S/ 10.00 abonados' : 'Perdiste · S/ 5.50' : a.estado === 'reembolsada' ? 'Reembolsada · S/ 5.50 devueltos' : a.estado === 'expirada' ? 'Expirada · sin cobro' : 'Cancelada · sin cobro';
            return <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 p-3 text-xs">
              <div><strong>{lado(miEquipo)}</strong><p className="mt-1 text-slate-400">{estado}</p></div>
              {a.aceptante_id && <div className="flex min-w-0 items-center gap-2"><Avatar nick={(a.creador_id === user.id ? a.aceptante : a.creador)?.nick} src={(a.creador_id === user.id ? a.aceptante : a.creador)?.steam_avatar_url} size="xs" /><span className="truncate">vs {(a.creador_id === user.id ? a.aceptante : a.creador)?.nick ?? 'Jugador'}</span></div>}
              {a.estado === 'pendiente' && <button type="button" disabled={procesando} onClick={() => void operar('cancelar', a)} className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-40">Cancelar oferta</button>}
            </li>;
          })}
        </ul>}
        <Paginacion pagina={paginaPropias} total={totalPropias} cambiar={setPaginaPropias} etiqueta="mis apuestas" deshabilitado={procesando} />
      </>}
      <ApuestasPublicas salaId={sala.id} />
    </dialog>
  );
}

function Paginacion({ pagina, total, cambiar, etiqueta, deshabilitado }: { pagina: number; total: number; cambiar: (pagina: number) => void; etiqueta: string; deshabilitado: boolean }) {
  if (total <= PAGINA_APUESTAS) return null;
  return <nav aria-label={`Páginas de ${etiqueta}`} className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400">
    <button type="button" disabled={deshabilitado || pagina === 0} onClick={() => cambiar(pagina - 1)} className="rounded-lg border border-white/10 p-2 disabled:opacity-30">Anterior</button>
    <span>{pagina + 1} / {Math.ceil(total / PAGINA_APUESTAS)}</span>
    <button type="button" disabled={deshabilitado || (pagina + 1) * PAGINA_APUESTAS >= total} onClick={() => cambiar(pagina + 1)} className="rounded-lg border border-white/10 p-2 disabled:opacity-30">Siguiente</button>
  </nav>;
}
