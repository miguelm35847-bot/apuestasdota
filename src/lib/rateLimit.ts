type Bucket = {
  count: number;
  resetAt: number;
};

const MAX_BUCKETS = 5_000;
const buckets = new Map<string, Bucket>();

/**
 * Rate limit básico en memoria por clave (usuario, IP o usuario+sala).
 * Es por instancia del servidor; sirve como primera barrera contra abuso.
 */
export function limitarPorClave(
  clave: string,
  maximo: number,
  ventanaMs: number
): boolean {
  const ahora = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= ahora) buckets.delete(key);
    }
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }

  const actual = buckets.get(clave);

  if (!actual || actual.resetAt <= ahora) {
    buckets.set(clave, { count: 1, resetAt: ahora + ventanaMs });
    return true;
  }

  if (actual.count >= maximo) return false;

  actual.count += 1;
  return true;
}
