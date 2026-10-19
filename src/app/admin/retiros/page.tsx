'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';
import Avatar from '@/components/Avatar';
import type { Retiro } from '@/lib/types';



export default function AdminRetirosPage() {
  useArenaBody();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notaRechazo, setNotaRechazo] = useState('');
  const [retiroRechazando, setRetiroRechazando] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const cargarRetiros = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('retiros')
      .select('*, profiles!user_id(nick, steam_avatar_url)')
      .eq('estado', 'solicitado')
      .order('created_at', { ascending: true });

    if (err) {
      setError('Error cargando retiros: ' + err.message);
    } else {
      setRetiros((data as unknown as Retiro[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      supabase.rpc('es_admin').then(({ data }: { data: boolean | null }) => {
        if (data === true) {
          cargarRetiros();
        } else {
          router.push('/');
        }
      });
    }
  }, [user, cargarRetiros, router]);

  async function marcarPagado(id: string) {
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc('marcar_retiro_pagado', {
      p_retiro: id,
    });

    if (rpcError) {
      setError('Error: ' + rpcError.message);
    } else {
      const retiro = retiros.find((r) => r.id === id);
      if (retiro) {
        const { error: notifError } = await supabase.from('notificaciones').insert({
          user_id: retiro.user_id,
          tipo: 'retiro_pagado',
          mensaje: `Tu retiro de S/ ${(retiro.monto / 100).toFixed(2)} fue pagado.`,
        });
        if (notifError) console.error('Error creando notificación:', notifError.message);
      }
      setSuccess('Retiro marcado como pagado');
      cargarRetiros();
    }
  }

  async function rechazarRetiro() {
    if (!retiroRechazando) return;
    setError(null);
    setSuccess(null);

    const retiro = retiros.find((r) => r.id === retiroRechazando);

    const { error: rpcError } = await supabase.rpc('rechazar_retiro', {
      p_retiro: retiroRechazando,
      p_nota: notaRechazo.trim() || null,
    });

    if (rpcError) {
      setError('Error: ' + rpcError.message);
    } else {
      if (retiro) {
        const { error: notifError } = await supabase.from('notificaciones').insert({
          user_id: retiro.user_id,
          tipo: 'retiro_rechazado',
          mensaje: `Tu retiro de S/ ${(retiro.monto / 100).toFixed(2)} fue rechazado. Motivo: ${notaRechazo.trim() || 'Sin motivo'}. El saldo fue reembolsado.`,
        });
        if (notifError) console.error('Error creando notificación:', notifError.message);
      }
      setSuccess('Retiro rechazado. El saldo fue reembolsado al jugador.');
      setRetiroRechazando(null);
      setNotaRechazo('');
      cargarRetiros();
    }
  }

  if (authLoading) {
    return (
      <div className="arena-shell flex min-h-screen items-center justify-center bg-[#0a0e17] text-slate-300">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Admin - Retiros pendientes" />

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

        {loading ? (
          <p className="text-slate-500">Cargando retiros...</p>
        ) : retiros.length === 0 ? (
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 text-center shadow-arena-soft">
            <p className="text-slate-500">No hay retiros pendientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {retiros.map((r) => (
              <div
                key={r.id}
                className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <Avatar
                        nick={r.profiles?.nick}
                        src={r.profiles?.steam_avatar_url}
                        size="lg"
                      />
                      <h3 className="font-semibold text-white">
                        {r.profiles?.nick ?? 'Usuario'}
                      </h3>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-slate-400">
                      <p>
                        <span className="font-medium">Monto:</span> S/ {(r.monto / 100).toFixed(2)}
                      </p>
                      <p>
                        <span className="font-medium">Destino:</span> {r.destino}
                      </p>
                      <p>
                        <span className="font-medium">Fecha:</span>{' '}
                        {new Date(r.created_at).toLocaleString('es-PE')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => marcarPagado(r.id)}
                      className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
                    >
                      Marcar pagado
                    </button>
                    <button
                      onClick={() => {
                        setRetiroRechazando(r.id);
                        setNotaRechazo('');
                      }}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>

                {retiroRechazando === r.id && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <label className="block text-sm font-medium text-slate-300">
                      Motivo del rechazo
                    </label>
                    <textarea
                      value={notaRechazo}
                      onChange={(e) => setNotaRechazo(e.target.value)}
                      className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-rose-400 focus:outline-none"
                      rows={2}
                      placeholder="Ej: Número de Yape inválido"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={rechazarRetiro}
                        className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
                      >
                        Confirmar rechazo
                      </button>
                      <button
                        onClick={() => {
                          setRetiroRechazando(null);
                          setNotaRechazo('');
                        }}
                        className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
