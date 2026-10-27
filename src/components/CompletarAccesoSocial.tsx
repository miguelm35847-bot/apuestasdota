'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cerrarRetornoGoogle, completarAccesoGoogle } from '@/lib/googleAuth';
import { cerrarRetornoSteam, completarAccesoSteam } from '@/lib/steamAuth';
import { necesitaNickSocial, validarNickSocial } from '@/lib/acceso';
import { supabase } from '@/lib/supabase';
import { useArenaBody } from '@/lib/useArenaBody';

type Acceso = { userId: string; next: string | null; vinculo?: boolean };
const PROVEEDORES = { google: { nombre: 'Google', completar: completarAccesoGoogle, cerrar: cerrarRetornoGoogle }, steam: { nombre: 'Steam', completar: completarAccesoSteam, cerrar: cerrarRetornoSteam } };

export default function CompletarAccesoSocial({ proveedor }: { proveedor: 'google' | 'steam' }) {
  const { nombre, completar, cerrar } = PROVEEDORES[proveedor];
  useArenaBody();
  const router = useRouter();
  const [acceso, setAcceso] = useState<Acceso | null>(null);
  const [nick, setNick] = useState('');
  const [pideNick, setPideNick] = useState(false);
  const [ocupado, setOcupado] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [puedeReintentar, setPuedeReintentar] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const resultado = await completar();
        if ('vinculo' in resultado && resultado.vinculo) { if (activo) router.replace('/perfil?steam=linked'); return; }
        const { data: perfil, error: errorPerfil } = await supabase.from('profiles').select('nick, baneado').eq('id', resultado.userId).maybeSingle();
        if (!activo) return;
        setAcceso(resultado);
        if (errorPerfil || !perfil) {
          setPuedeReintentar(true);
          throw new Error('No se pudo cargar tu perfil. Vuelve a intentarlo.');
        }
        if (perfil.baneado) {
          cerrar();
          await supabase.auth.signOut({ scope: 'local' });
          throw new Error('Tu cuenta no puede ingresar. Contacta con soporte.');
        }
        if (necesitaNickSocial(resultado.userId, perfil.nick)) {
          setPideNick(true);
          setOcupado(false);
          return;
        }
        const { data: admin } = await supabase.rpc('es_admin');
        if (activo) { cerrar(); router.replace(resultado.next ?? (admin === true ? '/admin' : '/')); }
      } catch (e) {
        if (!activo) return;
        setError(e instanceof Error ? e.message : 'No se pudo completar el acceso. Vuelve a intentarlo.');
        setOcupado(false);
      }
    }
    void cargar();
    return () => { activo = false; };
  }, [router, intento, completar, cerrar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!acceso || ocupado) return;
    const validacion = validarNickSocial(nick, acceso.userId);
    if (validacion) { setError(validacion); return; }
    setOcupado(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== acceso.userId) throw new Error('Tu sesión cambió. Vuelve a iniciar sesión antes de guardar tu nick.');
      const { data: identidad, error: errorIdentidad } = await supabase.auth.getUser(session.access_token);
      if (errorIdentidad || identidad.user?.id !== acceso.userId) throw new Error('Tu sesión cambió. Vuelve a iniciar sesión antes de guardar tu nick.');
      const autorizacion = `Bearer ${session.access_token}`;
      const { error: errorNick } = await supabase.rpc('actualizar_nick', { p_nick: nick.trim() }).setHeader('Authorization', autorizacion);
      if (errorNick) throw new Error(errorNick.message.includes('ya está en uso') ? 'Ese nick ya está en uso. Elige otro.' : 'No se pudo guardar tu nick. Vuelve a intentarlo.');
      const { data: perfil, error: errorPerfil } = await supabase.from('profiles').select('nick').eq('id', acceso.userId).maybeSingle().setHeader('Authorization', autorizacion);
      if (errorPerfil || perfil?.nick !== nick.trim()) throw new Error('No se pudo confirmar tu nick. Vuelve a intentarlo.');
      cerrar();
      router.replace(acceso.next ?? '/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar tu nick. Vuelve a intentarlo.');
      setOcupado(false);
    }
  }

  return (
    <main className="arena-shell arena-hero flex min-h-screen items-center justify-center px-4 py-10">
      <section className="arena-card w-full max-w-md space-y-6 rounded-2xl border border-white/10 p-6 shadow-arena sm:p-8">
        <div className="flex items-center justify-center gap-2.5">
          <Image src="/kodigodota-mark.svg" width={36} height={34} alt="" aria-hidden="true" className="h-8 w-auto" />
          <span className="font-display text-2xl font-bold text-white">KódigoDota</span>
        </div>
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-bold text-white">{pideNick ? 'Elige tu nick' : error ? 'No pudimos completar el acceso' : `Conectando con ${nombre}`}</h1>
          <p className="text-sm text-slate-400">{pideNick ? 'Así te verán los jugadores en las salas y el chat.' : !error ? 'Estamos preparando tu entrada a la arena.' : 'Puedes volver a intentarlo o ingresar con tu correo.'}</p>
        </div>
        {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
        {pideNick ? (
          <form onSubmit={guardar} className="space-y-5">
            <label htmlFor={`${proveedor}-nick`} className="block text-sm font-medium text-slate-300">Nick (3–20 caracteres)
              <input id={`${proveedor}-nick`} autoComplete="nickname" required value={nick} onChange={e => setNick(e.target.value)} disabled={ocupado}
                className="mt-2 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-prism-400 focus:outline-none focus:ring-2 focus:ring-prism-500/20" placeholder="Tu nick en la arena" />
            </label>
            <button type="submit" disabled={ocupado} className="w-full rounded-lg bg-prism-500 py-2.5 font-semibold text-white shadow-arena-glow transition hover:bg-prism-400 disabled:opacity-50">{ocupado ? 'Guardando…' : 'Guardar y continuar'}</button>
          </form>
        ) : ocupado ? <p role="status" className="text-center text-sm text-slate-300">Validando tu acceso…</p> : null}
        {error && !pideNick && <div className="space-y-3 text-center">
          {puedeReintentar && <button type="button" onClick={() => { setError(null); setOcupado(true); setPuedeReintentar(false); setIntento(v => v + 1); }} className="block w-full rounded-lg bg-prism-500 py-2.5 text-sm font-semibold text-white hover:bg-prism-400">Reintentar</button>}
          <Link href="/login" className="block text-sm font-semibold text-prism-300 hover:text-prism-200">Volver a iniciar sesión</Link>
        </div>}
      </section>
    </main>
  );
}
