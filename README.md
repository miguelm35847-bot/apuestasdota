# KódigoDota

Comunidad de Dota 2 con salas 1v1/5v5, draft por capitanes, perfiles, chat y operaciones de saldo. Web publicada: [www.kodigodota.com](https://www.kodigodota.com).

Next.js 16.4.2 App Router · React 19 · TypeScript · Tailwind CSS v4 · Supabase Auth/Postgres/Realtime. Node 22.x en CI y Vercel; gestor del repositorio: npm con `package-lock.json`.

## Para retomar el trabajo

Leer primero [docs/ESTADO.md](docs/ESTADO.md): estado vigente, mantenimiento terminado y pendientes reales. Seguir [AGENTS.md](AGENTS.md). La [referencia técnica](docs/TRASPASO.md) conserva implementaciones históricas; consultar la sección necesaria y contrastarla con el código actual. Registrar cambios al final de [HISTORIAL.md](docs/HISTORIAL.md).

## Desarrollo local

Instalar las dependencias con Node 22.x:

```powershell
npm ci
npm run dev
```

La aplicación abre en [localhost:3000](http://localhost:3000). Se necesita un `.env.local` privado del entorno autorizado con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`; las APIs privilegiadas y Steam requieren además su configuración de servidor. Usar `NEXT_PUBLIC_APP_URL` del entorno correspondiente. Consultar [registro social](docs/REGISTRO-SOCIAL.md) y [dominio](docs/DOMINIO.md) para los retornos. No guardar claves de servicio, sesiones ni credenciales de jugadores en Git.

La instalación de paquetes no crea una base funcional nueva: el proyecto utiliza un esquema y migraciones existentes. `docs/schema/` contiene fixtures para pruebas; los SQL históricos de `docs/TRASPASO.md` no son instrucciones para reaplicar sobre producción.

## Estructura

| Ubicación | Contenido |
| --- | --- |
| `src/app/` | Rutas, controladores de páginas y APIs. |
| `src/components/` | Componentes y paneles de salas/admin y perfil. [Mapa](docs/ESTRUCTURA-UI.md). |
| `src/lib/` | Tipos, reglas compartidas, autenticación y clientes de datos. |
| `supabase/migrations/` | Migraciones versionadas recientes; las anteriores y snapshots están en `docs/sql/` y `docs/schema/`. |
| `supabase/functions/arena-worker/` | Trabajador de cierre de partidas de Supabase. |
| `scripts/qa/` | Pruebas puras, PostgreSQL desechable y navegador por CDP. |
| `public/` | Marca, iconos, medallas, imágenes y verificación de Google. |

## Comprobar cambios

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

La [verificación de GitHub](.github/workflows/ci.yml) ejecuta además regresiones de lógica, Deno y PostgreSQL. Para UI, iniciar la build en un terminal con `npm run qa:serve` y disponer de un Chrome de QA con `--remote-debugging-port=9222` y perfil separado. En otro terminal:

```powershell
npm run qa -- --base http://127.0.0.1:3001 --url / --url /login
npm run qa:paneles:ui
```

El QA general usa 1366×768, 390×844 y 360×800; `--login` usa `QA_EMAIL`/`QA_PASSWORD` privados. La suite de paneles intercepta HTTP/Realtime y no escribe a proveedores reales. Ejecutar suites de navegador en serie. `QA_BASE` cambia el origen y `QA_SHOTS` el destino de capturas de paneles.

`npm run qa:apuestas:local` y su variante `-- --schema-real` arrancan PostgreSQL desechable; requieren binarios locales (configurables con `PG_BIN`). En cambio, `qa:seed`, `qa:probes`, `qa:flows` y `qa:cleanup` operan sobre el Supabase configurado: utilizarlos solo dentro de una verificación integrada autorizada. Conservar los SQL y snapshots que reconstruyen las pruebas.

## Publicación y documentación

Los envíos autorizados a `main` activan GitHub Actions y la integración de Vercel del proyecto `kodigodota`. Comprobar ambos resultados y el commit del despliegue en [Vercel](https://vercel.com/kodigodota/kodigodota); una build READY no sustituye la verificación de GitHub. El dominio principal usa www. Documentos y artefactos de QA están excluidos del paquete web por `.vercelignore`.

El [estado vigente](docs/ESTADO.md) enlaza las guías de dominio, Google, acceso social, Discord, hero, base de datos y estructura de UI. El marcador de Dota todavía usa datos de demostración identificados como tales; la integración real de Valve y la prueba externa de cierre siguen pendientes.
