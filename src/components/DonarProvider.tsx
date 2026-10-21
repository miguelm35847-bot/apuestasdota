'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/components/AuthProvider';
import ModalDonar from '@/components/ModalDonar';
import Toast from '@/components/Toast';

export type DestinatarioDonacion = {
  id: string;
  nick: string | null;
  steam_avatar_url: string | null;
};

type ContextoDonar = {
  /** Abre el modal de donación. No hace nada si no hay sesión o es uno mismo. */
  abrirDonar: (destinatario: DestinatarioDonacion) => void;
};

const Contexto = createContext<ContextoDonar | null>(null);

/**
 * Provider global de donaciones.
 * Monta el modal una sola vez para que cualquier tarjeta de jugador
 * (landing, chat, salas) pueda abrirlo sin duplicar código.
 */
export function DonarProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [destinatario, setDestinatario] = useState<DestinatarioDonacion | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const abrirDonar = useCallback(
    (destinatario: DestinatarioDonacion) => {
      if (!user) return;
      if (user.id === destinatario.id) return;
      setDestinatario(destinatario);
    },
    [user]
  );

  const valor = useMemo(() => ({ abrirDonar }), [abrirDonar]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      {destinatario && (
        <ModalDonar
          receptor={destinatario}
          onCerrar={() => setDestinatario(null)}
          onListo={(mensaje) => setToast(mensaje)}
        />
      )}
      <Toast mensaje={toast} tipo="success" onClose={() => setToast(null)} />
    </Contexto.Provider>
  );
}

export function useDonar(): ContextoDonar {
  return useContext(Contexto) ?? { abrirDonar: () => undefined };
}
