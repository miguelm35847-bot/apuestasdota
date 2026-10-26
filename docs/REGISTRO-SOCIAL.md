# Registro con Steam, Google y Facebook

Estado revisado el 26/10/2026. Google implementado y publicado, proveedor habilitado; el propietario confirmó el ingreso real con una cuenta de prueba y la elección de nick. Steam y Facebook siguen pendientes como accesos de cuenta.

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
2. **Google**: prueba real completada según confirmación del propietario el 26/10/2026, después de agregar su usuario de prueba, ingresar con Google y elegir nick. Esto complementa los fixtures con la selección y el consentimiento reales. Antes del lanzamiento general, revisar el estado de publicación en Google → Público; la confirmación de la prueba no confirma que se haya pasado de Pruebas a Producción.
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
8. En Google → **Público → Usuarios de prueba**, añadir los correos que probarán el acceso mientras esté en pruebas. Se pueden agregar antes de implementar la web; no dependen del botón.
9. Abrir `/login` o `/register`, pulsar **Continuar con Google**, elegir una cuenta autorizada y aceptar. Si es nueva, elegir nick; si ya existe una identidad vinculada, se conserva el perfil. Para comprobar la conservación de una cuenta registrada por correo, usar el mismo correo verificado y revisar nick/saldo antes y después, sin crear cuentas o mover saldo de prueba.
10. Preparar la publicación del consentimiento de Google cuando se quiera abrir el acceso a usuarios generales. Durante las pruebas no es necesario hacerlo público.

Para probar Google real desde desarrollo, autorizar también el retorno del origen local que se utilice (por ejemplo, `http://localhost:3000/login/google`) en Supabase. Los harnesses automatizados interceptan OAuth y no necesitan abrir Google ni esas autorizaciones locales.

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
- [Steam: autenticación web con OpenID](https://partner.steamgames.com/doc/features/auth#website)
