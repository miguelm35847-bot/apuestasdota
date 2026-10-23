export default function SoportePagos({ referencia }: { referencia?: string }) {
  const mensaje = 'Hola Miguel, quisiera consultar el estado de mi recarga o retiro.' + (referencia ? ` Referencia: ${referencia}` : '');
  return (
    <aside aria-label="Soporte de pagos" className="arena-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 p-4 font-sans shadow-arena-soft sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-prism-500/10 text-prism-300 ring-1 ring-inset ring-prism-400/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5" aria-hidden="true">
            <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-1 1v-9.5A8.5 8.5 0 0 1 11.5 3h1a8.5 8.5 0 0 1 8.5 8.5Z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 9h8M8 13h5" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <h2 className="font-display text-sm font-semibold tracking-tight text-white">¿Necesitas ayuda con tu pago?</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">Miguel Rivera <span className="mx-1 text-slate-600">·</span> 949 451 869</p>
        </div>
      </div>
      <a href={`https://wa.me/51949451869?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer"
        className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-prism-400/25 bg-prism-500/10 px-4 py-2.5 text-xs font-semibold text-prism-200 transition hover:bg-prism-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-400/40 sm:w-auto">
        Consultar por WhatsApp
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-3.5 w-3.5" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </a>
    </aside>
  );
}
