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
