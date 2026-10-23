'use client';

import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { ladoApuesta, type Apuesta } from '@/lib/apuestas';

export default function CruceApuesta({ apuesta }: { apuesta: Apuesta }) {
  const usuarios = [
    { id: apuesta.creador_id, perfil: apuesta.creador, equipo: apuesta.equipo_creador },
    { id: apuesta.aceptante_id, perfil: apuesta.aceptante, equipo: apuesta.equipo_creador === 1 ? 2 : 1 },
  ].sort((a, b) => a.equipo - b.equipo);
  return (
    <div data-apuesta-cruce={apuesta.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        {usuarios.map((u, i) => <div key={u.equipo} className="contents">
          {i === 1 && <span className="text-xs font-semibold text-slate-400">vs</span>}
          <div className="min-w-0">
            <Link href={`/jugadores/${u.id}`} className={`flex min-w-0 items-center gap-2 ${i === 1 ? 'flex-row-reverse text-right' : ''}`}>
              <Avatar nick={u.perfil?.nick} src={u.perfil?.steam_avatar_url} size="xs" ringClass={u.equipo === 1 ? 'ring-1 ring-emerald-400' : 'ring-1 ring-rose-400'} />
              <span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-100">{u.perfil?.nick ?? 'Jugador'}</span><span className={`block text-xs leading-5 ${u.equipo === 1 ? 'text-emerald-300' : 'text-rose-300'}`}>{ladoApuesta(u.equipo)}</span></span>
            </Link>
          </div>
        </div>)}
      </div>
      <p className="mt-2 text-center text-xs leading-5 text-slate-400">S/ 5.50 cada uno · {apuesta.estado === 'reembolsada' ? 'Reembolsada' : apuesta.estado === 'liquidada' ? 'Finalizada' : 'Confirmada'}</p>
    </div>
  );
}
