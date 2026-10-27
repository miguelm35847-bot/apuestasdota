# Comunidad Discord de KódigoDota

## Estado al 27/10/2026

El propietario creó la cuenta y el servidor KódigoDota. La configuración de canales se realizó en la aplicación oficial de Discord, sin bots ni complementos adicionales.

- Invitación para la web: https://discord.gg/2FrCBBKph3
- Canal de entrada: bienvenida.
- Vencimiento: Nunca.
- Número máximo de usos: Ilimitado.
- Verificación pública: la invitación muestra KódigoDota y su logo en una sesión sin autenticar; no se creó otra cuenta ni se invitó a contactos.

## Canales

Texto: general y clips-y-destacados ya existían. Se añadieron bienvenida, reglas, anuncios y buscar-partida.

Voz: Sala y Juegos ya existían. Se añadieron Lobby, Radiant y Dire.

Se guardó en el tema de bienvenida una presentación de la comunidad con enlace a https://www.kodigodota.com y referencias a reglas, general y buscar-partida. Los canales nuevos conservan los permisos predeterminados. Los nombres reglas y anuncios no significan que tengan publicaciones iniciales ni que sean de solo lectura; esas configuraciones no forman parte de este cambio.

## Acceso desde la web

Enlace «Únete a Discord» en el extremo izquierdo del pie de la página principal, en `src/components/Inicio.tsx`, acompañado por el símbolo de Discord. En PC, la identidad, los enlaces legales y los medios de pago conservan su posición central; en móvil, Discord permanece alineado a la izquierda y el resto aparece debajo. Usa la invitación permanente y abre una pestaña nueva con `noopener noreferrer`. Tiene un área de interacción de al menos 44 px y foco visible para teclado. Símbolo SVG de Simple Icons (https://github.com/simple-icons/simple-icons/blob/develop/icons/discord.svg), incluido directamente sin dependencias ni peticiones de red.

Verificación del ajuste final a la izquierda: `npx tsc --noEmit`, `npm run lint` y `npm run build` correctos. QA de la build en el puerto 3001: 3/3 vistas correctas en 1366×768, 390×844 y 360×800, con el pie visible y el texto «Únete a Discord» presente; sin desbordes ni errores de consola. Capturas en `output/qa-discord-izquierda/`.

El propietario autorizó el ajuste a la izquierda con ícono y su publicación en producción el 27/10/2026. No se cambiaron autenticación, salas, saldos ni datos de jugadores. `output/` queda excluido del paquete de despliegue para no subir capturas y otros entregables de trabajo.

El proyecto `kodigodota` del equipo `kodigodota` publica automáticamente la rama `main` del repositorio GitHub existente. La versión previa verificada antes de este cambio era `dpl_5K4TzgMKUsuSQo6Jt6MAnBKYS7o4`, Ready, procedente del commit `ac2d63a7e62030ba9c71afe0cabacf0b8195f5ca`; puede usarse como referencia de reversión. La publicación y sus comprobaciones se consultan en Vercel y en los artefactos locales de esta tarea.
