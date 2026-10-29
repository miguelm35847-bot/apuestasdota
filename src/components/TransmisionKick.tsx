const CANAL = 'kodigodota';

export default function TransmisionKick() {
  return (
    <section data-kick-panel aria-labelledby="kick-titulo" className="arena-card mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-arena-soft">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <h2 id="kick-titulo" className="font-display text-sm font-bold tracking-tight text-white">Transmisión de Kick</h2>
        <span className="font-mono text-xs font-bold tracking-wider text-[#53fc18]">KICK</span>
      </div>
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={`https://player.kick.com/${CANAL}?autoplay=false&muted=true`}
          title="Transmisión de KódigoDota en Kick"
          width="1280"
          height="720"
          loading="lazy"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <a href={`https://kick.com/${CANAL}`} target="_blank" rel="noopener noreferrer"
        aria-label="Ver el canal KódigoDota en Kick (abre en otra pestaña)"
        className="flex min-h-11 items-center justify-between gap-2 px-4 py-3 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-[#53fc18] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#53fc18]">
        <span>@{CANAL}</span><span>Ver canal <span aria-hidden="true">↗</span></span>
      </a>
    </section>
  );
}
