'use client';

import { useEffect, useState } from 'react';
import Avatar from '@/components/Avatar';

export type JugadorMoneda = {
  id: string;
  nick: string | null;
  steam_avatar_url: string | null;
};

type Props = {
  ganador: JugadorMoneda | null;
  rival: JugadorMoneda | null;
};

/**
 * Moneda del sorteo 1v1: gira y cae en la cara del ganador, con el avatar de
 * los dos jugadores en cada cara.
 */
export default function MonedaSorteo({ ganador, rival }: Props) {
  const [terminado, setTerminado] = useState(false);

  useEffect(() => {
    const temporizador = setTimeout(() => setTerminado(true), 1900);
    return () => clearTimeout(temporizador);
  }, []);

  if (!ganador) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-24 w-24" style={{ perspective: '900px' }}>
        <div
          className={`relative h-full w-full ${terminado ? '' : 'moneda-giro'}`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full border border-amber-300/50 bg-[radial-gradient(circle_at_30%_25%,rgba(251,191,36,0.38),rgba(120,53,15,0.35))] shadow-[0_0_28px_-6px_rgba(251,191,36,0.75)]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <Avatar
              nick={ganador.nick}
              src={ganador.steam_avatar_url}
              size="lg"
              ringClass="ring-2 ring-amber-200/40"
            />
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full border border-white/15 bg-white/5"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <Avatar
              nick={rival?.nick}
              src={rival?.steam_avatar_url}
              size="lg"
              ringClass="ring-2 ring-white/15"
            />
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-amber-200">
        {terminado ? (
          <>
            🪙 ¡Gana <strong>{ganador.nick ?? 'el jugador'}</strong>!
          </>
        ) : (
          <>🪙 La moneda está girando…</>
        )}
      </p>
    </div>
  );
}
