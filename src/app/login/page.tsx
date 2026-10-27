'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import BotonGoogle from '@/components/BotonGoogle';
import BotonSteam from '@/components/BotonSteam';
import { rutaRetornoSegura } from '@/lib/acceso';

export default function LoginPage() {
  useArenaBody();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleCargando, setGoogleCargando] = useState(false);
  const [steamCargando, setSteamCargando] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || googleCargando || steamCargando) return;
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        return;
      }
      setPassword('');
      // Verificar el rol del usuario
      const { data: isAdmin } = await supabase.rpc('es_admin');

      const next = rutaRetornoSegura(new URLSearchParams(window.location.search).get('next'));
      if (next) { router.push(next); return; }
      if (isAdmin === true) {
        router.push('/admin');
      } else {
        // Usuario normal (jugador) - va a la landing
        router.push('/');
      }
    } catch {
      setError('No se pudo iniciar sesión. Inténtalo nuevamente.');
    } finally {
      // Next conserva este formulario al navegar: no dejar la carga pendiente.
      setLoading(false);
    }
  }

  return (
    <div className="arena-shell arena-hero flex min-h-screen items-center justify-center px-4 py-10">
      <div className="arena-card w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-[#111827] p-8 shadow-arena">
        <div>
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-prism-300">
            Arena Dark
          </p>
          <div className="mt-2 flex items-center justify-center gap-2.5">
            <Image
              src="/kodigodota-mark.svg"
              alt=""
              width={36}
              height={34}
              aria-hidden="true"
              className="h-8 w-auto"
            />
            <h1 className="text-center font-display text-3xl font-bold text-white">
              KódigoDota
            </h1>
          </div>
          <p className="mt-2 text-center text-sm text-slate-400">
            Inicia sesión para entrar a la arena
          </p>
        </div>

        <BotonSteam disabled={loading || googleCargando || steamCargando} onError={setError} onProcesando={setSteamCargando} />
        <BotonGoogle disabled={loading || steamCargando} onError={setError} onProcesando={setGoogleCargando} />
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleCargando || steamCargando}
            className="w-full rounded-lg bg-prism-500 py-2.5 font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <a href="/recuperar" className="block text-center text-sm text-prism-300">¿Olvidaste tu contraseña?</a>
        <p className="text-center text-sm text-slate-400">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="font-semibold text-prism-300 hover:text-prism-200 hover:underline">
            Regístrate
          </a>
        </p>
        <p className="text-center text-xs leading-5 text-slate-500">
          Antes de continuar, revisa los <Link href="/terminos" className="text-prism-300 hover:text-prism-200 hover:underline">Términos del servicio</Link> y la <Link href="/privacidad" className="text-prism-300 hover:text-prism-200 hover:underline">Política de privacidad</Link>.
        </p>
      </div>
    </div>
  );
}
