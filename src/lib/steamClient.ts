'use client';

import { supabase } from '@/lib/supabase';

export type SteamResumenCliente = {
  steamId: string;
  nombre: string | null;
  avatarUrl: string | null;
  perfilUrl: string | null;
};

/**
 * Pide al servidor que sincronice el avatar y nombre de Steam del usuario actual.
 */
export async function sincronizarSteam(): Promise<SteamResumenCliente | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  try {
    const response = await fetch('/api/steam/sync', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) return null;
    return (await response.json()) as SteamResumenCliente;
  } catch {
    return null;
  }
}
