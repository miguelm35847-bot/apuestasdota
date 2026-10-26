# Registro con Steam, Google y Facebook

Estado revisado el 26/10/2026. Google implementado y publicado, proveedor habilitado; el propietario confirmó el ingreso real, la elección de nick, el estado **En producción** en Google y la carga del logo en Información de la marca. La carga del logo no confirma por sí sola aprobación de marca. Steam y Facebook siguen pendientes como accesos de cuenta.

## Estado actual

- Login y registro ofrecen **Continuar con Google**, además de correo/contraseña. El nick conserva sus 3–20 caracteres y su unicidad sin distinguir mayúsculas.
- La configuración pública de Supabase confirma `google=true` y registro de cuentas habilitado. El propietario creó el cliente de Google, guardó sus credenciales en Supabase y agregó el retorno de la web.
- Google utiliza PKCE con verificador en sessionStorage y un cliente temporal separado del acceso por correo. El código de un solo uso se intercambia una sola vez y se elimina de la URL. La sesión verificada se entrega al cliente existente de la aplicación; se limpian las credenciales temporales. No hay Client Secret en la web o el repositorio.
- `/login/google` conserva un destino interno seguro, maneja cancelación/enlace vencido/error y pide un nick propio si el perfil todavía usa el provisional `jugador_<id>`. La elección se puede reanudar tras recargar la página con la misma sesión; nunca se modifica el nick de otra cuenta si cambió el usuario.
- El trigger vigente `handle_new_user` ya crea un perfil válido sin metadatos de nick. Se reutiliza `actualizar_nick`, con comprobación de usuario autenticado y nick único, y se verifica la lectura después de guardarlo. No se necesita SQL nuevo.
- Las identidades se vinculan mediante las reglas verificadas de Supabase; la web no busca cuentas por nombre/avatar ni crea perfiles o billeteras adicionales. Usa el UUID autenticado y los permisos actuales.
- Steam ya tiene un flujo OpenID verificado en servidor, pero `/api/auth/steam/start` exige una sesión y el callback solo vincula un perfil existente. No crea cuentas ni inicia una sesión nueva.
- Facebook y el registro directo con Steam no están implementados; no se cambiaron durante el acceso de Google.
- Dominio conectado y web publicada: `kodigodota.com` en Spaceship redirige al principal `www.kodigodota.com` en Vercel. Site URL y redirección de recuperación con www confirmados por HTTP tras el ajuste del propietario. Pasos en [DOMINIO.md](DOMINIO.md). Usar el dominio con www al configurar los proveedores.

## Pendientes de la siguiente etapa

1. **Steam primero**: acceso con OpenID para crear la cuenta al primer ingreso o recuperar la cuenta que ya tenga ese Steam vinculado. Mantener el mismo UUID y la misma billetera de las cuentas existentes. La identidad se obtiene únicamente de la respuesta verificada de Steam; cookie HttpOnly/state y protección contra reintentos. El callback debe entregar una sesión de Supabase sin tokens ni SteamID en la URL. Alta del perfil y selección de nick con las validaciones actuales; MMR pendiente hasta que el jugador lo complete. Es un flujo nuevo, separado del vínculo desde el perfil.
2. **Google**: prueba real y estado **En producción** confirmados por el propietario el 26/10/2026; logo cargado. Completar los enlaces y revisar la verificación/publicación de marca para su nombre y logo. Estos estados se confirman desde su cuenta de Google; no se deducen de los fixtures de la web.
3. **Facebook**: mismo recorrido de cuenta/perfil, una vez configurada la aplicación de Meta y habilitado su uso público. Verificar los permisos de correo/perfil requeridos por el proveedor y los casos de denegación.

En los tres casos se deben probar cuentas nuevas, cuentas existentes, cancelación, error del proveedor, nick duplicado, retorno a sala, sesión vencida y conservación de saldo/identidad. No vincular ni fusionar cuentas basándose solo en un nombre o avatar.

## Configuración de Google

1. Abrir Google Cloud / Google Auth Platform, crear o elegir un proyecto y configurar la aplicación y sus usuarios de prueba.
2. Crear un cliente OAuth de tipo **Aplicación web**.
3. Añadir el dominio de producción como origen autorizado; añadir localhost únicamente para las pruebas locales necesarias.
4. Usar como URI de redirección del proveedor:

   `https://rxkzqcxjtfxzxhkhezxr.supabase.co/auth/v1/callback`

5. En Supabase → Authentication → Sign In / Providers → Google: **Client IDs** recibe el **ID de cliente** completo de Google (termina en `.apps.googleusercontent.com`); **Client Secret** recibe el **secreto del cliente** generado por Google. No son el correo ni la contraseña personal. Las claves se configuran en el panel, no en el repositorio ni en mensajes de chat.
6. Activar **Enable Sign in with Google**, conservar **Skip nonce checks** y **Allow users without an email** desactivados y pulsar **Save**. El cliente es para acceso interactivo de jugadores: no marcar la opción de agente de IA en Google.
7. En Supabase → Authentication → URL Configuration → Redirect URLs agregar:

   `https://www.kodigodota.com/login/google`

   Conservar las URLs existentes de confirmación/recuperación y el Site URL `https://www.kodigodota.com`. El propietario confirmó este ajuste y se comprobó por HTTP con un token inválido que el destino es aceptado, sin enviar correos. La URL anterior de Supabase `/auth/v1/callback` se mantiene en Google; no se sustituye por la de la web.
