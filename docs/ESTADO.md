# Estado de KódigoDota

## Stack

Next.js 16.4.2 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (auth, Postgres, Realtime).

## Estado actual (21/10/2026)

- Landing pública con hero de imagen única, salas activas e historial; `SalasProvider` comparte salas y participantes con una sola consulta y una sola suscripción Realtime.
- Chat general en el landing y chat privado por sala. Cada mensaje ajeno muestra avatar, cabecera con nick + medalla de rango y burbuja separada; la tarjeta del jugador se ancla al avatar.
- `/perfil` con identidad, Steam, saldo, Recargar/Retirar, resumen y perfil competitivo (MMR único + roles). Sin acceso directo a `/salas` desde la cabecera.
- `/jugadores/[id]` público con medalla, stats y últimas partidas; enlaces icon-only a Steam/Dotabuff sin exponer `steam_id`.
- Salas 1v1/5v5 con equipos, picks, lobby, cierre automático/manual, panel admin y endurecimiento de RPCs. Los slots de la sala muestran la **medalla de MMR** junto al MMR. En 1v1, cuando los dos confirman “Estoy listo” gira una moneda con los avatares de ambos y el ganador elige Radiant o Dire (el admin no asigna los equipos a mano); en 5v5 el reparto sale de los picks.
- Flujo 5v5: la sala se llena → verificación “Estoy listo” → cuando los 10 confirman **suena un aviso al admin** → el admin guarda a los dos capitanes y **se lanza la moneda con los avatares de los capitanes** → el ganador elige **Radiant (pickea primero)** o **LastPick (Dire y pickea segundo)**. El draft sigue el orden **R-DD-RR-DD-R** (8 picks, serpiente), cada jugador elegido va al equipo del capitán que lo elige y cada turno tiene **45 s** con auto-pick **por mayor MMR**. Lo aplican `elegir_radiant_o_lastpick` (decisión) y `siguiente_capitan_de_pick` (orden), con `pickear_jugador` y `auto_pickear_si_vencido` reescritos para contar los 8 jugadores elegidos de verdad.
- Preferencia de lado **informativa**: durante la fase de picks el jugador puede decir si prefiere Radiant o Dire y los capitanes lo ven en las tarjetas. No cambia el reparto.
- Resumen de Dota 2 en las salas (datos públicos de OpenDota, la fuente de Dotabuff): en la **lista de espera** cada jugador muestra sus **3 héroes más jugados** (con icono), los **3 roles más jugados con su winrate**, los **roles de sus últimas partidas** y el enlace a su **Dotabuff**. Cuando el jugador pasa a Radiant o Dire la información desaparece (allí ya no hace falta). Si no tiene partidas públicas, no se muestra nada.
- Admin → Jugadores: MMR, **recarga manual** (sin motivo) y **multas** por faltas a las reglas, con saldo por jugador y notificación.
- Gestión de salas **desde el landing**: el admin ve el botón “+ Crear sala” y, en cada tarjeta, “☆ Destacar” y “Gestionar →” (equipos, lobby, verificación y cierre) sin pasar por el panel admin.
- Verificación de sala "Estoy listo": se pide **automáticamente** cuando la sala se llena, y el admin puede pedirla **en cualquier momento** (también con la sala incompleta: los que ya están reciben el aviso y los que entran después también), volver a pedirla o cancelarla. Cada jugador confirma desde la sala o desde un **aviso central** que le aparece en cualquier página (con “Estoy listo”, que además lo lleva a su sala, e “Ir a mi sala”). Los slots marcan con un cuadrito verde con ✓ a los que confirmaron. No bloquea el inicio de la partida. Si la verificación ya estaba completa y entra alguien nuevo, vuelve a quedar pendiente **sin borrar** las confirmaciones de los demás. Cuando se lanza la moneda, al admin que creó la sala le suena un aviso para que pueda crear el lobby en Dota y poner la sala en juego. En 5v5, al confirmar el último jugador le suena al admin un aviso distinto (`listos`, acorde ascendente) para que elija a los capitanes.
- Donaciones entre usuarios: botón "Donar saldo" en el perfil público **y en la tarjeta flotante de cada jugador** (landing, chat y salas), con mensaje opcional; todo el movimiento ocurre en la RPC `donar_saldo` (atómico, con control de saldo y sin donarse a uno mismo).
- Panel público de actividades en el landing: muestra en vivo las donaciones ("Perfil 1 donó S/ 2.00 a Perfil 2", con avatares) y las multas aplicadas por el admin. Va en la **columna izquierda** del landing (340 px), con las salas al centro y el chat a la derecha (360 px); cada tarjeta de sala muestra la cuota y el **premio por ganador**.
- Sonidos de la arena (Web Audio, sin archivos ni botón de volumen): aviso de verificación (suena a los jugadores de la sala, estén donde estén), **todos listos en 5v5** (solo al admin que creó la sala), moneda lanzada (admin) y fin de partida (todos los jugadores de la sala). Los avisos de verificación **no** aparecen en la campana.
- Guía pública `/como-jugar` con pasos y reglas.
- QA automatizado: harness visual por CDP (`npm run qa`) y QA de datos (`qa:seed`, `qa:probes`, `qa:flows`, `qa:cleanup`) con 10 actores API + admin efímero.
- Vista de partida en vivo **montada en la web real**: en la sala destacada del hero y en **cada tarjeta de sala del landing** aparece la franja compacta (**reloj al centro**, con “En vivo” a la izquierda y el score debajo) y, **justo debajo del avatar de cada jugador**, el héroe que está jugando (sin números: el héroe ya no se repite abajo). Cuando la sala está en juego, **Radiant va a la izquierda y Dire al extremo derecho** de la tarjeta, separados por un “vs” centrado; el chip de cupo (`10/10`) va en la cabecera, junto al estado. Dentro de la sala hay además el marcador completo (los dos equipos con héroe y K/D/A) y el héroe bajo el avatar en cada slot; el panel admin también lo muestra. Ahora mismo usa **datos de ejemplo** (`src/lib/vivoMock.ts`) y respeta los equipos reales; falta conectar la API de Valve (`GetLiveLeagueGames`, ya tenemos `STEAM_API_KEY`), que solo publica partidas de liga/torneo, así que depende de que Valve apruebe liga/ticket.
- **Datos de la partida** (`/salas/[id]/partida`): cuando la sala está `en_juego`, el botón de las tarjetas del landing (y el de la sala destacada del hero) pasa de “Unirse”/“Ver sala”/“Ir a mi sala” a **“Ver datos de la partida”**, siempre visible aunque no hayas iniciado sesión (la pantalla es pública). Muestra marcador y reloj en vivo (desde `iniciada_at`), chip de **día/noche** (ciclo de 5 min de Dota), torres en pie, **oro de equipo** con barra y ventaja, y por jugador: héroe con nivel, **K/D/A**, **oro**, GPM/XPM, último golpe/denegados, patrimonio e **ítems** (6 ranuras + neutral desde el minuto 15), con cuenta de reaparición cuando el héroe está muerto. A la derecha va un **minimapa** con la posición de los 10 héroes (Radiant/Dire), el río, las bases y Roshan, que oscurece de noche. Dentro de la sala hay un enlace al panel cuando la sala está en juego. Sigue siendo **simulado**: las stats se derivan del reloj (mismo jugador + mismo minuto ⇒ mismos datos), así que el oro, los ítems y el nivel avanzan solos mientras la pantalla está abierta.
- Multa de **S/ 2.00 por abandonar una sala 5v5 llena** (10/10): el jugador recupera la cuota menos la multa, queda en el panel de actividades y se le notifica. En salas abiertas o 1v1 salir sigue siendo gratis.
- Tema **Arena Dark** en todas las pantallas; responsive verificado en 1366, 390 y 360 px.

