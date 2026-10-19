'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import Navbar from '@/components/Navbar';
import AdminNav from '@/components/AdminNav';
import Avatar from '@/components/Avatar';



type Recarga = {
  id: string;
  user_id: string;
  monto: number;
  numero_operacion: string;
  captura_path: string | null;
  estado: string;
  created_at: string;
  captura_url: string | null;
  profiles: {
    nick: string;
    steam_avatar_url: string | null;
  };
};

export default function AdminRecargasPage() {
  useArenaBody();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [recargas, setRecargas] = useState<Recarga[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notaRechazo, setNotaRechazo] = useState('');
  const [recargaRechazando, setRecargaRechazando] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const cargarRecargas = useCallback(async () => {
    const { data, error } = await supabase
      .from('recargas')
      .select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error cargando recargas:', error);
      setError('Error al cargar recargas: ' + error.message);
      return;
    }

    if (data) {
      // Obtener nicks de los usuarios en consulta separada
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: perfiles } = await supabase
        .from('profiles')
        .select('id, nick, steam_avatar_url')
        .in('id', userIds);

      const perfilMap = new Map(
        perfiles?.map((p) => [p.id, { nick: p.nick, steam_avatar_url: p.steam_avatar_url }]) ?? []
      );

      const conCapturas = await Promise.all(
        data.map(async (r) => {
          let capturaUrl: string | null = null;
          if (r.captura_path) {
            const { data: urlData } = await supabase.storage
              .from('capturas')
              .createSignedUrl(r.captura_path, 3600);
            capturaUrl = urlData?.signedUrl ?? null;
          }
          const perfil = perfilMap.get(r.user_id);
          return {
            ...r,
            captura_url: capturaUrl,
            profiles: {
              nick: perfil?.nick ?? 'Usuario',
              steam_avatar_url: perfil?.steam_avatar_url ?? null,
            },
          };
        })
      );
      setRecargas(conCapturas);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.rpc('es_admin').then(({ data }: { data: boolean | null }) => {
      if (data === true) {
        setIsAdmin(true);
        cargarRecargas();
      } else {
        setIsAdmin(false);
      }
    });
  }, [user, cargarRecargas]);

  async function aprobarRecarga(id: string) {
    setError(null);
    setSuccess(null);

    const recarga = recargas.find((r) => r.id === id);

    const { error: rpcError } = await supabase.rpc('aprobar_recarga', {
      p_recarga: id,
    });

    if (rpcError) {
      setError('Error al aprobar: ' + rpcError.message);
    } else {
      if (recarga) {
        const { error: notifError } = await supabase.from('notificaciones').insert({
          user_id: recarga.user_id,
          tipo: 'recarga_aprobada',
          mensaje: `Tu recarga de S/ ${(recarga.monto / 100).toFixed(2)} fue aprobada.`,
        });
        if (notifError) console.error('Error creando notificación:', notifError.message);
      }
      setSuccess('Recarga aprobada correctamente');
      cargarRecargas();
    }
  }

  async function rechazarRecarga() {
    if (!recargaRechazando) return;
    setError(null);
    setSuccess(null);

    const recarga = recargas.find((r) => r.id === recargaRechazando);

    const { error: rpcError } = await supabase.rpc('rechazar_recarga', {
      p_recarga: recargaRechazando,
      p_nota: notaRechazo.trim() || null,
    });

    if (rpcError) {
      setError('Error al rechazar: ' + rpcError.message);
    } else {
      if (recarga) {
        const { error: notifError } = await supabase.from('notificaciones').insert({
          user_id: recarga.user_id,
          tipo: 'recarga_rechazada',
          mensaje: `Tu recarga de S/ ${(recarga.monto / 100).toFixed(2)} fue rechazada. Motivo: ${notaRechazo.trim() || 'Sin motivo'}.`,
        });
        if (notifError) console.error('Error creando notificación:', notifError.message);
      }
      setSuccess('Recarga rechazada correctamente');
      setRecargaRechazando(null);
      setNotaRechazo('');
      cargarRecargas();
    }
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

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Admin - Recargas pendientes" />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <AdminNav />

        <div className="mb-4 mt-6 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Recargas pendientes</h1>
            <p className="text-sm text-slate-400">
              Aprueba o rechaza las solicitudes de recarga de los jugadores.
            </p>
          </div>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            {recargas.length} {recargas.length === 1 ? 'pendiente' : 'pendientes'}
          </span>
        </div>

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

        {recargas.length === 0 ? (
          <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 text-center shadow-arena-soft">
            <p className="text-slate-400">No hay recargas pendientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recargas.map((r) => (
              <div
                key={r.id}
                className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          nick={r.profiles?.nick}
                          src={r.profiles?.steam_avatar_url}
                          size="lg"
                        />
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-white">
                            {r.profiles?.nick ?? 'Usuario desconocido'}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {new Date(r.created_at).toLocaleString('es-PE')}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 font-display text-2xl font-bold tabular-nums text-emerald-300">
                        S/ {(r.monto / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">
                      <span className="font-medium text-slate-300">Nº Operación:</span>{' '}
                      {r.numero_operacion}
                    </p>
                  </div>

                  <div className="w-full md:w-48">
                    {r.captura_url ? (
                      <Image
                        src={r.captura_url}
                        alt="Captura de pago"
                        width={400}
                        height={300}
                        unoptimized
                        className="h-auto w-full rounded-lg border border-white/10"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-slate-500">
                        Sin captura
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => aprobarRecarga(r.id)}
                    className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => {
                      setRecargaRechazando(r.id);
                      setNotaRechazo('');
                    }}
                    className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
                  >
                    Rechazar
                  </button>
                </div>

                {recargaRechazando === r.id && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <label className="block text-sm font-medium text-slate-300">
                      Motivo del rechazo
                    </label>
                    <textarea
                      value={notaRechazo}
                      onChange={(e) => setNotaRechazo(e.target.value)}
                      className="mt-1 block w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-rose-400 focus:outline-none"
                      rows={2}
                      placeholder="Ej: Captura ilegible"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={rechazarRecarga}
                        className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
                      >
                        Confirmar rechazo
                      </button>
                      <button
                        onClick={() => {
                          setRecargaRechazando(null);
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