8. En Google → **Público → Usuarios de prueba**, añadir las cuentas previstas para la prueba. Google exceptúa de esa restricción los accesos que solo solicitan identidad básica (`email`, `profile`, `openid` o equivalentes), como el acceso actual de esta web. Se puede mantener una cuenta de prueba para la comprobación operativa; no depende del botón.
9. Abrir `/login` o `/register`, pulsar **Continuar con Google**, elegir una cuenta autorizada y aceptar. Si es nueva, elegir nick; si ya existe una identidad vinculada, se conserva el perfil. Para comprobar la conservación de una cuenta registrada por correo, usar el mismo correo verificado y revisar nick/saldo antes y después, sin crear cuentas o mover saldo de prueba.
10. Preparar la publicación del consentimiento de Google cuando se quiera abrir el acceso a usuarios generales. Durante las pruebas no es necesario hacerlo público.

Para probar Google real desde desarrollo, autorizar también el retorno del origen local que se utilice (por ejemplo, `http://localhost:3000/login/google`) en Supabase. Los harnesses automatizados interceptan OAuth y no necesitan abrir Google ni esas autorizaciones locales.

## Publicación de Google para usuarios generales

- Responsable indicado por el propietario: **KódigoDota**. Contacto público para consultas de privacidad: **robertdota123456@gmail.com**.
- Página pública de privacidad publicada: **https://www.kodigodota.com/privacidad**. Describe cuenta/Google, perfil y estadísticas de juego, visibilidad comunitaria, operaciones, proveedores, almacenamiento de sesión y solicitudes de acceso/corrección/eliminación. No requiere sesión y está enlazada en el inicio, login y registro; incluida en el sitemap. Implementación, QA local y comprobaciones HTTP de producción completos.
- En Google Auth Platform → **Información de la marca**, usar KódigoDota como nombre, `https://www.kodigodota.com` como inicio y la URL anterior en política de privacidad. El dominio autorizado es `kodigodota.com`, ya verificado por el propietario. El correo de asistencia se elige entre las cuentas o grupos permitidos por Google; no basta escribir cualquier dirección si no aparece en el selector.
- Google indica que los enlaces de inicio, privacidad y términos del servicio son necesarios para la verificación de aplicaciones externas en producción. **Términos del servicio publicados: https://www.kodigodota.com/terminos**, por solicitud del propietario. Copiar esta URL en Información de la marca → Términos del servicio.
- El propietario confirma **En producción** y logo cargado. Para mostrar nombre/logo: completar **Verificar marca** y, cuando Google indique que está lista, **Publicar marca**. Publicación de audiencia y verificación de marca son estados separados; no se cambió la configuración de Google desde esta implementación.
- La web solo solicita correo y perfil básicos. No añadir permisos de Gmail/Drive para el inicio de sesión. La política publicada no implica aprobación de Google ni certificación de cumplimiento legal.

Los términos describen el funcionamiento vigente: cuenta, participación con dinero para mayores de 18 años, juego limpio, cuotas, salidas/penalidades, apuestas S/ 5.50 con premio total S/ 10.00 y ventana de 25 minutos, marcador de ejemplo, recargas/retiros manuales, donaciones, incidencias y atención. Se conservan derechos de reclamación y condiciones de operaciones ya confirmadas. Los avisos de login/registro enlazan los documentos; no se implementó ni se afirma un registro de aceptación contractual o una verificación de edad. La identidad publicada es únicamente la marca y el correo proporcionados; no se inventaron RUC, domicilio, licencia ni autorizaciones. La revisión legal de la operación con dinero y los mecanismos regulatorios que correspondan quedan fuera de esta publicación de contenido; los términos no los sustituyen.

## Verificación automatizada

- `npm run qa:google`: 38 casos de destino interno seguro y nick, incluidos intentos de redirección externa, rutas normalizadas, nick provisional y caracteres inválidos.
- `npm run qa:google:ui`: 19 recorridos de navegador con Google/Supabase interceptados; carga y estilo en 1366×768, 390×844 y 360×800; verificador/challenge S256; misma identidad; nick válido/ocupado; cancelación; código/contexto vencidos o corruptos; recarga de nick; error/vacío de perfil; permisos; sesión cambiada y recuperación por correo conservada. No crea usuarios reales ni modifica saldos.
- Consultas remotas de metadatos confirmaron el trigger, índice único y permisos de `actualizar_nick`. La API real rechaza la RPC sin sesión y rechaza un nick de dos caracteres con sesión QA antes de modificar datos.

## Configuración de Facebook que debe crear el propietario

1. Crear una aplicación en Meta for Developers con el caso de uso de autenticación y creación de cuentas.
2. Configurar Facebook Login y sus permisos `public_profile` y `email` siguiendo la guía oficial de Supabase.
3. Añadir la misma URL de callback de Supabase indicada arriba en **Valid OAuth Redirect URIs**.
4. Completar los campos que Meta solicite para la aplicación y preparar su modo público antes de aceptar usuarios generales.
5. Guardar App ID y App Secret en Supabase → Authentication → Sign In / Providers → Facebook.

La URL de callback de Supabase pertenece a los proveedores. El retorno de Google hacia KódigoDota ya es `/login/google`; Facebook y Steam deberán definir sus flujos cuando se implementen.

## Fuentes oficiales

- [Supabase: Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Supabase: Facebook](https://supabase.com/docs/guides/auth/social-sign-in/auth-facebook)
- [Supabase: PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase: vinculación de identidades](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Google: información y verificación de marca](https://support.google.com/cloud/answer/15549049?hl=es)
- [Google: público y estado de publicación](https://support.google.com/cloud/answer/15549945?hl=es)
- [Steam: autenticación web con OpenID](https://partner.steamgames.com/doc/features/auth#website)
