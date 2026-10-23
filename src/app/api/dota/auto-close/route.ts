import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { limitarPorClave } from '@/lib/rateLimit';
import { detectarYCerrar, type Resultado } from '@/lib/dotaCierreServer';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
const SUPABASE_ANON_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
const SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const CACHE_MS=45000;
const cache=new Map<string,{expires:number;resultado:Resultado}>();
export async function POST(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { cerrada: false, reason: 'Faltan variables de entorno de Supabase' },
      { status: 500 }
    );
  }

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return NextResponse.json({ cerrada: false, reason: 'No autenticado' }, { status: 401 });
  }

  let salaId: string | undefined;
  try {
    const body = (await request.json()) as { sala_id?: string };
    salaId = body.sala_id;
  } catch {
    return NextResponse.json({ cerrada: false, reason: 'Cuerpo inválido' }, { status: 400 });
  }

  if (!salaId) {
    return NextResponse.json({ cerrada: false, reason: 'Falta sala_id' }, { status: 400 });
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ cerrada: false, reason: 'Sesión inválida' }, { status: 401 });
  }

  if (!limitarPorClave(`auto-close-user:${user.id}`, 12, 60_000)) {
    return NextResponse.json(
      { cerrada: false, reason: 'Demasiadas solicitudes. Espera un momento.' },
      { status: 429 }
    );
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: participante } = await admin
    .from('participantes_sala')
    .select('user_id')
    .eq('sala_id', salaId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!participante) {
    const { data: perfil } = await admin
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    if (perfil?.rol !== 'admin') {
      return NextResponse.json(
        { cerrada: false, reason: 'No perteneces a esta sala' },
        { status: 403 }
      );
    }
  }

  if (!limitarPorClave(`auto-close:${user.id}:${salaId}`, 1, 10_000)) {
    return NextResponse.json(
      { cerrada: false, reason: 'Demasiadas solicitudes. Espera unos segundos.' },
      { status: 429 }
    );
  }

  const ahora = Date.now();
  const cached = cache.get(salaId);
  if (cached && cached.expires > ahora && cached.resultado.cerrada) {
    return NextResponse.json(cached.resultado);
  }

  const resultado = await detectarYCerrar(admin, salaId);

  // No cacheamos errores de cierre: el usuario puede corregir el SQL y reintentar.
  if (!(resultado.detected && !resultado.cerrada)) {
    cache.set(salaId, { expires: Date.now() + CACHE_MS, resultado });
  }

  return NextResponse.json(resultado);
}
