'use client';

import { useEffect } from 'react';

/**
 * Mantiene el fondo del body en Arena Dark mientras una pantalla oscura está
 * montada. Al salir, solo lo restaura si ninguna otra pantalla Arena sigue
 * presente.
 */
export function useArenaBody() {
  useEffect(() => {
    document.body.classList.add('arena-body');

    return () => {
      if (!document.querySelector('.arena-shell')) {
        document.body.classList.remove('arena-body');
      }
    };
  }, []);
}
