# QA visual por CDP

Harness sin dependencias para revisar páginas reales en Chrome: overflow horizontal, errores de consola y tarjetas que se abren al pasar el cursor.

## Requisitos

- Node 22+ (usa `WebSocket` nativo).
- Chrome o Edge con depuración remota:

  ```powershell
  & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\qa-chrome" about:blank
  ```

- Un servidor de la app. Para no interrumpir el `:3000` que usa el usuario:

  ```powershell
  npm run qa:serve   # next start -p 3001 (requiere npm run build)
  ```

- Para flujos con sesión, agrega `QA_EMAIL` y `QA_PASSWORD` a `.env.local` (está en `.gitignore`). `npm run qa` carga ese archivo con `--env-file-if-exists`; el harness no imprime las credenciales.

## Uso

```powershell
npm run qa -- --url /
npm run qa -- --url / --url /como-jugar --viewports 1366x768,390x844,360x800
npm run qa -- --url / --hover "a[aria-label^='Ver perfil de']" --hover-index last --shot qa-artifacts
npm run qa -- --login --url /perfil --expect qa_cdp --reject "Explorar salas"
```

Cada ejecución limpia el almacenamiento del origen antes de navegar, así una corrida con `--login` no contamina las siguientes.

Opciones completas: `node scripts/qa/check.mjs --help`.

Salida: una línea por URL y viewport con `[ok]` o `[FALLA]`, el detalle de los problemas y un resumen. El proceso sale con código 1 si algo falla, así que sirve para CI o para encadenarlo tras `npm run build`.

## Qué revisa

- `document.scrollWidth - document.clientWidth` debe ser 0 (sin scroll horizontal).
- Errores de consola (`console.error`, excepciones y `Log.entryAdded` de nivel error). Las advertencias se cuentan pero no fallan.
- Con `--hover`: que exista `[role="dialog"]` tras mover el cursor, que quede dentro del viewport y a qué distancia del disparador. Hace scroll al elemento si está fuera de pantalla. Si el selector no existe en una ruta, esa ruta se omite; si no coincide en ninguna, la ejecución falla.
- Con `--expect` / `--reject`: que el texto aparezca o no en `document.body.innerText` (útil para comprobar sesión, permisos o que una opción se eliminó).
- Con `--shot`: guarda capturas por URL y viewport.

## Notas

- El viewport móvil se emula con `Emulation.setDeviceMetricsOverride` (`mobile: true` bajo 600 px).
- Es tolerante a animaciones: espera `--settle` ms tras la carga (2500 por defecto). Súbelo si la página tarda en hidratar.
- No modifica datos: solo navega, mueve el cursor y toma capturas.

## QA de datos y flujos (Fase 0 y 1)

Estos scripts usan la misma base Supabase que la app. Solo tocan cuentas con prefijo `qa-` y salas con nombre `QA `.

```powershell
npm run qa:seed                 # crea qa-admin y qa-p1..qa-p10, con saldo de prueba
npm run qa:probes               # seguridad/RLS, contrato HTTP y esquema real
npm run qa:flows -- 1v1         # sorteo, lado, lobby y reembolso
npm run qa:flows -- 5v5         # 10 jugadores, moneda, picks, lobby y reembolso
npm run qa:cleanup              # borra las cuentas y salas QA
```

- `qa:seed` es idempotente: reutiliza los perfiles por nick. Acredita S/ 100 mediante el flujo real `crear_recarga` + `aprobar_recarga`, porque `service_role` no tiene permiso para insertar movimientos.
- Las cuentas QA llevan un `steam_id` ficticio y único para poder unirse (la RPC exige Steam vinculado); nunca se usa contra la API de Steam.
- `qa:probes` no escribe datos. Comprueba RLS con `anon`, una sesión real, cabeceras CSP, endpoints y la existencia de RPCs/columnas.
- `qa:flows` crea salas temporales y las cancela en `finally`; si una comprobación falla, fuerza la limpieza de esa sala antes de seguir con el otro escenario.
- `qa:cleanup` usa la función SQL `qa_cleanup()` (incluida en `docs/sql/2026-10-21-qa-hallazgos.sql`), porque `service_role` no tiene DELETE en movimientos, notificaciones, recargas, retiros ni participantes. Hasta aplicar ese SQL, la limpieza falla con un mensaje explícito.
- Requiere el servidor de QA en `:3001` para los probes HTTP: `npm run qa:serve`.
- Si `qa:probes` o `qa:flows` fallan, revisa `docs/ESTADO.md`: hay hallazgos de seguridad/picks que dependen de SQL pendiente.

## Apuestas de sala

```powershell
npm run qa:apuestas:local
npm run qa:apuestas:local -- --schema-real
npm run qa:cierre
npm run qa:apuestas:ui
```

