const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const OPENID_NS = 'http://specs.openid.net/auth/2.0';

export function getSteamLoginUrl(returnTo: string, state: string): string {
  const callback = new URL(returnTo);
  callback.searchParams.set('state', state);
  const params = new URLSearchParams({
    'openid.ns': OPENID_NS, 'openid.mode': 'checkid_setup',
    'openid.return_to': callback.toString(), 'openid.realm': callback.origin,
    'openid.identity': `${OPENID_NS}/identifier_select`, 'openid.claimed_id': `${OPENID_NS}/identifier_select`,
  });
  return `${STEAM_OPENID_URL}?${params}`;
}

/** Prueba con Steam, campos firmados y retorno exacto; sin confiar en el ID de la URL. */
export async function verifySteamOpenId(params: URLSearchParams, returnTo: string): Promise<string | null> {
  const vistos = new Set<string>();
  for (const [clave] of params) {
    if (!clave.startsWith('openid.') && clave !== 'state') continue;
    if (vistos.has(clave)) return null;
    vistos.add(clave);
  }
  if (params.get('openid.ns') !== OPENID_NS || params.get('openid.mode') !== 'id_res'
    || params.get('openid.op_endpoint') !== STEAM_OPENID_URL || params.get('openid.return_to') !== returnTo) return null;
  const claimed = params.get('openid.claimed_id');
  const id = claimed?.match(/^https:\/\/steamcommunity\.com\/openid\/id\/([0-9]{17})$/)?.[1];
  if (!id || params.get('openid.identity') !== claimed) return null;
  const firmados = new Set((params.get('openid.signed') ?? '').split(','));
  if (['op_endpoint','claimed_id','identity','return_to','response_nonce','assoc_handle'].some(c => !firmados.has(c))) return null;
  const nonce = params.get('openid.response_nonce') ?? '';
  const tiempo = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z.+$/.test(nonce) ? Date.parse(nonce.slice(0,20)) : NaN;
  if (!Number.isFinite(tiempo) || Date.now() - tiempo > 600_000 || tiempo > Date.now() + 60_000) return null;
  const comprobacion = new URLSearchParams();
  for (const [clave, valor] of params) if (clave.startsWith('openid.')) comprobacion.set(clave, valor);
  comprobacion.set('openid.mode', 'check_authentication');
  try {
    const respuesta = await fetch(STEAM_OPENID_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: comprobacion,
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
    });
    if (!respuesta.ok) return null;
    const lineas = (await respuesta.text()).split(/\r?\n/);
    return lineas.filter(l => l.startsWith('is_valid:')).length === 1 && lineas.includes('is_valid:true') ? id : null;
  } catch { return null; }
}
