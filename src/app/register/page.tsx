'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';
import BotonGoogle from '@/components/BotonGoogle';

export default function RegisterPage() {
  const router = useRouter();
  useArenaBody();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nick, setNick] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleCargando, setGoogleCargando] = useState(false);
  const [registrado, setRegistrado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validaciones del lado del cliente
    if (nick.length < 3 || nick.length > 20) {
      setError('El nick debe tener entre 3 y 20 caracteres');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    // Crear usuario en Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nick: nick,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user) {
      if (data.session) { router.push('/'); return; }
      // Registro exitoso
      setRegistrado(true);
      setLoading(false);
    } else {
      setError('Error desconocido');
      setLoading(false);
    }
  }

  if (registrado) return <main className="arena-shell min-h-screen p-8 text-slate-100"><h1 className="text-xl font-bold">Revisa tu correo</h1><p>Confirma tu cuenta para ingresar. También revisa la carpeta de spam.</p><button className="mt-4 rounded-lg bg-white/10 p-3" onClick={async () => { const { error } = await supabase.auth.resend({ type: 'signup', email }); setError(error?.message ?? 'Correo reenviado'); }}>Reenviar confirmación</button><p role="status">{error}</p><Link href="/login">Iniciar sesión</Link></main>;
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
            Crea tu cuenta y entra a la arena
          </p>
        </div>

        <BotonGoogle disabled={loading} onError={setError} onProcesando={setGoogleCargando} />
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="nick" className="block text-sm font-medium text-slate-300">
              Nick (3-20 caracteres)
            </label>
            <input
              id="nick"
              type="text"
              required
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20"
              placeholder="TuNick"
            />
          </div>

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
              Contraseña (mínimo 8 caracteres)
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
            disabled={loading || googleCargando}
            className="w-full rounded-lg bg-prism-500 py-2.5 font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-prism-300 hover:text-prism-200 hover:underline">
            Inicia sesión
          </Link>
        </p>
        <p className="text-center text-xs leading-5 text-slate-500">
          Conoce cómo tratamos tus datos en nuestra <Link href="/privacidad" className="text-prism-300 hover:text-prism-200 hover:underline">Política de privacidad</Link>.
        </p>
      </div>
    </div>
  );
}
