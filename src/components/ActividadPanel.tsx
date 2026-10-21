'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Avatar from '@/components/Avatar';
import PerfilHover from '@/components/PerfilHover';
import {
  Actividad,
  PerfilActividad,
  formatoSoles,
  nombreDe,
  tiempoRelativo,
} from '@/lib/actividades';
import type { RolDota } from '@/lib/types';

const SELECT_EMBED =
  'id, tipo, emisor_id, receptor_id, monto, descripcion, creado_en, ' +
  'emisor:profiles!actividades_emisor_id_fkey(nick, steam_avatar_url, steam_nombre, mmr, roles_preferidos), ' +
  'receptor:profiles!actividades_receptor_id_fkey(nick, steam_avatar_url, steam_nombre, mmr, roles_preferidos)';

/**
 * Avatar del feed con la tarjeta de jugador (y el botón de donar) al pasar el
 * cursor, igual que en las salas y el chat.
 */
function TarjetaActividad({
  id,
  nick,
  avatar,
  perfil,
}: {
  id: string | null;
  nick: string;
  avatar: string | null;
  perfil?: PerfilActividad | null;
}) {
  if (!id) {
    return <Avatar nick={nick} src={avatar} size="xs" />;
  }

  return (
    <PerfilHover
      usuario={{
        id,
        nick,
        steam_avatar_url: avatar,
        steam_nombre: perfil?.steam_nombre ?? null,
        mmr: perfil?.mmr ?? null,
        roles_preferidos: perfil?.roles_preferidos ?? null,
      }}
      className="inline-block shrink-0"
    >
      <Link
        href={`/jugadores/${id}`}
        aria-label={`Ver perfil de ${nick}`}
        className="block rounded-full transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400"
      >
        <Avatar nick={nick} src={avatar} size="xs" />
      </Link>
    </PerfilHover>
  );
}

/**
 * Panel público de actividades del landing.
 *
 * Muestra las donaciones y las multas más recientes. Se actualiza solo con
 * Realtime y tiene un refresco de respaldo por si el socket se cae.
 */
export default function ActividadPanel({ compacto = false }: { compacto?: boolean }) {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const limite = compacto ? 6 : 12;

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

    const perfiles: Record<
      string,
      {
        nick: string | null;
        steam_avatar_url: string | null;
        steam_nombre?: string | null;
        mmr?: number | null;
        roles_preferidos?: RolDota[] | null;
      }
    > = {};
    if (ids.length > 0) {
      const res = await supabase
        .from('profiles')
        .select('id, nick, steam_avatar_url, steam_nombre, mmr, roles_preferidos')
        .in('id', ids);
      for (const perfil of res.data ?? []) {
        perfiles[perfil.id] = {
          nick: perfil.nick,
          steam_avatar_url: perfil.steam_avatar_url,
          steam_nombre: perfil.steam_nombre,
          mmr: perfil.mmr,
          roles_preferidos: perfil.roles_preferidos,
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
      className={`arena-card overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-arena-soft ${
        compacto ? 'p-4' : 'p-5'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]`}
          aria-hidden="true"
        />
        <h2
          className={`font-display font-bold tracking-tight text-white ${
            compacto ? 'text-sm' : 'text-base'
          }`}
        >
          Actividad reciente
        </h2>
        {!compacto && (
          <p className="text-sm text-slate-400">Donaciones y multas de la comunidad.</p>
        )}
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
        <ul className={`space-y-1.5 ${compacto ? 'max-h-[calc(100vh-20rem)] overflow-y-auto pr-1' : ''}`}>
          {actividades.map((actividad) => {
            const esMulta = actividad.tipo === 'multa';
            const donante = nombreDe(actividad.emisor);
            const receptor = nombreDe(actividad.receptor);

            return (
              <li
                key={actividad.id}
                className="group flex gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-2.5 py-2 transition hover:border-white/10 hover:bg-white/[0.05]"
              >
                <div className="flex -space-x-1.5 pt-0.5">
                  {esMulta ? (
                    <TarjetaActividad
                      id={actividad.receptor_id}
                      nick={receptor}
                      avatar={actividad.receptor?.steam_avatar_url ?? null}
                      perfil={actividad.receptor}
                    />
                  ) : (
                    <>
                      <TarjetaActividad
                        id={actividad.emisor_id}
                        nick={donante}
                        avatar={actividad.emisor?.steam_avatar_url ?? null}
                        perfil={actividad.emisor}
                      />
                      <TarjetaActividad
                        id={actividad.receptor_id}
                        nick={receptor}
                        avatar={actividad.receptor?.steam_avatar_url ?? null}
                        perfil={actividad.receptor}
                      />
                    </>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[12px] leading-snug text-slate-300">
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
                    <p className="mt-0.5 line-clamp-2 text-[11px] italic leading-snug text-slate-500">
                      “{actividad.descripcion}”
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-slate-600">
                    {tiempoRelativo(actividad.creado_en)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
