'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Escucha = () => void;
const salas = new Map<string, { escuchas: Set<Escucha>; cerrar: () => void }>();

/** Hero, tarjeta y modal comparten canal y sondeo de una misma sala. */
export function useCambiosApuestas(salaId: string, cargar: () => Promise<void>, habilitado = true) {
  useEffect(() => {
    if (!habilitado) return;
    let sala = salas.get(salaId);
    if (!sala) {
      const escuchas = new Set<Escucha>();
      const avisar = () => escuchas.forEach(escuchar => escuchar());
      const canal = supabase.channel(`apuestas-compartidas-${salaId}-${crypto.randomUUID()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'apuestas_sala', filter: `sala_id=eq.${salaId}` }, avisar)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'salas', filter: `id=eq.${salaId}` }, avisar)
        .subscribe();
      const intervalo = setInterval(() => { if (!document.hidden) avisar(); }, 30000);
      window.addEventListener('apuestas:refresh', avisar);
      sala = { escuchas, cerrar: () => {
        clearInterval(intervalo);
        window.removeEventListener('apuestas:refresh', avisar);
        void supabase.removeChannel(canal);
      } };
      salas.set(salaId, sala);
    }
    const refrescar = () => { void cargar(); };
    sala.escuchas.add(refrescar);
    refrescar();
    return () => {
      sala.escuchas.delete(refrescar);
      if (sala.escuchas.size === 0) { sala.cerrar(); salas.delete(salaId); }
    };
  }, [salaId, cargar, habilitado]);
}
