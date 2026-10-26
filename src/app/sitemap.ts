import type { MetadataRoute } from 'next';
import { URL_SITIO } from '@/lib/sitio';
import { FECHA_PRIVACIDAD } from '@/lib/privacidad';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/como-jugar', '/salas/historial', '/privacidad'].map(ruta => ({
    url: `${URL_SITIO}${ruta}`,
    ...(ruta === '/privacidad' ? { lastModified: FECHA_PRIVACIDAD } : {}),
  }));
}
