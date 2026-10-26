# Logo del navegador y aparición en Google

Dominio principal: `https://www.kodigodota.com`. El propietario confirma que ya tiene la propiedad verificada en Google Search Console.

## Preparación de la web

- El logo de `public/kodigodota-mark.svg` se exporta a favicon ICO de 16–256 px, PNG de 96 px y Apple de 180 px. Imagen de marca de 512 px para metadatos y datos estructurados. Regeneración: `node scripts/generar-iconos.mjs` (usa sharp incluido por Next.js).
- Título y descripción de Dota 2/Perú, identidad WebSite/Organization, URL canónica de la página principal y metadatos propios de guía/historial.
- `https://www.kodigodota.com/robots.txt` permite rastrear la web y anuncia `https://www.kodigodota.com/sitemap.xml`.
- El sitemap contiene inicio, cómo jugar, historial público, política de privacidad (`/privacidad`) y términos del servicio (`/terminos`). `/salas` requiere sesión y queda fuera. Cuenta, pagos, administración, API y demostración llevan `X-Robots-Tag: noindex, nofollow`; se conserva la autenticación existente.
- Se conserva el archivo HTML de verificación de Search Console.

## Pasos en tu cuenta de Google

1. Abre [Google Search Console](https://search.google.com/search-console) y selecciona la propiedad verificada que incluya `https://www.kodigodota.com/`.
2. En **Sitemaps**, envía `https://www.kodigodota.com/sitemap.xml`.
3. En **Inspección de URLs**, introduce `https://www.kodigodota.com/`, ejecuta la prueba de la URL publicada y pulsa **Solicitar indexación**.
4. Consulta después **Indexación de páginas** para ver el resultado. También puedes inspeccionar la guía y el historial público.

Estos pasos requieren tu cuenta de Search Console. La configuración del código no envía por sí sola una solicitud de indexación ni permite consultar el estado privado de la propiedad.

Google decide cuándo rastrea e indexa y cómo presenta el resultado; enviar el sitemap o una solicitud no garantiza una fecha ni una posición. El favicon de los resultados se actualiza cuando Google vuelve a rastrearlo. En el navegador puedes recargar con Ctrl+F5 o abrir una pestaña nueva para renovar el icono almacenado.

Fuentes: [inspección y solicitud de indexación](https://support.google.com/webmasters/answer/9012289?hl=es), [sitemaps en Search Console](https://support.google.com/webmasters/answer/7451001?hl=es), [favicon en resultados](https://developers.google.com/search/docs/appearance/favicon-in-search), [nombre del sitio](https://developers.google.com/search/docs/appearance/site-names).
