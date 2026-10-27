# Registro con Steam, Google y Facebook

Estado revisado el 26/10/2026. Google publicado y probado por el propietario. Steam publicado en www, con migraciones aplicadas y pruebas locales y de producción; el propietario confirmó el ingreso real con Steam y la conservación de su cuenta vinculada. Facebook sigue pendiente. El propietario confirmó Google **En producción** y logo cargado; esto no confirma por sí solo aprobación de marca.

## Estado actual

- Login y registro ofrecen **Continuar con Steam** y **Continuar con Google**, además de correo/contraseña. El nick conserva sus 3–20 caracteres y su unicidad sin distinguir mayúsculas.
- La configuración pública de Supabase confirma `google=true` y registro de cuentas habilitado. El propietario creó el cliente de Google, guardó sus credenciales en Supabase y agregó el retorno de la web.
- Google utiliza PKCE con verificador en sessionStorage y un cliente temporal separado del acceso por correo. El código de un solo uso se intercambia una sola vez y se elimina de la URL. La sesión verificada se entrega al cliente existente de la aplicación; se limpian las credenciales temporales. No hay Client Secret en la web o el repositorio.
- `/login/google` conserva un destino interno seguro, maneja cancelación/enlace vencido/error y pide un nick propio si el perfil todavía usa el provisional `jugador_<id>`. La elección se puede reanudar tras recargar la página con la misma sesión; nunca se modifica el nick de otra cuenta si cambió el usuario.
- El trigger vigente `handle_new_user` ya crea un perfil válido sin metadatos de nick. Se reutiliza `actualizar_nick`, con comprobación de usuario autenticado y nick único, y se verifica la lectura después de guardarlo. No se necesita SQL nuevo.
- Las identidades se vinculan mediante las reglas verificadas de Supabase; la web no busca cuentas por nombre/avatar ni crea perfiles o billeteras adicionales. Usa el UUID autenticado y los permisos actuales.
- Steam puede crear una cuenta o recuperar el UUID que ya tenga ese Steam vinculado. El vínculo desde `/perfil` exige conservar la misma sesión al completarlo. Ambos flujos comprueban OpenID y el navegador antes de actuar.
- Facebook no está implementado.
- Dominio conectado y web publicada: `kodigodota.com` en Spaceship redirige al principal `www.kodigodota.com` en Vercel. Site URL y redirección de recuperación con www confirmados por HTTP tras el ajuste del propietario. Pasos en [DOMINIO.md](DOMINIO.md). Usar el dominio con www al configurar los proveedores.

## Pendientes de la siguiente etapa

1. **Steam**: implementación, publicación y pruebas completas. El propietario confirmó el ingreso real con Steam y la conservación de su cuenta vinculada. Las altas nuevas están cubiertas por los fixtures y la comprobación real de Supabase Auth con un actor temporal eliminado; no se creó otro Steam real para esa prueba.
2. **Google**: prueba real y estado **En producción** confirmados por el propietario el 26/10/2026; logo cargado. Completar los enlaces y revisar la verificación/publicación de marca para su nombre y logo. Estos estados se confirman desde su cuenta de Google; no se deducen de los fixtures de la web.
3. **Facebook**: mismo recorrido de cuenta/perfil, una vez configurada la aplicación de Meta y habilitado su uso público. Verificar los permisos de correo/perfil requeridos por el proveedor y los casos de denegación.

En los tres casos se deben probar cuentas nuevas, cuentas existentes, cancelación, error del proveedor, nick duplicado, retorno a sala, sesión vencida y conservación de saldo/identidad. No vincular ni fusionar cuentas basándose solo en un nombre o avatar.

## Acceso y registro con Steam

1. En `/login` o `/register`, pulsar **Continuar con Steam** y autorizar en el sitio oficial de Steam. La web no solicita la contraseña de Steam.
2. Si el Steam ya está vinculado, se conserva su UUID, perfil, historial, rol y billetera. Si todavía no existe, se crea una cuenta de jugador, Steam queda vinculado y se pide un nick propio. El MMR queda pendiente para completarlo desde el perfil; no se inventa ni se importa como verificado.
3. **Si ya tienes cuenta por correo o Google y aún no vinculaste Steam**, entra con ese método y vincúlalo desde `/perfil` antes de usar el botón. Steam no comparte tu correo; no se puede deducir ni fusionar de forma segura la cuenta anterior por nick/avatar.
4. Las altas hechas con Steam ingresan con Steam. Se usa internamente un identificador de Auth con dominio no entregable `.invalid`, sin solicitar un correo real, y la interfaz muestra «Acceso con Steam». Añadir un correo o Google a esa nueva cuenta es una etapa distinta, aún no implementada. No se envían correos a ese identificador.
5. No hace falta crear otra aplicación OAuth en Google ni activar un proveedor Steam en Supabase. Se conserva `NEXT_PUBLIC_APP_URL=https://www.kodigodota.com` en Production y el `STEAM_API_KEY` existente para nombre/avatar (estos datos son opcionales para el acceso). El retorno OpenID es `/api/auth/steam/callback`; la pantalla final es `/login/steam`. La entrega de sesión ocurre por API, sin añadir otra redirección de Supabase.