## Pendientes

- SQL aplicado en Supabase: `docs/sql/2026-10-21-multas.sql`, `2026-10-21-verificacion-sala.sql`, `2026-10-21-verificacion-automatica.sql`, `2026-10-21-fin-partida-sonido.sql`, `2026-10-21-realtime-notificaciones.sql`, `2026-10-21-donaciones.sql`, `2026-10-21-tipos-movimiento-donacion.sql`, `2026-10-21-signo-movimiento-donacion.sql`, `2026-10-21-preferencia-lado.sql`, `2026-10-21-qa-hallazgos.sql`, `2026-10-21-multa-abandono-5v5.sql`, `2026-10-21-eleccion-radiant-lastpick.sql`, `2026-10-22-orden-picks-y-verificacion-anticipada.sql` y `2026-10-22-turno-45s-autopick-mmr.sql`.
- Draft 5v5 verificado con datos reales (22/10/2026): turnos de ~45 s, secuencia **R-DD-RR-DD-R** (6 picks manuales `R-D-D-R-R-D` + auto-picks `D` y `R`), cierre **5/5**, auto-pick por **mayor MMR** y capitanes con `es_capitan = true` (la UI ya numera `Pick 1/8` y pinta la ⭐). `npm run qa:flows` 1v1 y 5v5 en verde.
- Vista en vivo de héroe/kills: ya se ve en el hero, en las tarjetas de sala del landing, en la sala y en el panel admin (con el **héroe bajo el avatar** de cada jugador), y desde el 22/10 también existe la pantalla **“Ver datos de la partida”** (`/salas/[id]/partida`) con K/D/A, ítems, oro, día/noche y minimapa; falta conectar todo a la API de Valve (`GetLiveLeagueGames`, ya tenemos `STEAM_API_KEY`), que solo publica partidas de liga/torneo, así que depende de que Valve apruebe liga/ticket.

