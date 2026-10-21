'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthProvider';
import { useArenaBody } from '@/lib/useArenaBody';

type IconoNombre =
  | 'user'
  | 'steam'
  | 'medal'
  | 'wallet'
  | 'door'
  | 'picks'
  | 'game'
  | 'trophy'
  | 'shield'
  | 'pause'
  | 'clock'
  | 'alert'
  | 'disconnect'
  | 'flag'
  | 'check'
  | 'arrow'
  | 'book';

const ICONOS: Record<IconoNombre, ReactNode> = {
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  steam: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M4 8h15" />
      <path d="M15 13h6" />
      <circle cx="18" cy="13" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  door: (
    <>
      <path d="M4 21h16" />
      <path d="M6 21V4h9v17" />
      <path d="M15 12h.01" />
    </>
  ),
  picks: (
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="m3 6 1 1 2-2" />
      <path d="m3 12 1 1 2-2" />
      <path d="m3 18 1 1 2-2" />
    </>
  ),
  game: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 12h4" />
      <path d="M9 10v4" />
      <path d="M16 11h.01" />
      <path d="M18 13h.01" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v2a4 4 0 0 0 4 4" />
      <path d="M17 6h3v2a4 4 0 0 1-4 4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.5 3 7.5 7.5 9.5 4.5-2 7.5-5 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  pause: (
    <>
      <rect x="7" y="5" width="3" height="14" rx="1" />
      <rect x="14" y="5" width="3" height="14" rx="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  disconnect: (
    <>
      <path d="M9 3v6" />
      <path d="M15 3v6" />
      <path d="M6 9h12v3a6 6 0 0 1-12 0V9Z" />
      <path d="m4 4 16 16" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-1.5 4L16 12H5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  book: (
    <>
      <path d="M4 4h7a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4V4Z" />
      <path d="M20 4h-3a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h3V4Z" />
    </>
  ),
};

function Icono({
  nombre,
  className = 'h-5 w-5',
}: {
  nombre: IconoNombre;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONOS[nombre]}
    </svg>
  );
}

const PASOS: { titulo: string; texto: string; nota?: string; icono: IconoNombre }[] = [
  {
    titulo: 'Crea tu cuenta y vincula Steam',
    texto:
      'Regístrate y vincula tu cuenta de Steam. La usarás para entrar al lobby y validar tu identidad.',
    nota: 'La vinculación con Steam es obligatoria para unirte a una sala.',
    icono: 'steam',
  },
  {
    titulo: 'Registra tu MMR real y tus roles',
    texto:
      'Tu MMR se registra una sola vez y es público. Elige hasta 3 roles para que los capitanes sepan dónde juegas mejor.',
    nota: 'Después del primer registro, solo un admin puede corregir el MMR.',
    icono: 'medal',
  },
  {
    titulo: 'Carga saldo por Yape o Plin',
    texto:
      'Envía tu recarga con el número de operación y la captura. El admin la revisa y la aprueba desde el panel.',
    nota: 'Cuando se apruebe, el saldo aparecerá en tu billetera.',
    icono: 'wallet',
  },
  {
    titulo: 'Elige una sala 1v1 o 5v5',
    texto:
      'Revisa la cuota, el premio estimado y los jugadores. Al unirte se descuenta la cuota y entras a la lista de espera.',
    nota: 'Puedes elegir entre salas 1v1 y 5v5, según la modalidad disponible.',
    icono: 'door',
  },
  {
    titulo: 'Espera los equipos y los picks',
    texto:
      'Cuando la sala se llena, se definen los equipos y comienza la fase de picks. En 5v5 los capitanes eligen en orden; en 1v1 se sortea el lado.',
    nota: 'Durante los picks se aplican las reglas de pausas y tolerancias.',
    icono: 'picks',
  },
  {
    titulo: 'Entra al lobby y juega',
    texto:
      'El nombre y la clave del lobby se comparten en la sala. Ingresa a Dota 2 con tu cuenta de Steam y juega con tu equipo.',
    nota: 'Respeta las pausas, los tiempos y las indicaciones de KódigoDota o de un administrador.',
    icono: 'game',
  },
  {
    titulo: 'Cierre y premio',
    texto:
      'Al terminar, se registra el ganador y se reparte el pozo. El premio se acredita según la cuota y la comisión de la sala.',
    nota: 'Puedes revisar tus movimientos y retirar tu saldo desde la billetera.',
    icono: 'trophy',
  },
];

