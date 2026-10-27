import type { NextRequest } from 'next/server';
import { iniciarSteamServidor } from '@/lib/steamAuthServer';

export async function POST(request: NextRequest) {
  return iniciarSteamServidor(request, false);
}
