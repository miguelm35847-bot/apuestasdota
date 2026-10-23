import type { MetadataRoute } from 'next';
import { URL_SITIO } from '@/lib/sitio';

export default function robots(): MetadataRoute.Robots {
  // Los crawlers deben poder leer noindex en las páginas de cuenta.
  return { rules: { userAgent: '*', allow: '/' }, sitemap: `${URL_SITIO}/sitemap.xml` };
}
