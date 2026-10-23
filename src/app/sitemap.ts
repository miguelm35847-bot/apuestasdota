import type { MetadataRoute } from 'next';
import { URL_SITIO } from '@/lib/sitio';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/como-jugar', '/salas/historial'].map(ruta => ({ url: `${URL_SITIO}${ruta}` }));
}
