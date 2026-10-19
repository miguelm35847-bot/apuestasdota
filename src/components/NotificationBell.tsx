'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function NotificationBell() {
  const [noLeidas, setNoLeidas] = useState(0);
  const [show, setShow] = useState(false);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);

  useEffect(() => {
    cargarNotificaciones();

    const channel = supabase
      .channel('notificaciones_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, () => {
        cargarNotificaciones();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function cargarNotificaciones() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotificaciones(data);
      setNoLeidas(data.filter((n: any) => !n.leida).length);
    }
  }

  async function marcarLeidas() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('user_id', user.id)
      .eq('leida', false);

    setNoLeidas(0);
    setNotificaciones((prev) => prev.map((n: any) => ({ ...n, leida: true })));
  }

  function tipoIcono(tipo: string) {
    const iconos: Record<string, string> = {
      recarga_aprobada: '✅',
      recarga_rechazada: '❌',
      retiro_pagado: '💰',
      retiro_rechazado: '❌',
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
        className="relative rounded p-2 hover:bg-gray-100"
      >
        <span className="text-xl">🔔</span>
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {show && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg bg-white shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No tienes notificaciones</p>
            ) : (
              notificaciones.map((n: any) => (
                <div
                  key={n.id}
                  className={`p-3 border-b border-gray-100 ${
                    !n.leida ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{tipoIcono(n.tipo)}</span>
                    <div>
                      <p className="text-sm text-gray-900">{n.mensaje}</p>
                      <p className="text-xs text-gray-500 mt-1">
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
