import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CORREO_PRIVACIDAD, RESPONSABLE_PRIVACIDAD } from '@/lib/privacidad';

type SeccionLegal = { id: string; titulo: string; contenido: ReactNode };

type DocumentoLegalProps = {
  titulo: string;
  etiqueta: string;
  introduccion: string;
  fecha: string;
  fechaVisible: string;
  ruta: '/privacidad' | '/terminos';
  secciones: readonly SeccionLegal[];
};

export default function DocumentoLegal({ titulo, etiqueta, introduccion, fecha, fechaVisible, ruta, secciones }: DocumentoLegalProps) {
  return (
    <div className="arena-shell min-h-screen text-slate-100">
      <header className="arena-nav">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-white">
            <Image src="/kodigodota-mark.svg" width={36} height={34} alt="" aria-hidden="true" className="h-8 w-auto" />
            KódigoDota
          </Link>
          <Link href="/" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">Volver al inicio <span aria-hidden="true">↗</span></Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-prism-300">{etiqueta}</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{titulo}</h1>
          <p className="text-base leading-7 text-slate-400">{introduccion}</p>
          <p className="text-xs text-slate-500">Última actualización: <time dateTime={fecha}>{fechaVisible}</time></p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="arena-card rounded-xl border border-white/10 p-5">
            <p className="text-xs font-semibold text-slate-500">Responsable</p>
            <p className="mt-1 font-display text-lg font-semibold text-white">{RESPONSABLE_PRIVACIDAD}</p>
          </div>
          <div className="arena-card rounded-xl border border-prism-400/20 p-5">
            <p className="text-xs font-semibold text-slate-500">Consultas y solicitudes</p>
            <a href={`mailto:${CORREO_PRIVACIDAD}`} className="mt-1 inline-block break-all text-sm font-semibold text-prism-300 underline decoration-prism-400/30 underline-offset-4 transition hover:text-prism-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-prism-400">{CORREO_PRIVACIDAD}</a>
          </div>
        </div>
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
          <nav aria-label={`Contenido: ${titulo}`} className="arena-card rounded-xl border border-white/10 p-5 lg:sticky lg:top-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Contenido</p>
            <ol className="space-y-2.5 text-sm leading-5 text-slate-400">
              {secciones.map(s => <li key={s.id}><a href={`#${s.id}`} className="transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-prism-400">{s.titulo}</a></li>)}
            </ol>
          </nav>
          <article className="min-w-0 rounded-2xl border border-white/10 bg-[#111827] px-5 shadow-arena-soft sm:px-8">
            {secciones.map(s => <section key={s.id} id={s.id} className="scroll-mt-6 space-y-4 border-b border-white/10 py-7 last:border-b-0 sm:py-8">
              <h2 className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">{s.titulo}</h2>
              <div className="space-y-4 text-sm leading-7 text-slate-400">{s.contenido}</div>
            </section>)}
          </article>
        </div>
      </main>
      <footer className="arena-footer px-4 py-6 text-center text-xs text-slate-500">
        <p>KódigoDota · {titulo}</p>
        <nav aria-label="Información legal" className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-prism-300">
          <Link href="/privacidad" aria-current={ruta === '/privacidad' ? 'page' : undefined} className="hover:text-prism-200">Privacidad</Link>
          <Link href="/terminos" aria-current={ruta === '/terminos' ? 'page' : undefined} className="hover:text-prism-200">Términos del servicio</Link>
          <Link href="/" className="hover:text-prism-200">Volver a la plataforma</Link>
        </nav>
      </footer>
    </div>
  );
}
