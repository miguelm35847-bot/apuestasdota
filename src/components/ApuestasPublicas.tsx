'use client';

import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CAMPOS_APUESTA, PAGINA_APUESTAS, type Apuesta } from '@/lib/apuestas';
import { consultaCompartida } from '@/lib/consultaCompartida';
import { useCambiosApuestas } from '@/lib/useCambiosApuestas';
import CruceApuesta from '@/components/CruceApuesta';
import { useAuth } from '@/components/AuthProvider';

export default function ApuestasPublicas({ salaId, compacto = false }: { salaId: string; compacto?: boolean }) {
  const { user } = useAuth();
  const [apuestas, setApuestas] = useState<Apuesta[]>([]);
  const [pagina, setPagina] = useState(0);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const solicitud = useRef(0);
  const tamano = compacto ? 3 : PAGINA_APUESTAS;
  const cargar = useCallback(async () => {
    const actual = ++solicitud.current;
    const { data, count, error: fallo } = await consultaCompartida(`cruces:${salaId}:${pagina}:${tamano}:${user?.id??'anon'}`,()=>supabase.from('apuestas_sala')
      .select(CAMPOS_APUESTA, { count: 'exact' }).eq('sala_id', salaId)
      .in('estado', ['aceptada', 'liquidada', 'reembolsada'])
      .order('creado_en', { ascending: false }).order('id', { ascending: false })
      .range(pagina * tamano, (pagina + 1) * tamano - 1));
    if (actual !== solicitud.current) return;
    setError(!!fallo);
    if (!fallo) { setApuestas((data ?? []) as unknown as Apuesta[]); setTotal(count ?? 0); }
    setCargando(false);
  }, [salaId, pagina, tamano, user?.id]);

  useCambiosApuestas(salaId, cargar);

  return (
    <section data-apuestas-publicas={salaId} className="mt-4 border-t border-white/10 pt-3" aria-label="Apuestas confirmadas">
      <h3 className="font-display text-sm font-semibold tracking-tight text-slate-200">Apuestas confirmadas{!error && !cargando ? ` · ${total}` : ''}</h3>
      {cargando ? <p className="mt-2 text-xs text-slate-500">Cargando cruces…</p> : error ? <p className="mt-2 text-xs text-slate-500">No se pudieron cargar los cruces. <button type="button" className="underline" onClick={() => void cargar()}>Reintentar</button></p> : apuestas.length === 0 ? <p className="mt-2 text-xs text-slate-500">Aún no hay apuestas confirmadas.</p> : <ul className="mt-2 space-y-2">{apuestas.map((a) => <li key={a.id}><CruceApuesta apuesta={a} /></li>)}</ul>}
      {!error && total > tamano && <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <button type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} className="rounded-lg border border-white/10 px-2 py-1.5 disabled:opacity-30">Anterior</button>
        <span>{pagina + 1} / {Math.max(1, Math.ceil(total / tamano))}</span>
        <button type="button" disabled={(pagina + 1) * tamano >= total} onClick={() => setPagina((p) => p + 1)} className="rounded-lg border border-white/10 px-2 py-1.5 disabled:opacity-30">Siguiente</button>
      </div>}
    </section>
  );
}
