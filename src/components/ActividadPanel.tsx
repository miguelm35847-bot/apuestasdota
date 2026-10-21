'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Avatar from '@/components/Avatar';
import {
  Actividad,
  formatoSoles,
  nombreDe,
  tiempoRelativo,
} from '@/lib/actividades';

const SELECT_EMBED =
  'id, tipo, emisor_id, receptor_id, monto, descripcion, creado_en, ' +
  'emisor:profiles!actividades_emisor_id_fkey(nick, steam_avatar_url), ' +
  'receptor:profiles!actividades_receptor_id_fkey(nick, steam_avatar_url)';

/**
 * Panel público de actividades del landing.
 *
 * Muestra las donaciones y las multas más recientes. Se actualiza solo con
 * Realtime y tiene un refresco de respaldo por si el socket se cae.
 */
export default function ActividadPanel({ compacto = false }: { compacto?: boolean }) {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const limite = compacto ? 8 : 12;

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('actividades')
      .select(SELECT_EMBED)
      .order('creado_en', { ascending: false })
      .limit(limite);

    if (!error && data) {
      setActividades(data as unknown as Actividad[]);
      setCargando(false);
      return;
    }

    // Respaldo: si el embed con los perfiles falla, se leen por separado.
    const simple = await supabase
      .from('actividades')
      .select('id, tipo, emisor_id, receptor_id, monto, descripcion, creado_en')
      .order('creado_en', { ascending: false })
      .limit(limite);

    if (simple.error) {
      setCargando(false);
      return;
    }

    const ids = [
      ...new Set(
        (simple.data ?? [])
          .flatMap((a) => [a.emisor_id, a.receptor_id])
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const perfiles: Record<string, { nick: string | null; steam_avatar_url: string | null }> = {};
    if (ids.length > 0) {
      const res = await supabase
        .from('profiles')
        .select('id, nick, steam_avatar_url')
        .in('id', ids);
      for (const perfil of res.data ?? []) {
        perfiles[perfil.id] = {
          nick: perfil.nick,
          steam_avatar_url: perfil.steam_avatar_url,
        };
      }
    }

    setActividades(
      (simple.data ?? []).map((a) => ({
        ...a,
        emisor: a.emisor_id ? (perfiles[a.emisor_id] ?? null) : null,
        receptor: a.receptor_id ? (perfiles[a.receptor_id] ?? null) : null,
      })) as Actividad[]
    );
    setCargando(false);
  }, [limite]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    void cargar();

    const channel = supabase
      .channel('actividad_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'actividades' },
        () => {
          void cargar();
        }
      )
      .subscribe();

    // Respaldo por si Realtime se cae
    const interval = setInterval(() => void cargar(), 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [cargar]);

  return (
    <section
      className={`arena-card rounded-2xl border border-white/10 bg-[#111827] shadow-arena-soft ${
        compacto ? 'p-4' : 'p-5'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            className={`font-display font-bold tracking-tight text-white ${
              compacto ? 'text-sm' : 'text-base'
            }`}
          >
            Actividad reciente
          </h2>
          {!compacto && (
            <p className="mt-0.5 text-sm text-slate-400">
              Donaciones y multas de la comunidad, en vivo.
            </p>
          )}
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-400 ring-1 ring-inset ring-white/10">
          En vivo
        </span>
      </div>

      {cargando ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : actividades.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-300">Todavía no hay actividad</p>
          <p className="mt-1 text-xs text-slate-500">
            Las primeras donaciones y multas aparecerán aquí al instante.
          </p>
        </div>
      ) : (
        <ul className={`space-y-2 ${compacto ? 'max-h-[calc(100vh-19rem)] overflow-y-auto pr-1' : ''}`}>
          {actividades.map((actividad) => {
            const esMulta = actividad.tipo === 'multa';
            const donante = nombreDe(actividad.emisor);
            const receptor = nombreDe(actividad.receptor);

            return (
              <li
                key={actividad.id}
                className={`flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] ${
                  compacto ? 'px-2.5 py-2' : 'px-3 py-2.5'
                }`}
              >
                <div className="flex -space-x-2">
                  {esMulta ? (
                    <Avatar
                      nick={receptor}
                      src={actividad.receptor?.steam_avatar_url ?? null}
                      size={compacto ? 'xs' : 'sm'}
                    />
                  ) : (
                    <>
                      <Avatar
                        nick={donante}
                        src={actividad.emisor?.steam_avatar_url ?? null}
                        size={compacto ? 'xs' : 'sm'}
                      />
                      <Avatar
                        nick={receptor}
                        src={actividad.receptor?.steam_avatar_url ?? null}
                        size={compacto ? 'xs' : 'sm'}
                      />
                    </>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`truncate ${compacto ? 'text-[11px]' : 'text-sm'} text-slate-200`}>
                    {esMulta ? (
                      <>
                        <span className="font-semibold text-white">{receptor}</span>
                        <span className="text-slate-400"> recibió una multa de </span>
                        <span className="font-semibold text-rose-300">
                          {formatoSoles(actividad.monto)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-white">{donante}</span>
                        <span className="text-slate-400"> donó </span>
                        <span className="font-semibold text-emerald-300">
                          {formatoSoles(actividad.monto)}
                        </span>
                        <span className="text-slate-400"> a </span>
                        <span className="font-semibold text-white">{receptor}</span>
                      </>
                    )}
                  </p>
                  {actividad.descripcion && (
                    <p className="truncate text-[11px] text-slate-500">
                      “{actividad.descripcion}”
                    </p>
                  )}
                </div>

                <span className="shrink-0 text-[10px] text-slate-500">
                  {tiempoRelativo(actividad.creado_en)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
