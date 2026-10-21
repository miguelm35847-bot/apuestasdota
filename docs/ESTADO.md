# Estado de KódigoDota

## Stack

Next.js 16.4.2 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (auth, Postgres, Realtime).

## Estado actual (21/10/2026)

- Landing pública con hero de imagen única, salas activas e historial; `SalasProvider` comparte salas y participantes con una sola consulta y una sola suscripción Realtime.
- Chat general en el landing y chat privado por sala. Cada mensaje ajeno muestra avatar, cabecera con nick + medalla de rango y burbuja separada; la tarjeta del jugador se ancla al avatar.
- `/perfil` con identidad, Steam, saldo, Recargar/Retirar, resumen y perfil competitivo (MMR único + roles). Sin acceso directo a `/salas` desde la cabecera.
- `/jugadores/[id]` público con medalla, stats y últimas partidas; enlaces icon-only a Steam/Dotabuff sin exponer `steam_id`.
- Salas 1v1/5v5 con equipos, picks, lobby, cierre automático/manual, panel admin y endurecimiento de RPCs.
- Admin → Jugadores: MMR, **recarga manual** (sin motivo) y **multas** por faltas a las reglas, con saldo por jugador y notificación.
- Verificación de sala "Estoy listo": el admin la pide cuando la sala está completa, cada jugador confirma desde la sala (aviso sonoro dentro de la sala + notificación) y los slots marcan con ✓ a los que confirmaron. No bloquea el inicio de la partida.
- Donaciones entre usuarios: botón "Donar saldo" en el perfil público **y en la tarjeta flotante de cada jugador** (landing, chat y salas), con mensaje opcional; todo el movimiento ocurre en la RPC `donar_saldo` (atómico, con control de saldo y sin donarse a uno mismo).
- Panel público de actividades en el landing: muestra en vivo las donaciones ("Perfil 1 donó S/ 2.00 a Perfil 2", con avatares) y las multas aplicadas por el admin. Va en la **columna izquierda** del landing, con las salas al centro y el chat a la derecha.
- Sonidos de la arena (Web Audio, sin archivos ni botón de volumen): aviso de verificación (suena a los jugadores de la sala, estén donde estén) y fin de partida (suena para todos los jugadores de la sala). Los avisos de verificación **no** aparecen en la campana.
- Guía pública `/como-jugar` con pasos y reglas.
- QA automatizado: harness visual por CDP (`npm run qa`) y QA de datos (`qa:seed`, `qa:probes`, `qa:flows`, `qa:cleanup`) con 10 actores API + admin efímero.
- Tema **Arena Dark** en todas las pantallas; responsive verificado en 1366, 390 y 360 px.

## Pendientes

- SQL pendiente de aplicar en Supabase: `docs/sql/2026-10-21-signo-movimiento-donacion.sql` (agrega los dos tipos de donación al check `signo_correcto`, que valida que el signo del monto corresponda al tipo; sin esto la RPC `donar_saldo` falla con "violates check constraint \"signo_correcto\"").
- Panel de actividades en el landing: hoy se guardan las multas como movimientos `ajuste_admin` con descripción `Multa: <motivo>`; falta el panel público (fines y luego donaciones) con Realtime.
- Donaciones entre usuarios y panel de actividades: siguiente bloque agreed (recarga → verificación → donaciones/panel → en vivo).
- Vista en vivo de héroe/kills: sigue pendiente; depende de que Valve apruebe liga/ticket (la API pública solo muestra partidas de liga).

- QA de backend aplicado (21/10/2026): `qa:probes` queda **22/22** (se sumó la prueba de que un jugador no puede ajustar el saldo de otro), `qa:flows` 1v1 y 5v5 quedan verdes (reparto 5/5, lobby y reembolso) y `qa:cleanup` dejó la base sin perfiles `qa-*` ni salas `QA `. Se conserva `qa_cdp` para el harness visual.
- Probar el flujo completo de MMR único + fase de picks en la interfaz
- Probar la vinculación de Steam con el nuevo flujo (state HMAC + cookie HttpOnly) y confirmar que el access token no aparece en la URL
- Probar el cierre automático con un lobby de torneo con ticket y cuentas con Steam vinculado
- Para lobbies custom/practice: cierre manual del admin (flujo oficial por ahora). No avanzar con bot de Steam ni ticket/liga hasta contar con una cuenta bot y un league/ticket ID; opcionalmente, evaluar confirmación por capitanes sin bot
- Sistema de apuestas en partida

## Decisiones

- Usar App Router (no Pages Router)
- Estructura: src/app + src/lib + src/components
- Supabase cliente en navegador con anon key
- Montos en céntimos (enteros) para evitar errores de decimales
- Autenticación con email + contraseña de Supabase
- Admin definido por profiles.rol = 'admin'
- Vinculación Steam por OpenID (no requiere ngrok en desarrollo)

## Notas

- El proyecto usa Turbopack (nuevo bundler de Next.js 16)
- Tailwind CSS v4 con plugin de Turbopack
- Variables de entorno en .env.local (NO commitear)
- middleware.js está deprecado en Next.js 16, ahora es proxy.js
- cookies() es asíncrono en Next.js 16

## Verificación

- `npx tsc --noEmit` (feedback rápido de tipos).
- `npm run lint`.
- `npm run build` (también corre TypeScript; es la verificación final).
- Puertos: `npm run dev` usa el **3000**; si avisa "Port 3000 is in use by process X" es que quedó un `next start` anterior: se libera con `npm run lib:puerto` (o `npm run dev:libre`, que lo libera y arranca el dev). El script solo detiene procesos de Next.js; si el puerto lo usa otro programa, avisa y no lo mata. `npm run qa:serve` levanta la build de producción en el **3001** para el QA, sin tocar el 3000 del usuario.
- QA visual con Chrome CDP: `npm run qa -- --base http://127.0.0.1:3001 --url / --hover "a[aria-label^='Ver perfil de']"`. Requiere Chrome con `--remote-debugging-port=9222` y un servidor de QA (`npm run qa:serve`) para no tocar el :3000 que usa el usuario. Añade `--login` para flujos con sesión (cuenta QA `qa_cdp`; credenciales en `.env.local`, nunca en el repo).
- QA de datos: `npm run qa:seed` → `npm run qa:probes` → `npm run qa:flows` → `npm run qa:cleanup`. Usa cuentas `qa-*` y salas `QA `; el service_role no puede saltarse todos los grants, así que el saldo se acredita con el flujo real de recarga.
- SQL pendiente, si hay, en `docs/TRASPASO.md`.

## Documentación

- `docs/ESTADO.md` — este archivo: estado vigente y pendientes.
- `docs/HISTORIAL.md` — bitácora append-only.
- `docs/TRASPASO.md` — referencia técnica: esquema SQL, archivos, flujos y verificaciones detalladas.
- `scripts/qa/` — harness de QA visual por CDP (sin dependencias).
