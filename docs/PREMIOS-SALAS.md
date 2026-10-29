# Cuota y premio de las salas

Implementación del 29/10/2026. La administración define dos importes en soles, con hasta dos decimales: la **cuota de cada jugador** y el **premio de cada jugador ganador**. El premio es el abono total e incluye la cuota aportada, no una ganancia adicional.

## Crear y gestionar

- **Crear sala**, tanto desde la portada como desde `/salas`, usa los mismos campos. La modalidad determina dos participantes y un ganador en 1v1, o diez participantes y cinco ganadores en 5v5.
- **Gestionar sala → Cuota y premio** permite guardar los nuevos importes mientras la sala esté abierta y vacía. Una sala con inscritos, llena o en juego conserva las condiciones que aceptaron los jugadores. Tras salir todos con sus reembolsos, una sala abierta puede editarse de nuevo.
- El resumen muestra la recaudación con cupo completo, el total de premios y la diferencia para la casa. Si la diferencia es cero, indica **Sin comisión**; si es negativa, indica el **Bono de la casa**, en total para la sala.

Ejemplos en 5v5:

| Cuota por jugador | Premio por ganador | Recaudación | Total de premios | Diferencia |
| --- | --- | --- | --- | --- |
| S/ 11 | S/ 20 | S/ 110 | S/ 100 | S/ 10 para la casa |
| S/ 6 | S/ 10 | S/ 60 | S/ 50 | S/ 10 para la casa |
| S/ 6 | S/ 12 | S/ 60 | S/ 60 | Sin comisión |
| S/ 6 | S/ 15 | S/ 60 | S/ 75 | Bono total de S/ 15 a cargo de la casa |

La cuota mínima continúa siendo S/ 1; el premio debe ser positivo. El límite técnico garantiza que los totales de diez participantes sean enteros exactos en JavaScript. Los bonos son un compromiso de pago de la casa; no descuentan saldo del perfil del administrador ni crean una recarga.

## Datos y pagos

La migración [premios_fijos_salas](../supabase/migrations/20261029205220_premios_fijos_salas.sql) es necesaria para almacenar un premio independiente, incluidos bonos que el porcentaje anterior no representaba. La versión local coincide con la registrada por Supabase al aplicarla.

- `salas.premio_por_ganador`: céntimos enteros. `NULL` conserva el cálculo anterior por comisión para las salas existentes y los consumidores de `crear_sala`.
- `crear_sala_con_premio`: crea una sala con los importes explícitos; solo administradores.
- `admin_actualizar_importes_sala`: valida importes, estado y ausencia de participantes dentro del bloqueo de la fila; solo administradores.
- `unirse_a_sala_con_importes`: comprueba dentro del mismo bloqueo que la cuota y el premio coincidan con lo que veía el jugador. Si cambiaron, rechaza la entrada sin cobrar y la interfaz actualiza las condiciones.
- `cerrar_partida`: paga exactamente el premio fijo a cada ganador. Para salas anteriores conserva la fórmula y los céntimos de redondeo originales. La misma RPC sigue siendo utilizada por el cierre automático.
- `partidas.comision`: conserva el nombre histórico y registra la diferencia entre lo recaudado y lo pagado. Un valor negativo representa el bono asumido por la casa; `ganancias_casa()` lo incluye con su signo.

Las funciones nuevas tienen `search_path` vacío, referencias calificadas y ejecución reservada a `authenticated`, con validación de administración donde corresponde. La escritura directa de salas continúa protegida por permisos/RLS. La migración no cambia importes de salas existentes ni movimientos previos.

La revisión de advisors identifica las tres RPC nuevas por usar `SECURITY DEFINER` con ejecución autenticada, intencional para operar con las tablas protegidas. Se verificaron los controles internos y el rechazo a jugadores/anon según la operación; no se concedió escritura directa ni ejecución anónima. Los avisos previos del proyecto se mantienen fuera del alcance de este cambio.

Publicar primero la migración y después el frontend. No retirar la columna ni las RPC anteriores durante una reversión de interfaz: son compatibles con la versión previa.

## Verificación

- `npx tsc --noEmit`, `npm run lint` y `npm run build` correctos.
- `npm run qa:premios`: 24 comprobaciones de importes, formato, precisión, reparto y compatibilidad.
- `npm run qa:apuestas:local -- --schema-real`: 51 casos con PostgreSQL desechable. Incluye permisos, entradas con condiciones antiguas, edición concurrente, cierre duplicado, 1v1/5v5, ambos ejemplos solicitados, salas sin comisión, bonos y redondeos de salas anteriores. La migración se aplica dos veces.
- `npm run qa:premios:ui`: 53 recorridos con SDK real y HTTP/Realtime simulados. Crear, gestionar, guardar, error de permisos, formulario vacío, bloqueo de importes, entrada con condiciones cambiadas y presentación en 1366×768, 390×844 y 360×800.
- `npm run qa -- --base http://127.0.0.1:3001 --url / --login --shot output/qa-premios/general`: 3/3 vistas, sin desbordes ni errores de consola.
- Capturas de creación/gestión en `output/qa-premios/capturas/`. Las pruebas financieras usan únicamente PostgreSQL local; la prueba general con sesión no crea salas ni realiza cobros.
