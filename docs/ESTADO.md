# Estado de KódigoDota

Actualizado: 27/10/2026. Punto de entrada para retomar el proyecto. El detalle de cambios está en [HISTORIAL.md](HISTORIAL.md); [TRASPASO.md](TRASPASO.md) conserva referencia técnica e implementaciones históricas.

## Producción y entorno

- Web principal: [www.kodigodota.com](https://www.kodigodota.com). El dominio raíz redirige con 308 a www; `NEXT_PUBLIC_APP_URL` de Production usa ese origen.
- Repositorio: [miguelm35847-bot/apuestasdota](https://github.com/miguelm35847-bot/apuestasdota). Los envíos autorizados a `main` activan la integración GitHub/Vercel del proyecto `kodigodota`, equipo del mismo nombre.
- Verificar por separado el commit y estado de [Vercel](https://vercel.com/kodigodota/kodigodota) y la [verificación de main](https://github.com/miguelm35847-bot/apuestasdota/actions/workflows/ci.yml?query=branch%3Amain). Una publicación READY por sí sola no confirma el resultado de GitHub. Los identificadores de despliegues anteriores son evidencia histórica, no la versión vigente.
- Stack: Next.js 16.4.2 App Router, React 19, TypeScript, Tailwind CSS v4 y Supabase Auth/Postgres/Realtime. CI y Vercel usan Node 22.x. Fuentes Manrope/Sora y Geist Mono.
- Entorno privado en `.env.local`, fuera de Git. Las claves de servicio y los identificadores privados de Steam se usan solo en servidor; no copiarlos a documentación, capturas ni mensajes.

## Mantenimiento del 27/10/2026

| Paso | Estado | Resultado y referencia |
| --- | --- | --- |
| 1. Verificación de GitHub | Completado | Build sin clave de servicio; clientes privilegiados creados al atender peticiones; PostgreSQL de QA en Linux usa TCP. Google, Steam y chat incluidos en CI. |
| 2. Consultas de salas | Completado | Tres lecturas paralelas y carga compartida jugador/admin. Pausa al ocultar, respaldo de Realtime 30 s conectado / 5 s desconectado y descarte de respuestas antiguas. Sondeo estable aproximado: 48 → 6 lecturas/minuto conectado, sin inicio ni eventos. |
| 3. Índices y políticas | Completado | Doce índices nuevos; FK sin índice 12 → 0 y superposiciones 7 → 1 intencional en chat. Grants conservados. [Detalle](OPTIMIZACION-DB.md). |
| 4. Estructura de salas y perfil | Completado | Diecisiete módulos visuales; corregidos ciclo de historial y remontajes de fichas del draft. [Mapa y QA](ESTRUCTURA-UI.md). |
| 5. Documentación | Completado | Estado y pendientes separados, README adaptado y referencias antiguas señaladas. Se conservan historial, SQL y fixtures. |
| 6. Limpieza local | Completado | Liberados unos 718 MiB (753 MB) netos después de verificar la compilación. Retiradas dos cachés antiguas y tres perfiles temporales de QA cerrados; conservados servidor/desarrollo, dependencias, worktrees, capturas, informes e imágenes/ZIP solicitados. |

Limpieza comprobada contra rutas absolutas, ausencia de procesos que usen los objetivos y enlaces, y hashes de los 12 entregables de imágenes/metadatos/ZIP. El servidor del puerto 3000 conserva su proceso y responde 200; `.next/dev` sigue en uso. Las dependencias de ambos checkouts siguen siendo necesarias para trabajar. Tipos/lint/build correctos tras limpiar; se conserva la caché nueva de unos 47 MiB generada por esa compilación, ya descontada del ahorro. Liberar disco local no cambia el rendimiento de producción.

## Funcionalidades disponibles

- **Cuenta y perfil**: correo/contraseña y recuperación operativa; Google y Steam publicados y probados por el propietario. Steam conserva el UUID vinculado; alta nueva pide nick y deja MMR pendiente. Perfil con MMR de registro único, roles editables, saldo, recargas/retiros e historial de partidas terminadas con resultado. Perfil público con estadísticas y enlaces sin revelar el identificador privado de Steam. [Registro social](REGISTRO-SOCIAL.md).
- **Salas y verificación**: 1v1/5v5, equipos, lobby, gestión admin y aviso global “Estoy listo”. Verificación automática al llenar y solicitud manual explícita también con cupos libres. Una ronda completa no se reabre al entrar otro jugador; una automática pierde vigencia al perder el cupo completo y una sala vacía limpia la ronda. Se descartan avisos antiguos, confirmados, expirados y jugadores que salieron.
- **Draft**: 1v1 lanza moneda después de ambas confirmaciones y el ganador elige lado. En 5v5 el admin guarda capitanes; moneda con avatares y elección Radiant/LastPick. Ocho picks R-DD-RR-DD-R, 45 s por turno y auto-pick por mayor MMR. Preferencia de lado informativa; resumen público de OpenDota en espera, medallas y roles en fichas.
- **Operaciones**: cuotas, recargas/retiros, multas, donaciones y apuestas de sala; importes enteros en céntimos. Autoridad y movimientos en RPCs con controles de usuario/admin, concurrencia e idempotencia. Apuestas públicas paginadas sin límite total; aceptación hasta el minuto 25 validada en servidor. Billetera en perfil; `/mi-actividad` fue retirada.
- **Cierre persistente**: `arena-plazos` cada 5 s resuelve vencimientos/auto-picks; `arena-cierre` cada minuto invoca `arena-worker`, autenticado con token interno en Vault. No depende de pestañas abiertas. Auto exige habilitación, ID exacto asociado y resultado final verificable con jugadores/lados correctos. Si faltan datos públicos, queda disponible el cierre manual.
- **Comunidad**: chat general y privado de sala, actividades, donaciones desde perfiles/tarjetas, campana y sonidos. Historial inicial del chat silencioso y mensajes nuevos deduplicados. Discord permanente con icono a la izquierda del pie. [Comunidad](COMUNIDAD-DISCORD.md).
- **Presentación y SEO**: Arena Dark, hero Convergencia de los Ancestros, laterales y tarjetas adaptadas a PC/móvil; dos primeras salas completas en el alto de escritorio validado. Marca, favicon, guía, privacidad y términos publicados. Canonical, robots y sitemap de cinco páginas públicas; cuenta/pagos/admin/API/demo fuera de indexación. Propiedad Search Console confirmada. [Hero](HERO-CONVERGENCIA.md), [cielo](HERO-CIELO.md), [Google](GOOGLE.md).
- **Marcador de partida**: hero, tarjetas y `/salas/[id]/partida` muestran datos de demostración identificados como tales. No representan una conexión real de Valve ni se usan para liquidar pagos.

## Pendientes reales

| Trabajo | Qué falta | Dependencia |
| --- | --- | --- |
| Datos de Dota en vivo | Sustituir `src/lib/vivoMock.ts` por la integración real y verificar todos los marcadores. | Aprobación e ID de liga/ticket de Valve; integración aparte del mantenimiento. |
| Cierre automático real | Completar una prueba operativa con ID exacto, resultado público y participantes/lados verificables. Worker, permisos y regresiones ya comprobados. | Partida elegible y cuentas Steam vinculadas. QA local/simulado no prueba el pago externo real. |
| Pruebas operativas | Alta con otro Steam real, recorrido 5v5 completo por jugadores y multa de abandono. MMR/roles, picks, error y permisos ya tienen QA de interfaz; draft y multa tienen pruebas PostgreSQL. | Participación del propietario/jugadores; no crear movimientos reales solo para completar una lista de QA. |
| Search Console | Confirmar envío del sitemap y solicitud de indexación; observar el resultado. | Cuenta del propietario. [Pasos](GOOGLE.md). |
| Marca de Google | Confirmar verificación/publicación del nombre y logo. El acceso real y audiencia En producción ya fueron confirmados. | Google Auth Platform del propietario. [Estado](REGISTRO-SOCIAL.md). |

Opciones que requieren decidir alcance: Facebook aún no implementado; automatizar lobbies con un bot es un módulo independiente; revisar `/api/admin/verify` como ruta heredada solo después de descartar consumidores externos. La protección de contraseñas filtradas estaba deshabilitada en la revisión del 27/10; evaluar plan y activación según la [documentación de Supabase](https://supabase.com/docs/guides/auth/password-security), sin cambiar la cuenta ni contratar servicios en esta tarea.

## Verificación y trabajo local

- Antes de commit: `npx tsc --noEmit`, `npm run lint` y `npm run build`. UI: `npm run qa -- --base http://127.0.0.1:3001 --url /` en 1366×768, 390×844 y 360×800, más rutas/acciones afectadas. Añadir error, vacío y permisos cuando corresponda.
- Desarrollo: `npm run dev` en 3000. QA: build con `npm run qa:serve` en 3001 y Chrome CDP en 9222; ejecutar suites de navegador en serie. No detener procesos ajenos ni limpiar la caché de un servidor activo.
- `npm run qa:paneles:ui`: 38 recorridos con SDK real y HTTP/Realtime simulados, comprobados localmente y sobre producción en el paso 4; sin escrituras a proveedores reales. `qa:refresco:ui` conserva su subconjunto de 19 casos.
- CI: tipos/lint/build, 120 casos puros (cierre/inicio/Google/Steam/chat/refresco), Deno y PostgreSQL desechable: 18 casos mínimos + 37 con esquema real. Cifras de las suites actuales y la ejecución del paso 4; no son prueba de carga ni autorización real de terceros.
- `qa:seed`, `qa:probes`, `qa:flows` y `qa:cleanup` usan Supabase y actores QA; pueden crear cuentas y operaciones. Reservarlos para una verificación integrada autorizada. `qa:apuestas:local`, `qa:steam:db` y `qa:steam:server` usan PostgreSQL local desechable.
- Conservar `docs/schema/`, `docs/sql/`, `supabase/migrations/`, HTML de Google y entregables solicitados de `output/`. Los snapshots/SQL reconstruyen las regresiones. `output/` y `qa-artifacts/` están excluidos de Git, lint, tipos, Tailwind y despliegue.

## Documentación de consulta

- [README del proyecto](../README.md): arranque, estructura, verificaciones y publicación.
- [HISTORIAL.md](HISTORIAL.md): bitácora append-only; agregar entradas sin reescribir las anteriores.
- [TRASPASO.md](TRASPASO.md): referencia técnica y snapshots históricos; abrir solo la sección necesaria. No es una cola de SQL por ejecutar.
- [OPTIMIZACION-DB.md](OPTIMIZACION-DB.md) y [ESTRUCTURA-UI.md](ESTRUCTURA-UI.md): mantenimiento del 27/10.
- [REGISTRO-SOCIAL.md](REGISTRO-SOCIAL.md), [DOMINIO.md](DOMINIO.md), [GOOGLE.md](GOOGLE.md) y [COMUNIDAD-DISCORD.md](COMUNIDAD-DISCORD.md): configuración y estado por servicio.
