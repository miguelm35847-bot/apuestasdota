'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import ModalApuestas from '@/components/ModalApuestas';
import { useAuth } from '@/components/AuthProvider';

export type SalaApuesta = { id: string; nombre: string; iniciada_at?: string | null };
const Contexto = createContext<((sala: SalaApuesta) => void) | null>(null);

export function ApuestasProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sala, setSala] = useState<SalaApuesta | null>(null);
  return (
    <Contexto.Provider value={setSala}>
      {children}
      {sala && <ModalApuestas key={`${sala.id}-${user?.id ?? 'anon'}`} sala={sala} onCerrar={() => setSala(null)} />}
    </Contexto.Provider>
  );
}

export default function BotonApostar({ sala, className = '', etiqueta }: { sala: SalaApuesta; className?: string; etiqueta?: string }) {
  const abrir = useContext(Contexto);
  const [ahora,setAhora]=useState(0);
  useEffect(()=>{const reloj=setInterval(()=>setAhora(Date.now()),1000);return()=>clearInterval(reloj);},[]);
  const cerrada=!!sala.iniciada_at&&ahora>=new Date(sala.iniciada_at).getTime()+25*60000;
  return (
    <button type="button" onClick={() => abrir?.(sala)}
      className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2.5 font-sans text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prism-400 ${cerrada ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-prism-400/30 bg-prism-500/15 text-prism-200 hover:border-prism-400/50 hover:bg-prism-500/25'} ${className}`}>
      {etiqueta ?? (cerrada?'Ver apuestas · cerradas':'Apostar · S/ 5.50')}
    </button>
  );
}
