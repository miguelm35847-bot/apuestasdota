'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { prepararSonido, reproducirSonido } from '@/lib/sonidos';
import type { Notificacion } from '@/lib/types';

/** Los avisos de verificación no se muestran en la campana (solo suenan). */
const TIPOS_OCULTOS = ['verificacion_sala'];

export default function NotificationBell() {
  const [noLeidas, setNoLeidas] = useState(0);
  const [show, setShow] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const pedidosVistos = useRef<Record<string, string>>({});
  const sorteosVistos = useRef<Record<string, string>>({});
  const listosVistos = useRef<Record<string, string>>({});
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    cargarNotificaciones();
    prepararSonido();

    // Canal 1: notificaciones del usuario (campana en vivo + fin de partida).
    const canalNotificaciones = supabase
      .channel('notificaciones_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        (event) => {
          cargarNotificaciones();
          // El fin de partida suena para todos los jugadores de la sala.
          if ((event.new as { tipo?: string } | undefined)?.tipo === 'partida_finalizada') {
            reproducirSonido('fin');
          }
        }
      )
      .subscribe();

    // Canal 2 (aparte): avisos de sala. Se separa para que un fallo en un
    // canal no se lleve el sonido del otro.
    const canalSalas = supabase
      .channel('verificacion_salas_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'salas' },
        (event) => {
          const sala = event.new as {
            id?: string;
            cupo?: number;
            verificacion_estado?: string;
            verificacion_iniciada_at?: string | null;
            picks_estado?: string;
            creado_por?: string | null;
          };
          if (!sala.id) return;

          // Se pidió la verificación: suena a los jugadores de esa sala.
          if (sala.verificacion_estado === 'pendiente') {
            listosVistos.current[sala.id] = '';
            const clave = sala.verificacion_iniciada_at ?? '';
            if (pedidosVistos.current[sala.id] !== clave) {
              pedidosVistos.current[sala.id] = clave;
              void avisarSiSoyDeLaSala(sala.id);
            }
          }

          // En una 5v5, cuando todos confirmaron, el admin que creó la sala
          // recibe un sonido para que elija a los capitanes.
          if (
            sala.verificacion_estado === 'completa' &&
            sala.cupo === 10 &&
            sala.creado_por === userIdRef.current &&
            listosVistos.current[sala.id] !== 'completa'
          ) {
            listosVistos.current[sala.id] = 'completa';
            reproducirSonido('listos');
          }

          // Se lanzó la moneda: el admin que creó la sala recibe el aviso
          // para crear el lobby en Dota y poner la sala en juego.
          if (sala.picks_estado === 'eleccion' && sala.creado_por === userIdRef.current) {
            if (sorteosVistos.current[sala.id] !== 'eleccion') {
              sorteosVistos.current[sala.id] = 'eleccion';
              reproducirSonido('moneda');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalNotificaciones);
      supabase.removeChannel(canalSalas);
    };
  }, []);

  /** Suena el aviso solo si el usuario es jugador de esa sala. */
  async function avisarSiSoyDeLaSala(salaId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    userIdRef.current = user.id;

    const { data } = await supabase
      .from('participantes_sala')
      .select('user_id')
      .eq('sala_id', salaId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) reproducirSonido('verificacion');
  }

  async function cargarNotificaciones() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    userIdRef.current = user.id;

    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) {
      const filas = (data as unknown as Notificacion[]).filter(
        (n) => !TIPOS_OCULTOS.includes(n.tipo)
      );
      setNotificaciones(filas);
      setNoLeidas(filas.filter((n) => !n.leida).length);
    }
  }

  async function marcarLeidas() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.rpc('marcar_notificaciones_leidas', { p_ids: null });

    setNoLeidas(0);
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  }

  function tipoIcono(tipo: string) {
    const iconos: Record<string, string> = {
      recarga_aprobada: '✅',
      recarga_rechazada: '❌',
      retiro_pagado: '💰',
      retiro_rechazado: '❌',
      partida_iniciada: '🎮',
      expulsado_sala: '🚪',
      multa: '⚠️',
      verificacion_sala: '🔔',
      verificacion_completa: '✅',
      partida_finalizada: '🏁',
      donacion_recibida: '🎁',
    };
    return iconos[tipo] ?? '📋';
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShow(!show);
          if (!show) {
            cargarNotificaciones();
            marcarLeidas();
          }
        }}
        aria-label="Ver notificaciones"
        className="relative rounded-full p-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#0a0e17]">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {show && (
        <div className="arena-card absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-arena">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-bold text-white">Notificaciones</h3>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              {notificaciones.length}
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">No tienes notificaciones</p>
            ) : (
              notificaciones.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-white/5 p-3 transition hover:bg-white/5 ${
                    !n.leida ? 'bg-prism-500/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg ring-1 ring-white/10">
                      {tipoIcono(n.tipo)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200">{n.mensaje}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {new Date(n.created_at).toLocaleDateString('es-PE')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
