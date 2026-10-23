# Registro con Steam, Google y Facebook

Estado revisado el 23/10/2026. Es una preparación de la siguiente etapa; los accesos sociales no están implementados ni activados.

## Estado actual

- El registro actual usa correo, contraseña y nick de 3–20 caracteres.
- La configuración pública de Supabase confirma `google=false`, `facebook=false` y registro de cuentas habilitado.
- Steam ya tiene un flujo OpenID verificado en servidor, pero `/api/auth/steam/start` exige una sesión y el callback solo vincula un perfil existente. No crea cuentas ni inicia una sesión nueva.
- El propietario confirmó que todavía no tiene aplicaciones de Google Cloud ni Meta.
- Dominio conectado y web publicada: `kodigodota.com` en Spaceship redirige al principal `www.kodigodota.com` en Vercel. Pasos y ajuste pendiente de URL Configuration de Supabase en [DOMINIO.md](DOMINIO.md). Usar el dominio con www al configurar los proveedores.

## Implementación propuesta

1. **Steam primero**: acceso con OpenID para crear la cuenta al primer ingreso o recuperar la cuenta que ya tenga ese Steam vinculado. Mantener el mismo UUID y la misma billetera de las cuentas existentes. La identidad se obtiene únicamente de la respuesta verificada de Steam; cookie HttpOnly/state y protección contra reintentos. El callback debe entregar una sesión de Supabase sin tokens ni SteamID en la URL. Alta del perfil y selección de nick con las validaciones actuales; MMR pendiente hasta que el jugador lo complete. Es un flujo nuevo, separado del vínculo desde el perfil.
2. **Google**: habilitar su proveedor de Supabase una vez creada la aplicación. Agregar acceso en registro/login, retorno seguro a la sala de origen y completar nick si el proveedor no aporta uno válido. Revisar el trigger de creación de perfiles antes de habilitarlo; no asumir que los metadatos sociales contienen `nick`.
3. **Facebook**: mismo recorrido de cuenta/perfil, una vez configurada la aplicación de Meta y habilitado su uso público. Verificar los permisos de correo/perfil requeridos por el proveedor y los casos de denegación.

En los tres casos se deben probar cuentas nuevas, cuentas existentes, cancelación, error del proveedor, nick duplicado, retorno a sala, sesión vencida y conservación de saldo/identidad. No vincular ni fusionar cuentas basándose solo en un nombre o avatar.

## Configuración de Google que debe crear el propietario

1. Abrir Google Cloud / Google Auth Platform, crear o elegir un proyecto y configurar la aplicación y sus usuarios de prueba.
2. Crear un cliente OAuth de tipo **Aplicación web**.
3. Añadir el dominio de producción como origen autorizado; añadir localhost únicamente para las pruebas locales necesarias.
4. Usar como URI de redirección del proveedor:

   `https://rxkzqcxjtfxzxhkhezxr.supabase.co/auth/v1/callback`

5. Guardar Client ID y Client Secret en Supabase → Authentication → Sign In / Providers → Google. Las claves se configuran en el panel, no en el repositorio ni en mensajes de chat.
6. Coordinar la publicación del consentimiento y la lista de usuarios de prueba según el estado del proyecto de Google.

## Configuración de Facebook que debe crear el propietario

1. Crear una aplicación en Meta for Developers con el caso de uso de autenticación y creación de cuentas.
2. Configurar Facebook Login y sus permisos `public_profile` y `email` siguiendo la guía oficial de Supabase.
3. Añadir la misma URL de callback de Supabase indicada arriba en **Valid OAuth Redirect URIs**.
4. Completar los campos que Meta solicite para la aplicación y preparar su modo público antes de aceptar usuarios generales.
5. Guardar App ID y App Secret en Supabase → Authentication → Sign In / Providers → Facebook.

La URL de callback anterior pertenece a los proveedores. El retorno final hacia KódigoDota será una ruta de la aplicación que aún debe implementarse y añadirse a Auth Redirect URLs con el dominio público correcto.

## Fuentes oficiales

- [Supabase: Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Supabase: Facebook](https://supabase.com/docs/guides/auth/social-sign-in/auth-facebook)
- [Steam: autenticación web con OpenID](https://partner.steamgames.com/doc/features/auth#website)
