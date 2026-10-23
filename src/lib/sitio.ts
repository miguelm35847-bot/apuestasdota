export const URL_SITIO = 'https://www.kodigodota.com';
export const NOMBRE_SITIO = 'KódigoDota';
export const TITULO_SITIO = 'KódigoDota | Salas de Dota 2 en Perú';
export const DESCRIPCION_SITIO =
  'Juega Dota 2 en salas 1v1 y 5v5 con la comunidad de KódigoDota. Consulta partidas, premios y reglas. Recargas con Yape y Plin en Perú.';

export const REDES_SITIO = {
  type: 'website' as const,
  locale: 'es_PE',
  siteName: NOMBRE_SITIO,
  title: TITULO_SITIO,
  description: DESCRIPCION_SITIO,
  images: [{ url: '/kodigodota-icon.png', width: 512, height: 512, alt: NOMBRE_SITIO }],
};