- `qa:apuestas:local` crea y destruye un clúster PostgreSQL aislado en un directorio temporal y puerto libre; **no carga `.env.local` ni se conecta a Supabase**. Requiere PostgreSQL 16+; `PG_BIN` permite indicar su directorio `bin` (en Windows usa PostgreSQL 18 por defecto). Crea un esquema mínimo compatible, aplica la migración real dos veces y comprueba permisos/RLS, cobros, victorias Radiant/Dire, reembolsos, expiración, reintentos, concurrencia, débitos simultáneos y limpieza QA. No sustituye la validación contra las RPC existentes del servidor real.
- `qa:apuestas:ui` requiere Chrome CDP y la build en `:3001`. Abre una pestaña propia con sesión y respuestas Supabase **simuladas e interceptadas**: no manda escrituras a la base real. Comprueba landing, hero, datos de partida y modal en 1366×768, 390×844 y 360×800, selección de lado, publicar/cancelar/aceptar, saldo, errores, vacío, SQL pendiente, usuario sin sesión y Escape. Guarda capturas en `qa-artifacts/apuestas/ui/`. `QA_BASE` y `QA_CDP` permiten otros endpoints.
- Aplicar las migraciones en orden: `2026-10-23-apuestas-salas.sql` (ya aplicada por el usuario) y `2026-10-23-apuestas-publicas-sin-limite.sql` (ampliación). La prueba local aplica ambas y reaplica la ampliación para verificar idempotencia; ahora incluye 66 ofertas del mismo usuario, cruces legibles por anon y comisión inaccesible a los lectores públicos. La UI verifica paginación de todas las listas, múltiples ofertas y ambos avatares/nicks sin sesión. Comprobar con cuentas QA el cierre manual y automático existentes y después ejecutar `qa:cleanup`.

- `--schema-real` restaura los metadatos de `docs/schema/` (sin datos de usuarios), identidad, índices, funciones, triggers, RLS y permisos; reproduce claims de Auth y agrega las migraciones de historial/frecuencia. **23/23 casos**: además de apuestas, verifica cuotas, multa por ambas RPC, donaciones/retiros idempotentes, cierre real, saldo posterior, privacidad y corte a los 25 minutos. No reproduce GoTrue/Storage ni pg_cron/pg_net en Windows.
- `qa:cierre`: **13/13** validaciones del resultado antes de pagar, sin red ni saldo real. Node 22.18+ para cargar TypeScript sin dependencias adicionales.
- `docs/sql/2026-10-23-pruebas-revision.sql` es una integración remota explícita dentro de BEGIN/ROLLBACK, ya ejecutada con autorización: todos sus datos de prueba se revierten. No ejecutar `qa:cleanup` sobre usuarios normales ni confundir esos datos temporales con pagos reales.
- Worker programado: ver `docs/TRASPASO.md`, sección 25. La prueba remota de invocación devolvió 200 con Vault y 401 sin token; el cierre con partida externa real sigue siendo una prueba operativa pendiente.
- Ejecutar los harnesses de navegador **en serie**: usan el mismo origen/localStorage de Chrome CDP, por lo que `qa --login` y `qa:apuestas:ui` simultáneos pueden interferir en la sesión. UI de apuestas: 16/16, incluido el estado cerrado al minuto 25.

## Landing y siguiente paso

```powershell
npm run qa:inicio
npm run qa:landing:ui
```

- `qa:inicio`: 14 decisiones del recorrido inicial, sin red: Steam/MMR pendientes, MMR 0 válido, sala actual, cupos vacíos, usuarios recurrentes/admin y datos desconocidos. Incluido en CI.
- `qa:landing:ui`: Chrome CDP y build en `:3001`, ejecutado en serie con el resto de QA visual. 26 escenarios con fixtures HTTP: 1v1/5v5 en los tres estados activos, nombres largos, cruces públicos, mismos importes en destacada/tarjeta, guía inicial, errores/reintento, vacío, rondas de verificación y unión/regreso. Revisa 1366×768, 390×844 y 360×800, sin overflow, superposición del reloj ni SteamID visible y con tarjetas de dimensiones uniformes. A 1920×1080 y 1920×945 (alto útil de Chrome en monitor de 1080 px) comprueba las dos primeras completas sin scroll, importes/roster visibles, margen inferior pequeño, separación de 16 px y continuidad de la rueda sobre las tarjetas para visitante/admin/nuevo usuario. Incluye destacada vacía en tercera posición. Intercepta Supabase y `/api/*`; bloquea escrituras inesperadas. Capturas en `qa-artifacts/landing/ui-<timestamp>/`.

## Cuota y premio fijo de salas

- `npm run qa:premios`: 24 comprobaciones de céntimos, precisión, reparto y compatibilidad.
- `npm run qa:apuestas:local -- --schema-real`: incluye 14 casos nuevos; total 51. Aplica dos veces la migración de premios y verifica permisos, cuota/premio fijo, sin comisión, bonos, bloqueo con inscritos, condiciones antiguas al entrar, concurrencia y cierre sin pagos duplicados.
- `npm run qa:premios:ui`: 53 recorridos (incluye los paneles existentes) con SDK real y HTTP/Realtime simulado. No realiza escrituras remotas; capturas de crear/gestionar en output/qa-premios/capturas/ para los tres tamaños exigidos.
- Referencia actual: [Cuota y premio de salas](../../docs/PREMIOS-SALAS.md).

## Transmisión de Kick

- `npm run qa:kick:ui`: 26 recorridos en Chrome CDP, incluidos siete específicos del reproductor y su posición. Revisa 1920×945, 1366×768, 390×844 y 360×800; actividad vacía, carga, error, mensajes largos y 30 registros con scroll interno, sin desplazar Kick. Intercepta el iframe oficial con HTML estático para aislar el proveedor; la reproducción real se comprueba aparte en Chrome.
- Capturas: `output/qa-kick/capturas/`. Detalle y límites: [KICK.md](../../docs/KICK.md).
