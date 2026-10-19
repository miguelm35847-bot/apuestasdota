'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { MensajeChat } from '@/lib/types';
import Avatar from '@/components/Avatar';

function formatearHora(fecha: string) {
  return new Date(fecha).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

type ChatPanelProps = {
  salaId?: string | null;
  titulo?: string;
  descripcion?: string;
  altura?: string;
};

export default function ChatPanel({
  salaId = null,
  titulo = 'Chat general',
  descripcion = 'Habla con la comunidad',
  altura = 'h-[420px]',
}: ChatPanelProps) {
  const { user } = useAuth();
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const cargarMensajes = useCallback(async () => {
    let query = supabase
      .from('mensajes_chat')
      .select('id, sala_id, user_id, mensaje, created_at, profiles(nick, steam_avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);

    query = salaId ? query.eq('sala_id', salaId) : query.is('sala_id', null);

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError('No se pudo cargar el chat: ' + fetchError.message);
      setLoading(false);
      return;
    }

    const filas = (data as unknown as MensajeChat[]) ?? [];
    setMensajes(filas.reverse());
    setError(null);
    setLoading(false);
  }, [salaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del chat
    void cargarMensajes();
  }, [cargarMensajes]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${salaId ?? 'general'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_chat',
          ...(salaId ? { filter: `sala_id=eq.${salaId}` } : {}),
        },
        () => {
          void cargarMensajes();
        }
      )
      .subscribe();

    // Respaldo por si Realtime no está habilitado en Supabase
    const interval = setInterval(() => {
      void cargarMensajes();
    }, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [cargarMensajes, salaId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || !user || enviando) return;

    setEnviando(true);
    setError(null);

    const { error: insertError } = await supabase.from('mensajes_chat').insert({
      sala_id: salaId,
      user_id: user.id,
      mensaje: limpio.slice(0, 500),
    });

    if (insertError) {
      setError('No se pudo enviar: ' + insertError.message);
    } else {
      setTexto('');
      await cargarMensajes();
    }
    setEnviando(false);
  }

  return (
    <div className="arena-card flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-arena-soft">
      <div className="border-b border-white/10 px-4 py-2.5">
        <h3 className="text-sm font-bold text-white">{titulo}</h3>
        <p className="text-[11px] text-slate-400">{descripcion}</p>
      </div>

      <div ref={scrollRef} className={`arena-inset ${altura} space-y-3 overflow-y-auto p-3`}>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando mensajes...</p>
        ) : mensajes.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no hay mensajes. Sé el primero.</p>
        ) : (
          mensajes.map((m) => {
            const propio = m.user_id === user?.id;

            return (
              <div key={m.id} className={`flex gap-2 ${propio ? 'justify-end' : 'justify-start'}`}>
                {!propio && (
                  <Avatar
                    nick={m.profiles?.nick ?? '?'}
                    src={m.profiles?.steam_avatar_url}
                    size="sm"
                  />
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                    propio
                      ? 'rounded-br-md bg-prism-500 text-white'
                      : 'rounded-bl-md border border-white/10 bg-white/5 text-slate-100'
                  }`}
                >
                  {!propio && (
                    <p className="text-[11px] font-semibold text-prism-300">
                      {m.profiles?.nick ?? 'Usuario'}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm">{m.mensaje}</p>
                  <p className={`mt-1 text-[10px] ${propio ? 'text-prism-100/70' : 'text-slate-500'}`}>
                    {formatearHora(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <p className="border-t border-rose-500/20 bg-rose-500/10 px-4 py-1.5 text-xs text-rose-300">{error}</p>
      )}

      {user ? (
        <form onSubmit={enviar} className="flex gap-2 border-t border-white/10 p-2.5">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={500}
            placeholder="Escribe un mensaje..."
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-prism-500/20"
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="rounded-xl bg-prism-500 px-4 py-1.5 text-sm font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:opacity-50"
          >
            {enviando ? '...' : 'Enviar'}
          </button>
        </form>
      ) : (
        <div className="border-t border-white/10 p-2.5 text-center text-sm text-slate-400">
          <Link href="/login" className="font-semibold text-prism-300 hover:text-prism-200 hover:underline">
            Inicia sesión
          </Link>{' '}
          para escribir en el chat.
        </div>
      )}
    </div>
  );
}
