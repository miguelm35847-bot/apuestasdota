'use client';

import { useRef, useState } from 'react';
import SteamIcon from '@/components/SteamIcon';
import { iniciarAccesoSteam } from '@/lib/steamAuth';

type Props = { disabled?: boolean; onError: (mensaje: string | null) => void; onProcesando: (valor: boolean) => void };

export default function BotonSteam({ disabled, onError, onProcesando }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const iniciado = useRef(false);
  async function continuar() {
    if (iniciado.current || disabled) return;
    iniciado.current = true;
    setOcupado(true); onProcesando(true); onError(null);
    try { await iniciarAccesoSteam(); }
    catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo abrir Steam. Intenta nuevamente.');
      setOcupado(false); onProcesando(false); iniciado.current = false;
    }
  }
  return <div className="space-y-2.5">
    <button type="button" onClick={continuar} disabled={disabled || ocupado} aria-busy={ocupado}
      className="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-sky-400/25 bg-[#172d45] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#20405f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-prism-400 disabled:cursor-wait disabled:opacity-60">
      <SteamIcon className="h-5 w-5 shrink-0" />{ocupado ? 'Conectando con Steam…' : 'Continuar con Steam'}
    </button>
    <p className="text-center text-xs leading-5 text-slate-500">Si ya tienes cuenta y aún no vinculaste Steam, entra con tu correo o Google y vincúlalo desde tu perfil para conservar tu saldo.</p>
  </div>;
}
