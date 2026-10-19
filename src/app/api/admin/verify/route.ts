import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function GET() {
  try {
    // Leer cookies de Next.js 16 (asíncrono)
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Buscar cookie de sesión de Supabase
    const authCookie = allCookies.find((c) =>
      c.name.startsWith('sb-') && c.name.includes('auth-token')
    );

    const accessToken = authCookie?.value || null;

    if (!accessToken) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    // Verificar usuario
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !user) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    // Verificar rol admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ isAdmin: profile?.rol === 'admin' }, { status: 200 });
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}
