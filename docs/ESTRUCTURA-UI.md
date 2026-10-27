# Paneles de salas y perfil

Actualizado: 27/10/2026. Paso 4 de la revisión general.

Las páginas conservan estado, consultas, permisos, validaciones y acciones. Los paneles reciben datos y callbacks tipados. Los refrescos compartidos del paso 2 siguen en `src/lib/useRefrescoSala.ts`.

| Página | Presentación | Líneas antes → después |
| --- | --- | --- |
| `src/app/salas/[id]/page.tsx` | `src/components/salas/`: cabecera, roles, lobby, columnas y tablero de picks | 1.821 → 920 |
| `src/app/admin/salas/[id]/page.tsx` | `src/components/salas/admin/`: cabecera, equipos/capitanes, configuración y cierre | 1.644 → 916 |
| `src/app/perfil/page.tsx` | `src/components/perfil/`: identidad, perfil competitivo, navegación, historial, solicitudes y billetera | 1.167 → 497 |

Los tipos del perfil y de confirmación administrativa se encuentran en `tipos.ts` dentro de sus carpetas. La paleta de equipos se comparte mediante `salas/tonosEquipo.ts`; los SVG están en `salas/IconosEquipo.tsx`.

## Correcciones de carga

- El efecto de historial compartía dependencias con billetera. Cada respuesta del historial cambiaba `misPartidas`, recreaba el callback de billetera y volvía a cargar historial. Reproducido en la compilación anterior con respuestas simuladas. Ahora cada pestaña tiene su propio efecto y dependencias; la regresión comprueba que las consultas se estabilizan.
- `Ficha` estaba definida dentro del tablero de picks. Cada actualización del contador creaba un tipo de componente nuevo y remontaba los resúmenes. `FichaPicks` vive ahora en el ámbito del módulo y recibe el usuario como prop. La prueba comprueba que el contador no vuelve a consultar resúmenes.

## Verificación

`npx tsc --noEmit`, `npm run lint` y `npm run build` correctos. Comparadas las implementaciones de las 41 funciones de negocio existentes en los tres controladores antes y después de extraer los paneles. Las dos acciones de configuración de cierre pasan de callbacks inline a funciones del controlador, manteniendo campos y manejo de errores.

Con Chrome en el puerto 9222 y `npm run qa:serve`:

```powershell
npm run qa:paneles:ui
npm run qa -- --base http://127.0.0.1:3001 --url / --url /login
```

La suite de paneles suma 38 recorridos: refrescos y Realtime; permisos y acceso sin sesión; historial, signos y estados monetarios; registro único de MMR, edición de roles y rechazo del guardado; estados vacíos y error de lectura; selección de lado 1v1/5v5; draft y turno ajeno; cancelación administrativa descartada, capitanes, Auto y verificación de partida. Incluye capturas y comprobación de desborde en 1366×768, 390×844 y 360×800.

El SDK y los componentes son reales; HTTP y Realtime están interceptados en la suite. No se envían acciones de prueba a Supabase, no se cierran partidas ni se mueven saldos reales. La comprobación valida la interfaz y sus peticiones simuladas; no sustituye la integración con proveedores reales. `QA_BASE` permite repetirla sobre un despliegue y `QA_SHOTS` elegir el destino de las capturas.

Sin migraciones, dependencias nuevas ni cambios en fórmulas de pago.