const CHECKLIST = [
  'Cuenta con Steam vinculada',
  'MMR real registrado',
  'Saldo suficiente para la cuota',
  'Dota 2 y cuenta de Steam listas',
  'Reglas de pausas y penalidades leídas',
];

const REGLAS: {
  titulo: string;
  texto: string;
  detalle?: string;
  icono: IconoNombre;
}[] = [
  {
    titulo: 'MMR real, sin mentiras',
    texto: 'Si mientes con tu MMR, se te penalizará toda la apuesta.',
    detalle:
      'Tu MMR debe reflejar tu nivel real. La honestidad mantiene el balance de las salas.',
    icono: 'shield',
  },
  {
    titulo: 'Pausas durante los picks',
    texto: 'Una vez en proceso de picks, se permite pausa de 2 minutos por equipo.',
    detalle: 'Aplica únicamente durante la fase de picks.',
    icono: 'pause',
  },
  {
    titulo: 'Pausas de KódigoDota o un administrador',
    texto: 'KódigoDota o un administrador pueden hacer pausas ilimitadas si justifican hacerlo.',
    detalle: 'KódigoDota o un administrador cumplen el rol de anfitrión/admin de la sala.',
    icono: 'flag',
  },
  {
    titulo: 'Sin respuesta en picks',
    texto:
      'En proceso de picks, si un jugador no responde o no sugiere sus picks, se le dará una tolerancia de 2 minutos. Pasado el tiempo, se hará RMK y se le penalizará con el 50% de la casada para el pozo.',
    detalle: 'RMK significa remake. La penalización se destina al pozo de la sala.',
    icono: 'clock',
  },
  {
    titulo: 'Desconexiones después de picks',
    texto:
      'Una vez culminada la fase de picks y empiece la partida, cada equipo tiene una tolerancia de 10 minutos en caso de desconexiones.',
    detalle: 'La tolerancia se aplica durante la partida, después de los picks.',
    icono: 'disconnect',
  },
  {
    titulo: 'Cada pausa vale 1 minuto',
    texto:
      'Cada pausa realizada se considera como 1 minuto, aunque no haya superado el tiempo de 1 minuto.',
    detalle: 'El tiempo se contabiliza por pausa, no por su duración real.',
    icono: 'clock',
  },
  {
    titulo: 'Desconexión antes de 10 minutos',
    texto:
      'Si un jugador se desconecta antes de los 10 minutos de partida, será penalizado con la casada completa, que se repartirá en el equipo contrario.',
    detalle: 'La casada completa del jugador se reparte en el equipo contrario.',
    icono: 'alert',
  },
  {
    titulo: 'Nada de pausas en plena TF',
    texto:
      'No se permite pausar en plena TF, a menos que haya una desconexión. Si un jugador lo hace, tendrá una penalización del 10% de su casada o de lo que gane.',
    detalle:
      'TF significa teamfight. La penalización se aplica sobre la casada o la ganancia, según corresponda.',
    icono: 'pause',
  },
  {
    titulo: 'No quites pausas',
    texto:
      'No está permitido quitar pausas, a menos que el motivo de la pausa ya se haya solucionado.',
    detalle: 'Si la causa sigue pendiente, la pausa se mantiene.',
    icono: 'shield',
  },
];