- QA de backend aplicado (21/10/2026): `qa:probes` queda **22/22**, `qa:flows` 1v1 y 5v5 quedan verdes (verificación → moneda, reparto 5/5, lobby y reembolso) y `qa:cleanup` dejó la base sin perfiles `qa-*` ni salas `QA `. Se conserva `qa_cdp` para el harness visual.
- Probar en la interfaz el flujo 5v5 completo (aviso de todos listos → capitanes → moneda con avatares → Radiant/LastPick → orden R-DD-RR-DD-R con turnos de 45 s y auto-pick por MMR); el backend ya está verificado con `qa:flows`.
- Probar el cobro real de la multa de S/ 2.00 abandonando una 5v5 llena (el SQL ya está aplicado).
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
- QA visual con Chrome CDP: `npm run qa -- --base http://127.0.0.1:3001 --url / --hover "a[aria-label^='Ver perfil de']"`. Requiere Chrome con `--remote-debugging-port=9222` y un servidor de QA (`npm run qa:serve`) para no tocar el :3000 que usa el usuario. Añade `--login` para flujos con sesión (cuenta QA `qa_cdp`; credenciales en `.env.local`, nunca en el repo). Ojo: los probes de CSP solo pasan contra la **build de producción** (`:3001`); el dev server (`:3000`) usa `unsafe-eval` en desarrollo y esa comprobación falla ahí.
- QA de datos: `npm run qa:seed` → `npm run qa:probes` → `npm run qa:flows` → `npm run qa:cleanup`. Usa cuentas `qa-*` y salas `QA `; el service_role no puede saltarse todos los grants, así que el saldo se acredita con el flujo real de recarga.
- SQL pendiente, si hay, en `docs/TRASPASO.md`.

## Documentación

- `docs/ESTADO.md` — este archivo: estado vigente y pendientes.
- `docs/HISTORIAL.md` — bitácora append-only.
- `docs/TRASPASO.md` — referencia técnica: esquema SQL, archivos, flujos y verificaciones detalladas.
- `scripts/qa/` — harness de QA visual por CDP (sin dependencias).
