import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { resultadoDotaVerificable } from '../../../src/lib/validarResultadoDota.ts';
import type { ResultadoDota } from '../../../src/lib/validarResultadoDota.ts';

// El token interno vive en Vault. La clave privilegiada permanece en el runtime.
Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('Método no permitido', { status: 405 });
  const token = request.headers.get('x-arena-token');
  if (!token) return new Response('No autorizado', { status: 401 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const permiso = await db.rpc('validar_trabajador_arena', { p_token: token });
  if (permiso.error || permiso.data !== true) return new Response('No autorizado', { status: 401 });
  const { data: salas, error } = await db.rpc('tomar_salas_cierre');
  if (error) return Response.json({ error: 'No se pudieron consultar las salas' }, { status: 503 });
  const resultados = await Promise.all((salas ?? []).map(async (sala: { id: string; cupo: number; iniciada_at: string; dota_match_id_esperado: number }) => {
    try {
      const { data: participantes, error } = await db.from('participantes_sala')
        .select('equipo,profiles(steam_id)').eq('sala_id', sala.id);
      if (error || !sala.iniciada_at) return { sala: sala.id, cerrada: false };
      const roster = new Map<number, { equipo: number | null }>();
      for (const participante of participantes ?? []) {
        const perfil = Array.isArray(participante.profiles) ? participante.profiles[0] : participante.profiles;
        if (!perfil?.steam_id || !/^\d{17}$/.test(perfil.steam_id)) continue;
        const cuenta = Number(BigInt(perfil.steam_id) - 76561197960265728n);
        if (cuenta > 0 && cuenta <= 4294967295) roster.set(cuenta, { equipo: participante.equipo });
      }
      if (roster.size !== sala.cupo) return { sala: sala.id, cerrada: false };
      const matchId = Number(sala.dota_match_id_esperado);
      // OpenDota publica resultados finales; no usamos estadísticas simuladas.
      const response = await fetch(`https://api.opendota.com/api/matches/${matchId}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return { sala: sala.id, cerrada: false };
      const detalle = await response.json() as ResultadoDota & { radiant_score?: number; dire_score?: number };
      if (!resultadoDotaVerificable(detalle, matchId, Math.floor(Date.parse(sala.iniciada_at) / 1000), sala.cupo, roster, Date.now() / 1000)) return { sala: sala.id, cerrada: false };
      const cierre = await db.rpc('cerrar_partida_auto', {
        p_sala: sala.id, p_dota_match_id: matchId, p_equipo_ganador: detalle.radiant_win ? 1 : 2,
        p_duracion: detalle.duration, p_radiant_score: detalle.radiant_score ?? 0, p_dire_score: detalle.dire_score ?? 0,
      });
      if (!cierre.error) {
        const aviso = await db.rpc('notificar_sala_terminada', { p_sala: sala.id });
        if (aviso.error) console.error('No se pudo notificar el cierre de sala', sala.id);
      }
      return { sala: sala.id, cerrada: !cierre.error };
    } catch { return { sala: sala.id, cerrada: false }; }
  }));
  return Response.json({ resultados });
});
