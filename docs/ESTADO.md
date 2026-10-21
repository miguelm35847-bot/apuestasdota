# Estado de KódigoDota

## Stack

Next.js 16.4.2 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (auth, Postgres, Realtime).

## Estado actual (21/10/2026)

- Landing pública con hero de imagen única, salas activas e historial; `SalasProvider` comparte salas y participantes con una sola consulta y una sola suscripción Realtime.
- Chat general en el landing y chat privado por sala. Cada mensaje ajeno muestra avatar, cabecera con nick + medalla de rango y burbuja separada; la tarjeta del jugador se ancla al avatar.
- `/perfil` con identidad, Steam, saldo, Recargar/Retirar, resumen y perfil competitivo (MMR único + roles). Sin acceso directo a `/salas` desde la cabecera.
- `/jugadores/[id]` público con medalla, stats y últimas partidas; enlaces icon-only a Steam/Dotabuff sin exponer `steam_id`.
- Salas 1v1/5v5 con equipos, picks, lobby, cierre automático/manual, panel admin y endurecimiento de RPCs.
- Guía pública `/como-jugar` con pasos y reglas.
- QA automatizado: harness visual por CDP (`npm run qa`) y QA de datos (`qa:seed`, `qa:probes`, `qa:flows`, `qa:cleanup`) con 10 actores API + admin efímero.
- Tema **Arena Dark** en todas las pantallas; responsive verificado en 1366, 390 y 360 px.

## Pendientes

- Aplicar `docs/sql/2026-10-21-qa-hallazgos.sql` antes de desplegar: corrige los picks 5v5, revoca la lectura de `profiles.steam_id` para `authenticated` y agrega `qa_cleanup()` para borrar las cuentas/salas QA (el `service_role` no tiene DELETE en las tablas sensibles). Después: `npm run qa:probes`, `npm run qa:flows` y `npm run qa:cleanup`.
- Volver a correr `npm run qa:probes` y `npm run qa:flows` después de aplicar ese SQL; los flujos 1v1 ya pasan completos.
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
- QA visual con Chrome CDP: `npm run qa -- --base http://127.0.0.1:3001 --url / --hover "a[aria-label^='Ver perfil de']"`. Requiere Chrome con `--remote-debugging-port=9222` y un servidor de QA (`npm run qa:serve`) para no tocar el :3000 que usa el usuario. Añade `--login` para flujos con sesión (cuenta QA `qa_cdp`; credenciales en `.env.local`, nunca en el repo).
- QA de datos: `npm run qa:seed` → `npm run qa:probes` → `npm run qa:flows` → `npm run qa:cleanup`. Usa cuentas `qa-*` y salas `QA `; el service_role no puede saltarse todos los grants, así que el saldo se acredita con el flujo real de recarga.
- SQL pendiente, si hay, en `docs/TRASPASO.md`.

## Documentación

- `docs/ESTADO.md` — este archivo: estado vigente y pendientes.
- `docs/HISTORIAL.md` — bitácora append-only.
- `docs/TRASPASO.md` — referencia técnica: esquema SQL, archivos, flujos y verificaciones detalladas.
- `scripts/qa/` — harness de QA visual por CDP (sin dependencias).
