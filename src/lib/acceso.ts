/** Solo permite destinos de esta web; evita redirecciones externas y bucles de acceso. */
export function rutaRetornoSegura(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//')) return null;
  try {
    const decodificada = decodeURIComponent(valor);
    if (/^[\/]{2}|[\\\u0000-\u001f\u007f]/.test(decodificada)) return null;
    const url = new URL(valor, 'https://retorno.invalid');
    if (url.origin !== 'https://retorno.invalid') return null;
    if (url.pathname.startsWith('//')) return null;
    if (/^\/(?:login|register|recuperar|api)(?:\/|$)/i.test(decodeURIComponent(url.pathname))) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function necesitaNickGoogle(id: string, nick: string): boolean {
  return nick === `jugador_${id.slice(0, 8)}`;
}

export function validarNickGoogle(nick: string, id: string): string | null {
  const limpio = nick.trim();
  if (Array.from(limpio).length < 3 || Array.from(limpio).length > 20) {
    return 'El nick debe tener entre 3 y 20 caracteres.';
  }
  if (/[\u0000-\u001f\u007f]/.test(limpio)) return 'El nick contiene caracteres no válidos.';
  if (necesitaNickGoogle(id, limpio)) return 'Elige un nick propio para tu perfil.';
  return null;
}
