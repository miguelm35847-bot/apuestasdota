import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno de Supabase. Revisa tu archivo .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Google intercambia su código PKCE con un cliente temporal; el resto conserva
    // la detección actual para confirmaciones y recuperación de contraseña.
    detectSessionInUrl: (url, params) => url.pathname !== '/login/google' && Boolean(
      params.access_token || params.error || params.error_description || params.error_code
    ),
  },
});
