# Transmisión de Kick

Implementado el 29/10/2026 por solicitud del propietario: mostrar [kodigodota](https://kick.com/kodigodota) en el espacio izquierdo debajo de Actividad reciente, sin que nuevos registros lo empujen hacia abajo.

## Ubicación y comportamiento

- `Inicio.tsx` coloca `TransmisionKick` inmediatamente después de `ActividadPanel` en el mismo lateral, antes de la columna central de salas en escritorio. En móvil se conserva la agrupación actividad/video después de las salas.
- El modo compacto de actividad reserva **284 px** durante carga, vacío, error y contenido. La lista tiene scroll interno; «Ver más actividad» permanece dentro de esa altura. El video queda separado por 20 px, independientemente del número de actividades.
- Reproductor 16:9 con `https://player.kick.com/kodigodota?autoplay=false&muted=true`, controles oficiales, pantalla completa y enlace directo al canal. Se inicia con Play y sin sonido; el visitante puede activarlo desde Kick. No se inventa un indicador de emisión activa.
- El canal está definido en `src/components/TransmisionKick.tsx`. No se necesita clave API, dependencia, migración ni cambio de base de datos.

## Integración

La [guía oficial de Kick](https://help.kick.com/en/articles/8010826-how-to-embed-your-kick-livestream) documenta el iframe y sus parámetros. `next.config.ts` permite exclusivamente el origen propio y `https://player.kick.com` en `frame-src`; conserva `frame-ancestors 'none'` y `X-Frame-Options: DENY`. El navegador carga el video desde Kick dentro de su iframe. La página de privacidad informa de esta conexión externa.

## Verificación

- Tipos, lint y build correctos.
- `npm run qa:kick:ui`: 26 recorridos, incluidos siete de Kick. Comprueba canal y CSP, solicitud del iframe desde el navegador, posición constante con 0/8/16/24/30 actividades, descripciones largas, scroll, carga demorada y lectura rechazada. Resoluciones 1920×945, 1366×768, 390×844 y 360×800; capturas en `output/qa-kick/capturas/`.
- QA general con sesión: portada correcta en 1366×768, 390×844 y 360×800, sin errores ni desborde horizontal.
- `npm run qa:landing:ui`: 26 escenarios existentes correctos. Los dos harnesses con fixtures sustituyen el iframe por HTML estático y simulan HTTP/Realtime; no demuestran reproducción externa ni escriben operaciones reales.
- Comprobación adicional en Chrome con el iframe real: el canal fue reconocido y reprodujo su emisión dentro del lateral. La disponibilidad y el contenido posterior dependen de Kick y del canal.

La publicación sigue el flujo GitHub `main` → Vercel existente. La evidencia fechada de commit, CI y despliegue se conserva fuera de Git en `output/qa-kick/publicacion.json` al verificar la publicación.
