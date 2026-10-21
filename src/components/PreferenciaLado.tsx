'use client';

/**
 * Chip con la preferencia informativa de lado de un jugador
 * (1 = Radiant, 2 = Dire). Solo aparece durante la fase de picks.
 */
export default function PreferenciaLado({
  equipo,
  className = '',
}: {
  equipo?: number | null;
  className?: string;
}) {
  if (!equipo) return null;

  const radiant = equipo === 1;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
        radiant
          ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/25'
          : 'bg-rose-500/10 text-rose-300 ring-rose-500/25'
      } ${className}`}
      title={radiant ? 'Prefiere Radiant' : 'Prefiere Dire'}
    >
      <span aria-hidden="true">{radiant ? '☀' : '☾'}</span>
      Quiere {radiant ? 'Radiant' : 'Dire'}
    </span>
  );
}
