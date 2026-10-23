# Conectar kodigodota.com a la web

Dominio comprado en Spaceship. Alojamiento: proyecto `kodigodota` en Vercel. Conexión verificada el 23/10/2026: `kodigodota.com` redirige con 308 a `www.kodigodota.com`; ambos dominios están verificados. La dirección principal real usa **www**.

URL Configuration de Supabase corregida por el propietario y comprobada por HTTP: Site URL con www y destino `/recuperar?cambiar=1` aceptados. El propietario confirmó posteriormente recepción del correo, cambio de contraseña e inicio de sesión correctos.

El dominio es la dirección que escriben tus visitantes. Vercel aloja y ejecuta la web. Los registros DNS indican a qué alojamiento debe ir esa dirección. Al conectarlo se verá la versión publicada en Vercel; los cambios de localhost llegan al dominio cuando se despliegan.

## 1. Añadir el dominio en Vercel

1. Entra a [Vercel](https://vercel.com/dashboard) y abre el proyecto de KódigoDota.
2. Abre **Settings → Domains** (Configuración → Dominios).
3. Pulsa **Add Domain**, escribe `kodigodota.com` y añádelo al entorno **Production**.
4. Añade también `www.kodigodota.com`. En la configuración actual es la dirección principal; `kodigodota.com` redirige a ella.
5. Deja abierta esa pantalla: muestra los registros DNS exactos que necesita tu proyecto.

La [guía oficial de Vercel](https://vercel.com/docs/domains/working-with-domains/add-a-domain) explica dónde ver los valores y cómo comprobar la configuración. Si todavía no existe un proyecto publicado, hay que importar el repositorio y desplegarlo antes de completar estos pasos.

## 2. Copiar los registros en Spaceship

1. En Spaceship, abre **Advanced DNS / DNS avanzado** desde las aplicaciones de tu cuenta y selecciona `kodigodota.com`.
2. Entra en **DNS records → Custom records** (Registros DNS → Registros personalizados).
3. Crea o actualiza las entradas que Vercel te mostró:

| Tipo | Host / Nombre | Valor |
| --- | --- | --- |
| A | `@` | La dirección IP exacta que muestre Vercel para `kodigodota.com` |
| CNAME | `www` | El destino exacto que muestre Vercel para `www.kodigodota.com` |

`@` representa el dominio sin www. En Host se escribe `www`, no una URL completa. Conserva el TTL predeterminado. Si Vercel solicita verificar propiedad con un TXT, copia también su nombre y valor exactos. Los valores dependen del proyecto; no copies una IP o CNAME de un tutorial.

Sustituye los registros de aparcamiento que entren en conflicto con esas mismas entradas web. Conserva los registros de correo y otras verificaciones. Mantén la gestión DNS en Spaceship para este método.

[Instrucciones oficiales de Spaceship para editar registros](https://www.spaceship.com/knowledgebase/dns-records-types/).

## 3. Comprobar la conexión

Vuelve a **Domains** en Vercel y actualiza la comprobación hasta que ambos dominios tengan configuración válida. Los cambios DNS necesitan propagarse. Después abre `https://kodigodota.com` y comprueba que llegue a `https://www.kodigodota.com`.

Vercel [genera el certificado HTTPS automáticamente al validar el DNS](https://vercel.com/docs/domains/working-with-ssl).

## 4. Ajustar los enlaces del proyecto

Cuando el dominio ya abra la web:

1. En Vercel → **Settings → Environment Variables**, configura `NEXT_PUBLIC_APP_URL` con `https://www.kodigodota.com` para **Production**. Aplicado mediante CLI el 23/10/2026. Esta aplicación lo usa para el retorno de la vinculación con Steam y necesita coincidir con el dominio principal de la cookie. Despliega de nuevo para aplicar el valor.
2. En el proyecto de Supabase → **Authentication → URL Configuration**, establece **Site URL** en `https://www.kodigodota.com`.
3. Añade a **Redirect URLs** `https://www.kodigodota.com/` y `https://www.kodigodota.com/recuperar?cambiar=1`. Conserva las direcciones locales que uses para desarrollo y las del dominio sin www que ya hayas añadido. Estos son los destinos actuales; los accesos sociales necesitarán sus destinos cuando se implementen.
4. Comprueba inicio de sesión, confirmación de correo, recuperación y vinculación Steam desde el dominio nuevo.

La [documentación de Supabase](https://supabase.com/docs/guides/auth/redirect-urls) distingue Site URL de los destinos permitidos. Comprar/conectar el dominio no activa por sí solo Google, Facebook o el registro con Steam.
