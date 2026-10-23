type Props = { entrada: number; premio: number; className?: string };
export default function ImportesSala({ entrada, premio, className = '' }: Props) {
  return <dl className={`grid grid-cols-2 gap-2.5 ${className}`}>
    <div className="arena-inset min-w-0 rounded-xl border border-white/[0.08] px-3 py-2.5">
      <dt className="text-xs font-medium leading-5 text-slate-400">Entrada</dt>
      <dd className="mt-0.5 font-display text-xl font-semibold leading-7 tabular-nums text-white">S/ {(entrada / 100).toFixed(2)}</dd>
    </div>
    <div className="arena-inset min-w-0 rounded-xl border border-white/[0.08] px-3 py-2.5">
      <dt className="text-xs font-medium leading-5 text-slate-400">Premio por ganador</dt>
      <dd className="mt-0.5 font-display text-xl font-semibold leading-7 tabular-nums text-amber-300">S/ {(premio / 100).toFixed(2)}</dd>
    </div>
  </dl>;
}
