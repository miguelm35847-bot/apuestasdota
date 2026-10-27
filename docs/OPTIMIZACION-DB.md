# Índices y políticas — 27/10/2026

Aplicada en Supabase la migración `20261027114341_optimizacion_indices_y_politicas`, conservada en `supabase/migrations/` con la versión del historial remoto. El archivo se creó con la CLI y se aplicó mediante MCP después de verificarlo en PostgreSQL local desechable. No modifica filas, funciones de negocio ni grants.

| Comprobación | Antes | Después |
| --- | --- | --- |
| Claves foráneas sin índice de apoyo | 12 | 0 |
| Superposiciones de políticas permisivas | 7 | 1 |
| Tablas públicas sin RLS | 0 | 0 |
| Permisos por columna de anon/authenticated/service_role | Huella registrada | Idénticos |
| Índices nuevos válidos | — | 12, unos 200 KiB en conjunto |

## Índices

Se añadieron índices para las relaciones de actividades (emisor/receptor), donaciones (donante/receptor), ganador de apuestas, autor del chat, creador de movimientos, usuario de participantes, cierre de partidas, revisión de recargas, procesamiento de retiros y creador de salas.

El índice de participantes comienza por `user_id` y contiene `sala_id`, para cubrir las búsquedas de salas del usuario que hacen la campana y el aviso de verificación. La PK anterior comienza por sala y se conserva.

No se retiraron índices existentes. El asesor marca ahora 16 índices como no utilizados: los cuatro anteriores y los doce recién creados. Es un aviso INFO de uso observado; no es motivo para eliminar índices nuevos inmediatamente. Revisar su utilización con actividad representativa antes de decidir.

Las tablas reales siguen siendo pequeñas. En una prueba local con 5.002 participantes sintéticos, la consulta por usuario pasó de `Seq Scan` a `Index Only Scan`, con 47 → 3 bloques compartidos consultados. Este resultado demuestra la selección del índice con más filas; no mide una mejora de latencia en producción.

## Políticas

- Retiradas las lecturas redundantes `perfil propio o admin`, `salas visibles`, `participantes visibles` y `partidas visibles`. Ya estaban cubiertas por políticas públicas permisivas con `USING (true)`. La migración comprueba esa cobertura antes de retirarlas.
- En apuestas se conservan los cruces confirmados para visitantes. La política de usuarios autenticados incorpora la unión exacta anterior: confirmadas, pendientes, propias o administración.
- Las dos políticas de escritura del chat se agrupan. Sigue siendo obligatorio escribir como uno mismo; el chat de una sala exige participación en esa sala o administración.
- Las lecturas del chat general y del privado conservan sus audiencias distintas. Por eso permanece un aviso de superposición en `mensajes_chat:SELECT`.
- Las comprobaciones de administrador invariantes se evalúan mediante un subquery, igual que la identidad de usuario.

Los permisos privados de Steam y las restricciones de modificación de rol, bloqueo y MMR permanecen intactos. Las tablas internas con RLS sin políticas siguen cerradas. Los avisos existentes sobre RPC SECURITY DEFINER y protección de contraseñas filtradas no se modifican en esta tarea; no se cambiaron permisos de ejecución ni configuración de Auth.

## Verificación

`npm run qa:apuestas:local -- --schema-real` incluye ahora 37 casos: las 24 regresiones financieras anteriores y 13 de esta optimización. Compara lecturas antes/después para visitante, participante, usuario de otra sala, creador, aceptante, administrador y rol anon con un sub sintético de administrador. Compara también la matriz de escritura del chat, los grants, el rechazo de lectura de Steam, los datos y saldos, la idempotencia y la reversión completa cuando falta una política de cobertura.

La prueba de error retira una política solo dentro de la transacción local que se espera rechazar. Las semillas de rendimiento y permisos viven únicamente en esa base local; se retiran antes de las regresiones financieras. No se crearon usuarios, apuestas, mensajes ni movimientos de prueba en producción.

Después de aplicar se verificaron el historial de migraciones, índices válidos, asesores y equivalencia de grants. Se ejecutaron comprobaciones de solo lectura con los roles anon y authenticated para confirmar el aislamiento de chat y billeteras. TypeScript, lint y build correctos.

El SQL limita la espera de bloqueos a 2 segundos y la duración de sentencias a 30 segundos. Se utilizaron índices normales porque los tamaños de las tablas eran pequeños y se comprobó que no había transacciones largas; la aplicación fue transaccional.

Referencias: [claves foráneas sin índice](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [políticas permisivas superpuestas](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies), [rendimiento de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations).