### Implementación y límites

- `/api/auth/steam/login` inicia acceso público con Origin exacto y challenge SHA-256. `/api/auth/steam/start` inicia vinculación con JWT validado. Cookie HttpOnly/SameSite=Lax, host público configurado y secreto aleatorio de 256 bits; la IP solo se guarda como HMAC para limitar intentos entre instancias.
- El callback comprueba namespace, modo, proveedor fijo, campos firmados, ID/identidad coincidentes, parámetros únicos, nonce reciente y retorno exacto. Confirma la firma directamente con Steam. Las pruebas se consumen una sola vez en PostgreSQL; un callback repetido o sin la cookie no crea una sesión.
- El callback deja una cookie opaca durante dos minutos y redirige a una URL limpia. `/api/auth/steam/session` exige la clave conservada en sessionStorage y, para vincular, el mismo JWT/UUID original. Solo entonces consume la prueba y vincula o crea la cuenta. El protocolo OpenID incluye la identidad de Steam en su retorno al servidor; esa identidad no se incorpora a la URL final, la respuesta JSON de sesión ni el perfil público.
- `steam_auth.cuentas` reserva un UUID por Steam antes de llamar a Auth; reintentos y altas concurrentes convergen. El índice único existente de `profiles.steam_id` se conserva. Los cambios de vínculo eliminan la asociación anterior, sin tocar nick, MMR, rol o saldo. Borrar un perfil elimina su asociación privada por FK.
- Se usan las APIs oficiales admin `createUser` y `generateLink`, con verificación interna del token de correo por un cliente separado para entregar una sesión nativa al mismo UUID. No se fabrican JWTs ni se usan metadatos editables como autorización. Un correo real sin confirmar no se confirma a través de Steam y una cuenta con segundo factor verificado no omite ese factor: debe usar su método habitual.
- Las seis RPCs son solo `service_role`, con `search_path` vacío. Tablas en esquema privado, sin permisos directos para el navegador, RLS y políticas de denegación explícita. Migraciones aplicadas: `supabase/migrations/20261026235759_steam_login.sql` y `20261027002415_steam_login_guardas.sql`. Advisor sin avisos de seguridad para estos objetos; solo INFO de índices nuevos aún sin uso.
- `CompletarAccesoSocial` comparte la elección de nick con Google. Persistencia de sesión, recuperación por correo, perfil y movimientos anteriores conservados. El verificador de Steam se elimina después de la entrega y el código/errores no permanecen en la URL. No se registra una aceptación contractual ni se valida edad nueva en esta tarea.

### Pruebas de Steam

- `npm run qa:steam`: 31 comprobaciones de protocolo OpenID, tokens, origen, nick y presentación de la cuenta.
- `npm run qa:steam:db`: 20 casos sobre PostgreSQL aislado con las migraciones reales, permisos, expiración, repetición, cambio de sesión, concurrencia, asociaciones y conservación de saldo/MMR.
- `npm run qa:steam:server`: 17 casos de los handlers reales y SDK, con Steam/Auth simulados y PostgreSQL aislado. Incluye alta concurrente, vínculo, sesión ajena, bloqueo, correo sin verificar y segundo factor.
- `npm run qa:steam:ui`: 22 recorridos interceptados de navegador, incluidos PC/móvil, nick, reanudación, error/vacío, UUID, vinculación y cancelación sin cerrar la sesión existente. No utiliza identidades Steam reales ni mueve dinero.
- Supabase Auth real: alta con UUID reservado y correo técnico, `generateLink`/`verifyOtp`, mismo UUID/rol y perfil válido sin MMR. Sesión cerrada y actor temporal eliminado; catálogo remoto confirma cero perfiles `qa-steam-*` restantes. No se enviaron correos, se vinculó un Steam ficticio ni se movió saldo.
- Regresión: 38 pruebas puras y 19 recorridos Google correctos, QA general local 12/12 y sesión real de QA en inicio/perfil 6/6. Tsc/lint/build correctos; 22/22 UI Steam y 19/19 UI Google también correctos en producción, con 39 comprobaciones HTTP de páginas legales y controles HTTP de Steam. El propietario confirmó selección/consentimiento e ingreso real con su Steam, conservando la cuenta vinculada. No se simularon identidades del proveedor en producción para emitir sesiones reales. Las altas nuevas no se probaron con otro Steam real.

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
