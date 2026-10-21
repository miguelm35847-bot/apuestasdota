'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { sincronizarSteam } from '@/lib/steamClient';
import NotificationBell from '@/components/NotificationBell';
import Avatar from '@/components/Avatar';

/**
 * Menú superior único de la aplicación.
 * Mantiene saldo, campana y un menú desplegable de perfil con las acciones secundarias.
 * `titulo` permite identificar la página (ej: "Salas de Dota 2").
 */
export default function Navbar({ titulo }: { titulo?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [saldo, setSaldo] = useState<number | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [nick, setNick] = useState<string | null>(null);
  const [steamAvatar, setSteamAvatar] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [hash, setHash] = useState('');

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [pathname]);

  const cargarSaldo = useCallback(async () => {
    const { data, error } = await supabase.rpc('mi_saldo');
    if (!error && data !== null) setSaldo(data as number);
  }, []);

  const cargarPerfil = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('nick, steam_nombre, steam_avatar_url')
      .eq('id', user.id)
      .single();

    if (!data) return;

    if (data.nick) setNick(data.nick);
    setSteamAvatar(data.steam_avatar_url ?? null);

    // Sincroniza una sola vez las cuentas antiguas que aún no tienen avatar
    if (data.steam_nombre && !data.steam_avatar_url) {
      const resumen = await sincronizarSteam();
      if (resumen) {
        setSteamAvatar(resumen.avatarUrl);
        if (resumen.avatarUrl) window.dispatchEvent(new Event('perfil:refresh'));
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del saldo
    cargarSaldo();
    supabase.rpc('es_admin').then(({ data }) => setEsAdmin(data === true));
    cargarPerfil();

    // Refresca el saldo cada 15 segundos y al volver a la pestaña
    const interval = setInterval(cargarSaldo, 15000);
    const onFocus = () => cargarSaldo();
    const onRefresh = () => cargarSaldo();

    window.addEventListener('focus', onFocus);
    window.addEventListener('saldo:refresh', onRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('saldo:refresh', onRefresh);
    };
  }, [user, cargarSaldo, cargarPerfil]);

  useEffect(() => {
    const onPerfilRefresh = () => {
      void cargarPerfil();
    };

    window.addEventListener('perfil:refresh', onPerfilRefresh);
    return () => window.removeEventListener('perfil:refresh', onPerfilRefresh);
  }, [cargarPerfil]);

  useEffect(() => {
    if (!menuAbierto) return;

    function cerrarAlHacerClic(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAbierto(false);
      }
    }

    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuAbierto(false);
    }

    document.addEventListener('mousedown', cerrarAlHacerClic);
    document.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.removeEventListener('mousedown', cerrarAlHacerClic);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [menuAbierto]);

  async function cerrarSesion() {
    setMenuAbierto(false);
    await supabase.auth.signOut();
    setSaldo(null);
    setEsAdmin(false);
    setNick(null);
    setSteamAvatar(null);
    router.push('/');
  }

  const nickMostrado =
    nick ||
    (typeof user?.user_metadata?.nick === 'string' ? user.user_metadata.nick : '') ||
    user?.email?.split('@')[0] ||
    'Jugador';
  const enHistorial = pathname === '/salas/historial';
  const enReglas = pathname === '/como-jugar' && hash === '#reglas';
  const enComoJugar = pathname === '/como-jugar' && !enReglas;

  return (
    <nav className="arena-nav sticky top-0 z-40 border-b border-white/10 bg-[#05070c]/95 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.04)]">
      <div className="relative mx-auto flex h-16 max-w-[1760px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:h-[72px] lg:px-8">
        <div className="flex min-w-0 items-center">
          <Link href="/" className="flex max-w-[46vw] min-w-0 items-center gap-2.5 sm:max-w-none">
            <Image
              src="/kodigodota-mark.svg"
              alt=""
              width={36}
              height={34}
              aria-hidden="true"
              className="h-7 w-auto shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.12)] sm:h-8"
            />
            <span className="font-display truncate text-[15px] font-extrabold tracking-[-0.03em] text-white sm:text-lg md:max-w-[280px] xl:max-w-[420px]">
              {titulo ?? 'KódigoDota'}
            </span>
          </Link>
        </div>

        <nav
          aria-label="Enlaces de la arena"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 md:flex"
        >
          <Link
            href="/como-jugar"
            aria-current={enComoJugar ? 'page' : undefined}
            className={`hidden rounded-full px-3 py-2 text-sm font-semibold transition lg:inline-flex ${
              enComoJugar
                ? 'bg-white/10 text-white ring-1 ring-inset ring-white/10'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            Cómo jugar
          </Link>
          <Link
            href="/como-jugar#reglas"
            aria-current={enReglas ? 'page' : undefined}
            className={`hidden rounded-full px-3 py-2 text-sm font-semibold transition lg:inline-flex ${
              enReglas
                ? 'bg-white/10 text-white ring-1 ring-inset ring-white/10'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            Reglas
          </Link>
          <Link
            href="/salas/historial"
            aria-current={enHistorial ? 'page' : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              enHistorial
                ? 'bg-white/10 text-white ring-1 ring-inset ring-white/10'
                : 'text-slate-200 hover:bg-white/5 hover:text-white'
            }`}
          >
            Historial
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              <Link
                href="/recargar"
                title="Recargar saldo"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:px-3"
              >
                <span className="hidden text-xs font-medium text-slate-400 sm:inline">Saldo</span>
                <span className="tabular-nums">
                  S/ {saldo !== null ? (saldo / 100).toFixed(2) : '...'}
                </span>
                <span className="hidden h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-sm font-bold leading-none text-[#0a0e17] sm:flex">
                  +
                </span>
              </Link>

              <NotificationBell />

              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuAbierto((abierto) => !abierto)}
                  aria-expanded={menuAbierto}
                  aria-controls="menu-perfil"
                  aria-label="Abrir menú de perfil"
                  className="flex items-center gap-2 rounded-full border border-transparent p-1 pr-2 transition hover:border-white/10 hover:bg-white/5"
                >
                  <Avatar nick={nickMostrado} src={steamAvatar} size="nav" />
                  <span className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-200 sm:inline">
                    {nickMostrado}
                  </span>
                  {esAdmin && (
                    <span className="hidden rounded-full bg-prism-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-prism-200 ring-1 ring-inset ring-prism-500/30 lg:inline">
                      Admin
                    </span>
                  )}
                  <span
                    className={`text-[10px] text-slate-500 transition-transform ${
                      menuAbierto ? 'rotate-180' : ''
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {menuAbierto && (
                  <div
                    id="menu-perfil"
                    className="arena-card absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-arena"
                  >
                    <div className="border-b border-white/10 bg-gradient-to-br from-prism-500/15 via-[#111827] to-[#111827] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar nick={nickMostrado} src={steamAvatar} size="lg" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-white">{nickMostrado}</p>
                            {esAdmin && (
                              <span className="rounded-full bg-prism-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-prism-200 ring-1 ring-inset ring-prism-500/30">
                                Admin
                              </span>
                            )}
                          </div>
                          {user.email && (
                            <p className="mt-0.5 truncate text-xs text-slate-400">{user.email}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5">
                      <Link
                        href="/perfil"
                        onClick={() => setMenuAbierto(false)}
                        className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                      >
                        Mi perfil
                      </Link>
                      <Link
                        href={`/jugadores/${user.id}`}
                        onClick={() => setMenuAbierto(false)}
                        className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                      >
                        Perfil público
                      </Link>
                      <Link
                        href="/recargar"
                        onClick={() => setMenuAbierto(false)}
                        className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                      >
                        Recargar saldo
                      </Link>
                      <Link
                        href="/retirar"
                        onClick={() => setMenuAbierto(false)}
                        className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                      >
                        Retirar
                      </Link>
                      <Link
                        href="/salas/historial"
                        onClick={() => setMenuAbierto(false)}
                        className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                      >
                        Historial
                      </Link>
                    </div>

                    {esAdmin && (
                      <>
                        <div className="border-t border-white/10" />
                        <div className="p-1.5">
                          <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Administración
                          </p>
                          <Link
                            href="/admin"
                            onClick={() => setMenuAbierto(false)}
                            className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                          >
                            Panel admin
                          </Link>
                          <Link
                            href="/admin/recargas"
                            onClick={() => setMenuAbierto(false)}
                            className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                          >
                            Recargas
                          </Link>
                          <Link
                            href="/admin/retiros"
                            onClick={() => setMenuAbierto(false)}
                            className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                          >
                            Retiros
                          </Link>
                          <Link
                            href="/admin/jugadores"
                            onClick={() => setMenuAbierto(false)}
                            className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                          >
                            Jugadores y MMR
                          </Link>
                        </div>
                      </>
                    )}

                    <div className="border-t border-white/10 p-1.5">
                      <button
                        type="button"
                        onClick={cerrarSesion}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-[13px] font-semibold text-slate-200 transition hover:bg-white/10 sm:px-4 sm:text-sm"
              >
                <span className="sm:hidden">Entrar</span>
                <span className="hidden sm:inline">Iniciar sesión</span>
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-white px-2.5 py-2 text-[13px] font-bold text-[#070a10] shadow-[0_0_32px_-14px_rgba(255,255,255,0.7)] transition hover:bg-slate-200 sm:px-4 sm:text-sm"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
