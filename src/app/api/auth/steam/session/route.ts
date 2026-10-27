import { NextRequest } from 'next/server';
import { challengeSteam, leerTokenSteam, origenSteam, STEAM_ENTREGA_COOKIE } from '@/lib/steamState';
import { clienteSteamAdmin, crearSesionSteam, obtenerCuentaSteam, opcionesCookieSteam, respuestaSteam } from '@/lib/steamAuthServer';
import { obtenerResumenSteam } from '@/lib/steamServer';
import { rutaRetornoSegura } from '@/lib/acceso';
import { limitarPorClave } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const origen = origenSteam(request.url);
    if (request.headers.get('origin') !== origen) return respuestaSteam({ error: 'Solicitud de otro origen rechazada' }, 403);
    const entrega = leerTokenSteam(request.cookies.get(STEAM_ENTREGA_COOKIE)?.value);
    if (!entrega) return respuestaSteam({ error: 'El acceso con Steam venció. Vuelve a intentarlo.' }, 401);
    if (!limitarPorClave(`steam-entrega:${entrega.id}`, 6, 120_000)) return respuestaSteam({ error: 'Demasiados intentos.' }, 429);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return respuestaSteam({ error: 'Solicitud inválida' }, 400);
    const cuerpo: unknown = await request.json();
    const challenge = cuerpo && typeof cuerpo === 'object' && 'verificador' in cuerpo && typeof cuerpo.verificador === 'string' ? challengeSteam(cuerpo.verificador) : null;
    if (!challenge) return respuestaSteam({ error: 'Solicitud inválida' }, 400);
    const admin = clienteSteamAdmin();
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    let usuario: string | null = null;
    if (token) {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return respuestaSteam({ error: 'Tu sesión cambió. Vuelve a intentarlo.' }, 401);
      usuario = data.user.id;
    }
    const { data, error } = await admin.rpc('steam_auth_consumir', {
      p_id: entrega.id, p_entrega_hash: entrega.hash, p_challenge: challenge, p_usuario: usuario,
    });
    if (error || !data || typeof data.steam !== 'string' || !/^[0-9]{17}$/.test(data.steam)
      || !['login','vincular'].includes(data.proposito)) return respuestaSteam({ error: 'El acceso venció o la sesión cambió. Vuelve a intentarlo.' }, 401);
    const vinculo = data.proposito === 'vincular';
    const cuenta = vinculo && usuario && usuario === data.usuario ? { id: usuario, email: '' } : !vinculo ? await obtenerCuentaSteam(data.steam) : null;
    if (!cuenta) return respuestaSteam({ error: 'Tu sesión cambió. Vuelve a intentarlo.' }, 401);
    const resumen = await obtenerResumenSteam(data.steam);
    const { error: errorVinculo } = await admin.rpc('steam_cuenta_vincular', {
      p_steam: data.steam, p_usuario: cuenta.id, p_avatar: resumen?.avatarUrl ?? null, p_nombre: resumen?.nombre ?? null,
    });
    if (errorVinculo) return respuestaSteam({ error: errorVinculo.message.includes('otra cuenta') ? 'Este Steam ya está vinculado a otra cuenta. Ingresa con ese Steam o contacta a soporte.' : 'No se pudo completar Steam. Vuelve a intentarlo.' }, 409);
    const respuesta = respuestaSteam(vinculo
      ? { userId: cuenta.id, vinculo: true, next: '/perfil?steam=linked' }
      : { userId: cuenta.id, next: rutaRetornoSegura(data.siguiente), ...await crearSesionSteam(cuenta.id, cuenta.email) });
    respuesta.cookies.set(STEAM_ENTREGA_COOKIE, '', opcionesCookieSteam(origen, 0));
    return respuesta;
  } catch (error) {
    const motivo = error instanceof Error ? error.message : '';
    if (motivo === 'correo_sin_confirmar') return respuestaSteam({ error: 'Confirma primero el correo de tu cuenta usando tu método de acceso habitual.' }, 401);
    if (motivo === 'segundo_factor_requerido') return respuestaSteam({ error: 'Tu cuenta requiere un segundo factor. Usa tu método de acceso habitual.' }, 401);
    return respuestaSteam({ error: 'No se pudo completar Steam. Inicia el acceso nuevamente.' }, 503);
  }
}
