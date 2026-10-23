'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Recuperar() {
 const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
 const [recuperando,setRecuperando]=useState(false); const [mensaje,setMensaje]=useState(''); const [ocupado,setOcupado]=useState(false);
 useEffect(()=>{
  const {data:{subscription}}=supabase.auth.onAuthStateChange((evento)=>{if(evento==='PASSWORD_RECOVERY')setRecuperando(true);});
  if(new URLSearchParams(window.location.search).get('cambiar')==='1'){
   void supabase.auth.getUser().then(({data,error})=>{
    if(data.user&&!error)setRecuperando(true);
    else setMensaje('El enlace venció o no es válido. Solicita uno nuevo.');
   });
  }
  return ()=>subscription.unsubscribe();
 },[]);
 async function enviar(e:React.FormEvent){
  e.preventDefault();setOcupado(true);
  const {error}= recuperando ? await supabase.auth.updateUser({password}) : await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/recuperar?cambiar=1`});
  setMensaje(error?.message ?? (recuperando?'Contraseña actualizada. Ya puedes iniciar sesión.':'Si el correo tiene una cuenta, recibirás un enlace para recuperar el acceso.'));
  setOcupado(false);
 }
 return <main className="arena-shell flex min-h-screen items-center justify-center p-4 text-slate-100"><form onSubmit={enviar} className="arena-card w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-[#111827] p-6">
 <h1 className="text-xl font-bold">{recuperando?'Nueva contraseña':'Recuperar acceso'}</h1>
 <label className="block text-sm">{recuperando?'Nueva contraseña (mínimo 8 caracteres)':'Correo electrónico'}<input required type={recuperando?'password':'email'} minLength={recuperando?8:undefined} autoComplete={recuperando?'new-password':'email'} value={recuperando?password:email} onChange={e=>recuperando?setPassword(e.target.value):setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-black/20 p-3" /></label>
 <button disabled={ocupado} className="w-full rounded-lg bg-white p-3 font-bold text-black disabled:opacity-50">{ocupado?'Procesando…':recuperando?'Guardar contraseña':'Enviar enlace'}</button><p role="status" className="text-sm text-slate-300">{mensaje}</p><Link href="/login" className="block text-sm text-prism-300">Volver a iniciar sesión</Link>
 </form></main>;
}
