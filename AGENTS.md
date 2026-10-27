<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Flujo de trabajo

- **Docs**: empieza por `docs/ESTADO.md` (estado vigente). De `docs/TRASPASO.md` abre solo la sección que necesites. `docs/HISTORIAL.md` es bitácora append-only: no reescribas entradas antiguas, agrega al final.
- **Next.js**: lee `node_modules/next/dist/docs/` solo si el cambio toca routing, datos, caché, configuración o APIs de Next. Para CSS/Tailwind no hace falta.
- **Ambigüedad**: si un pedido de UI admite dos lecturas, declara la interpretación en una línea antes de codificar, o pregunta.
- **Verificación obligatoria antes de commit**:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`
  - UI: `npm run qa -- --base http://127.0.0.1:3001 --url /` en 1366x768, 390x844 y 360x800 (añade `--hover`, `--url`, `--expect` o `--shot` según el cambio). Requiere Chrome con `--remote-debugging-port=9222` y `npm run qa:serve`. Para flujos con sesión añade `--login` (usa `QA_EMAIL`/`QA_PASSWORD` de `.env.local`).
  - Lógica/datos: suma casos de error, vacío y permisos a la verificación.
- **Commits**: uno por tarea; revisa el diff y commitea los cambios verificados dentro del alcance autorizado. No pidas otra aprobación para cambios, commits o publicaciones que el usuario ya autorizó. No acumules tareas sobre un árbol sucio.
- **Límites**: no exponer `steam_id` ni datos privados; no agregar SQL, dependencias ni MCPs salvo necesidad justificada.
