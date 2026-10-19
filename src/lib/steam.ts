// Funciones para verificar la respuesta OpenID de Steam
// Fuente: https://steamcommunity.com/dev

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

/**
 * Genera la URL de redirección para iniciar el login con Steam
 * @param returnTo - URL a la que Steam redirigirá después del login
 * @param state - Token de sesión para verificar al usuario en el callback
 */
export function getSteamLoginUrl(returnTo: string, state: string): string {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': `${returnTo}?state=${encodeURIComponent(state)}`,
    'openid.realm': returnTo.split('/api/')[0],
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });

  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

/**
 * Verifies the Steam OpenID response and extracts the Steam ID
 * Returns null if verification fails
 */
export async function verifySteamOpenId(queryParams: URLSearchParams): Promise<string | null> {
  // Verify the response is from Steam
  const ns = queryParams.get('openid.ns');
  if (ns !== 'http://specs.openid.net/auth/2.0') {
    return null;
  }

  const claimedId = queryParams.get('openid.claimed_id');
  if (!claimedId) {
    return null;
  }

  // Verify the signature with Steam
  const verifyParams = new URLSearchParams();
  verifyParams.set('openid.ns', 'http://specs.openid.net/auth/2.0');
  verifyParams.set('openid.mode', 'check_authentication');

  // Copy all openid.* parameters except mode
  for (const [key, value] of queryParams.entries()) {
    if (key.startsWith('openid.') && key !== 'openid.mode') {
      verifyParams.set(key, value);
    }
  }

  const verifyResponse = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyParams.toString(),
  });

  if (!verifyResponse.ok) {
    return null;
  }

  const verifyResult = await verifyResponse.text();
  if (!verifyResult.includes('is_valid:true')) {
    return null;
  }

  // Extract Steam ID from the claimed_id URL
  // Format: https://steamcommunity.com/openid/id/76561198000000000
  const match = claimedId.match(/https:\/\/steamcommunity\.com\/openid\/id\/(\d+)/);
  if (!match) {
    return null;
  }

  return match[1]; // 17-digit Steam ID
}
