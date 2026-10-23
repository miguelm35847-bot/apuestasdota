import type { Metadata } from 'next';
import Inicio from '@/components/Inicio';
import { DESCRIPCION_SITIO, NOMBRE_SITIO, REDES_SITIO, URL_SITIO } from '@/lib/sitio';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { ...REDES_SITIO, url: URL_SITIO },
};

export default function Home() {
  const identidad = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${URL_SITIO}/#website`,
        url: `${URL_SITIO}/`,
        name: NOMBRE_SITIO,
        alternateName: 'KodigoDota',
        description: DESCRIPCION_SITIO,
        inLanguage: 'es-PE',
        publisher: { '@id': `${URL_SITIO}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${URL_SITIO}/#organization`,
        name: NOMBRE_SITIO,
        url: `${URL_SITIO}/`,
        logo: `${URL_SITIO}/kodigodota-icon.png`,
      },
    ],
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(identidad).replace(/</g, '\\u003c') }} />
    <Inicio />
  </>;
}