const RESUMEN = [
  { etiqueta: 'Pausa por equipo en picks', valor: '2 min' },
  { etiqueta: 'Tolerancia sin picks', valor: '2 min' },
  { etiqueta: 'Sin picks tras tolerancia', valor: 'RMK + 50%' },
  { etiqueta: 'Desconexiones por equipo', valor: '10 min' },
  { etiqueta: 'Cada pausa cuenta', valor: '1 min' },
  { etiqueta: 'Desconexión antes de 10 min', valor: 'Casada completa' },
  { etiqueta: 'Pausa en TF sin desconexión', valor: '10%' },
  { etiqueta: 'MMR falso', valor: 'Toda la apuesta' },
  { etiqueta: 'Pausas de KódigoDota o un administrador', valor: 'Ilimitadas' },
];

const CHIPS = ['Salas 1v1 y 5v5', 'Yape / Plin', 'MMR real', 'Premios'];

export default function ComoJugarPage() {
  useArenaBody();
  const { user } = useAuth();
  const ctaHref = user ? '/#salas' : '/register';
  const ctaLabel = user ? 'Ver salas activas' : 'Crear cuenta';

  return (
    <div className="arena-shell min-h-screen bg-[#0a0e17] text-slate-100">
      <Navbar titulo="Cómo jugar" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111827] p-6 shadow-arena-soft sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(99,102,241,0.16),transparent_58%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl"
          />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-prism-200">
              <Icono nombre="book" className="h-3.5 w-3.5" />
              Guía KódigoDota
            </span>

            <h1 className="mt-4 max-w-3xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Cómo jugar en <span className="text-prism-300">KódigoDota</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Tu ruta desde la cuenta hasta el premio: Steam, MMR, saldo, sala, picks y cierre.
              Antes de entrar, revisa las reglas de pausas y penalidades.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#070a10] shadow-[0_0_32px_-14px_rgba(255,255,255,0.7)] transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {ctaLabel}
                <Icono nombre="arrow" className="h-4 w-4" />
              </Link>
              <a
                href="#reglas"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-500/40"
              >
                Ver reglas
              </a>
            </div>
          </div>
        </header>

        <nav aria-label="Contenido de la guía" className="mt-5 flex flex-wrap gap-2">
          <a
            href="#como-jugar"
            className="inline-flex items-center gap-2 rounded-full border border-prism-500/20 bg-prism-500/10 px-3.5 py-2 text-xs font-semibold text-prism-200 transition hover:border-prism-400/40 hover:bg-prism-500/15"
          >
            <Icono nombre="picks" className="h-4 w-4" />
            Cómo jugar
          </a>
          <a
            href="#reglas"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <Icono nombre="shield" className="h-4 w-4" />
            Reglas
          </a>
        </nav>

        <section id="como-jugar" className="mt-8 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-prism-300/80">
                Paso a paso
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">
                De la cuenta al premio
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                Siete pasos para entrar a tu primera sala y jugar con todo claro.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
              7 pasos
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PASOS.map((paso, index) => (
              <article
                key={paso.titulo}
                className="arena-card group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft transition hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-prism-500/10 text-prism-200 ring-1 ring-inset ring-prism-500/20">
                    <Icono nombre={paso.icono} />
                  </span>
                  <span className="font-display text-2xl font-bold text-white/10">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-white">{paso.titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{paso.texto}</p>
                {paso.nota && (
                  <p className="mt-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-slate-400">
                    {paso.nota}
                  </p>
                )}
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft">
              <h3 className="font-display text-lg font-bold text-white">Antes de entrar</h3>
              <p className="mt-1 text-sm text-slate-400">
                Revisa esta lista para evitar contratiempos al unirte.
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {CHECKLIST.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                      <Icono nombre="check" className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="arena-card rounded-2xl border border-prism-500/20 bg-gradient-to-br from-prism-500/10 via-[#111827] to-[#111827] p-5 shadow-arena-soft">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-prism-300/80">
                ¿Listo para jugar?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Entra a una sala activa, revisa la cuota y asegúrate de tener saldo.
              </p>
              <Link
                href={ctaHref}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#070a10] transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {ctaLabel}
                <Icono nombre="arrow" className="h-4 w-4" />
              </Link>
              <Link
                href={user ? '/recargar' : '/register'}
                className="mt-2 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-500/40"
              >
                {user ? 'Cargar saldo' : 'Crear cuenta'}
              </Link>
            </div>
          </div>
        </section>

        <section id="reglas" className="mt-10 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/80">
                Reglas de la arena
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">
                Juego limpio, tiempos claros
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                Estas reglas aplican a todas las salas. Leerlas antes de entrar evita
                penalidades y malentendidos.
              </p>
            </div>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              9 reglas
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="arena-card overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-arena-soft">
              {REGLAS.map((regla, index) => (
                <article
                  key={regla.titulo}
                  className={`flex gap-4 p-5 ${
                    index > 0 ? 'border-t border-white/10' : ''
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 font-display text-sm font-bold text-slate-300 ring-1 ring-inset ring-white/10">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-prism-300">
                        <Icono nombre={regla.icono} className="h-4 w-4" />
                      </span>
                      <h3 className="font-display text-base font-bold text-white sm:text-lg">
                        {regla.titulo}
                      </h3>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">{regla.texto}</p>
                    {regla.detalle && (
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {regla.detalle}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <aside className="h-fit space-y-3 lg:sticky lg:top-24">
              <div className="arena-card rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-arena-soft">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300/80">
                  Resumen rápido
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-white">
                  Tiempos y penalidades
                </h3>
                <dl className="mt-3 divide-y divide-white/10 text-sm">
                  {RESUMEN.map((item) => (
                    <div
                      key={item.etiqueta}
                      className="flex items-start justify-between gap-3 py-2.5"
                    >
                      <dt className="text-slate-400">{item.etiqueta}</dt>
                      <dd className="shrink-0 text-right font-semibold text-white">
                        {item.valor}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  KódigoDota o un administrador deben justificar cada pausa. Las penalidades se aplican
                  según la regla correspondiente.
                </p>
              </div>

              <div className="arena-card rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5 shadow-arena-soft">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/20">
                    <Icono nombre="flag" className="h-4 w-4" />
                  </span>
                  <p className="font-display text-base font-bold text-amber-200">
                    KódigoDota o un administrador
                  </p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-amber-100/70">
                  Actúan como anfitriones/administradores de la sala. Pueden hacer pausas
                  ilimitadas si justifican el motivo y velan por el cumplimiento de estas reglas.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-prism-500/10 via-[#111827] to-[#111827] p-6 text-center shadow-arena-soft">
          <h2 className="font-display text-2xl font-bold text-white">
            ¿Listo para tu primera partida?
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-sm text-slate-400">
            Crea tu cuenta, carga saldo y entra a una sala 1v1 o 5v5. Si tienes dudas,
            revisa las reglas o pregunta en la sala antes de empezar.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#070a10] transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {ctaLabel}
              <Icono nombre="arrow" className="h-4 w-4" />
            </Link>
            <a
              href="#reglas"
              className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-500/40"
            >
              Repasar reglas
            </a>
          </div>
        </section>
      </main>

      <footer className="arena-footer mt-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-6 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          <p className="font-semibold text-slate-400">
            KódigoDota · Plataforma de salas de juego
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
            <Link href="/" className="transition hover:text-slate-300">
              Inicio
            </Link>
            <Link href="/como-jugar" className="transition hover:text-slate-300">
              Cómo jugar
            </Link>
            <Link href="/como-jugar#reglas" className="transition hover:text-slate-300">
              Reglas
            </Link>
            <Link href="/salas/historial" className="transition hover:text-slate-300">
              Historial
            </Link>
          </div>
          <p className="text-xs text-slate-600">Pagos con Yape o Plin</p>
        </div>
      </footer>
    </div>
  );
}
