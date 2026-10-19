# Estado del Proyecto Apuestas Dota

## Hecho
- Proyecto Next.js 16.4.2 creado con TypeScript y Tailwind CSS
- Supabase instalado y configurado (.env.local + src/lib/supabase.ts)
- Esquema SQL completo ejecutado en Supabase (tablas, RLS, funciones)
- Sistema de autenticación implementado (AuthProvider + login)
- Verificación de admin en cliente (supabase.rpc('es_admin')) - mejora pendiente para producción
- Vinculación Steam funcionando (método OpenID)
- Landing pública (/) unificada: hero, salas activas e historial (navbar dinámica según auth)
- Página /jugador eliminada (todo se centraliza en /)
- Pantalla de recarga de saldo con subida de captura
- Trigger de saldo no negativo seguro contra carreras
- Pantalla de gestión de salas (admin asigna equipos, define lobby, termina partida)
- Verificación de partidas con API de Dota 2 (Steam Web API)
- Selección de equipo por jugadores (unirse_a_equipo)
- Perfil con pestañas (Historial, Recargas y retiros, Billetera)
- Historial global de partidas con jugadores por equipo
- Sistema de notificaciones con campana en navegación
- Notificaciones de aprobación/rechazo de recargas y retiros
- Nomenclatura Radiant/Dire en toda la interfaz
- Retiros (jugador + admin) con notificaciones
- Build de producción verificado sin errores

## Siguiente
- Ejecutar SQL: unirse_a_sala modificado (no unirse a dos salas simultáneamente)
- Ejecutar SQL: asignar_equipo modificado (admin gestiona cualquier sala abierta)
- Sistema de apuestas en partida
- Cierre automático de salas

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

## Archivos creados
- src/components/AuthProvider.tsx - Maneja sesión del usuario
- src/components/ProtectedRoute.tsx - Protege rutas de admin
- src/components/SaldoDisplay.tsx - Muestra saldo del usuario
- src/app/login/page.tsx - Página de inicio de sesión
- src/app/register/page.tsx - Página de registro
- src/app/admin/page.tsx - Panel de administrador
- src/app/jugador/page.tsx - Panel de jugador
- src/app/perfil/page.tsx - Perfil con vinculación Steam
- src/app/recargar/page.tsx - Recarga de saldo con captura
- src/app/page.tsx - Redirige a login o admin según sesión
- src/app/layout.tsx - Layout principal con AuthProvider
- src/lib/supabase.ts - Cliente de Supabase
- src/lib/steam.ts - Verificación OpenID de Steam
