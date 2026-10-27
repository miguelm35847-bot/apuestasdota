# Referencia técnica — KódigoDota

Documento de referencia del proyecto: esquema SQL, archivos, flujos y verificaciones detalladas. Ya no es un documento de traspaso entre chats.

> Estado vigente y pendientes: [ESTADO.md](ESTADO.md). Bitácora: [HISTORIAL.md](HISTORIAL.md). Arranque y QA: [README](../README.md).
> Las secciones fechadas conservan el contexto de su implementación, incluidos pendientes que se resolvieron después. No representan el estado actual de producción. Las verificaciones nuevas se anotan en el historial.
> Los bloques SQL son snapshots históricos, no una lista para pegar en Supabase. Antes de cualquier migración, contrastar el código, `supabase/migrations/`, `docs/sql/` y el historial remoto. Conservar también `docs/schema/`: participa en las regresiones locales.

## 0. Landing cinematográfico, rebrand KódigoDota y hero de imagen única (20–21/10/2026)

- El landing se rediseñó tomando como referencia la composición cinematográfica que mostró el usuario: hero full-bleed, wordmark blanco, tarjeta de sala destacada en vidrio, barra de stats a todo el ancho y tarjetas de salas con arte de facción.
- **La marca KódigoDota y su símbolo K son del usuario**; se incorporó `public/kodigodota-mark.svg` para el navbar. La marca visible usa **KódigoDota** con D mayúscula.
- El usuario aportó el arte de fondo generado (indicó que no tiene autor): Shadow Fiend a la izquierda, Phantom Assassin a la derecha y la bandera de Dota al centro. Se integró como **una sola imagen**, `public/hero-arena.jpg`, a sangre en el hero; se descartaron los tres recortes y `public/arena-rift.svg`. La imagen se muestra con `object-cover` y encuadre `center 25%`, brillo/contraste y degradados; en escritorio se ven los personajes y la bandera, y en móvil el recorte central conserva la bandera y el ambiente. No se copió la interfaz de la captura de referencia.
- El logo Dota volvió al tratamiento previo: glifo blanco `IconDota` en la sala destacada y glifo rojo `public/dota2.svg` en las tarjetas de `SalasPublicas`. El componente `DotaTile` (ficha roja degradada) se eliminó.
- Archivos principales: `src/components/HeroArena.tsx`, `src/components/SalasPublicas.tsx`, `src/components/SalasProvider.tsx`, `src/lib/salas.ts`, `src/components/Navbar.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `public/kodigodota-mark.svg` y `public/hero-arena.jpg`.
- La carga de salas del landing se unificó en `SalasProvider`: una consulta de `salas` + `participantes_sala`, una suscripción Realtime (`landing-salas`) y polling de respaldo; `HeroArena` y `SalasPublicas` consumen `useSalas()`. `SalasPublicas` muestra las 10 más recientes y el hero usa el total para stats y sala destacada. Verificado con Chrome/Network: 1 request de cada tabla y 1 WebSocket.
- Paleta y acciones: CTAs principales blancos con texto oscuro, “Ir a mi sala” en emerald, acentos de sala destacada en dorado, Navbar casi negro con la marca K en blanco y saldo en pill neutro con acento ámbar.
- Layout: Navbar, contenido y barra de stats comparten un máximo de 1500 px; el hero se centra a 1040 px en `xl` y 1200 px en `2xl` para dejar espacio a los personajes. El CTA autenticado “Ver salas activas” navega a `#salas` (`scroll-mt-24`).
- El hero usa una sola imagen full-bleed; en escritorio se ven Shadow Fiend, Phantom Assassin y la bandera, y en móvil el recorte central mantiene la bandera y el ambiente. El copy se compactó a **“JUEGA · COMPITE · GANA”**; se eliminó la nota de retiros y la fila Radiant/Dire/MMR. Las viñetas y degradados respetan `prefers-reduced-motion` (las animaciones se desactivan).
- Verificado con Chrome headless: 504 px de hero en 1366×768, 1440×1000, 1280×800 y 1600×900; 748 px en 390×844 y 747 px en 360×800; sin overflow horizontal ni errores de consola. `prefers-reduced-motion: reduce` deja todas las animaciones en `none` y las partículas en opacidad 0.3.
- **Sin SQL nuevo** para el rediseño. Toda la funcionalidad de salas, unirse, admin y sala destacada se conserva.

## 0.1 Guía pública “Cómo jugar” y reglas (21/10/2026)

- Ruta pública: `/como-jugar`. Una sola página con dos secciones ancladas: `#como-jugar` (7 pasos) y `#reglas` (9 reglas). No existe una ruta `/reglas` separada; los enlaces “Reglas” usan `/como-jugar#reglas` para no duplicar contenido.
- Portada Arena Dark con chips (1v1/5v5, Yape/Plin, MMR real, premios), 7 pasos desde crear cuenta/vincular Steam hasta cierre/premio, checklist “Antes de entrar”, las 9 reglas en el orden aportado por el usuario, resumen sticky de tiempos/penalidades y aclaración de que KódigoDota o un administrador actúan como anfitriones/admin de la sala.
- Reglas conservadas sin cambiar tiempos ni porcentajes: MMR falso = toda la apuesta; 2 min de pausa por equipo en picks; pausas ilimitadas de KódigoDota o un administrador con justificación; 2 min de tolerancia sin picks y luego RMK + 50% de la casada al pozo; 10 min de tolerancia por equipo para desconexiones tras los picks; cada pausa cuenta como 1 min; desconexión antes de 10 min = casada completa al equipo contrario; pausa en TF sin desconexión = 10% de la casada o de la ganancia; no quitar pausas hasta resolver el motivo.
- Landing: enlaces “Cómo jugar” y “Reglas” en el navbar de escritorio junto a Historial y en el hero para tablet/móvil; se retiró la tarjeta de guía y los enlaces del footer para no duplicar. “Reglas” apunta a `/como-jugar#reglas`. Sin cambios en salas, auth, perfil ni admin.
- Verificación con Chrome headless en 1366×768, 390×844 y 360×800: sin overflow horizontal ni errores de consola; 7 pasos, 9 reglas y 6 enlaces de guía en el landing; `/como-jugar` responde 200. `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan. Sin librerías ni SQL nuevos.

## 1. Qué es

Aplicación web de salas de apuestas de Dota 2 para Perú:

- Registro/login con Supabase Auth.
- Vinculación de cuenta Steam (OpenID).
- Billetera en céntimos (enteros) y movimientos inmutables.
- Recargas por Yape/Plin con captura y aprobación del admin.
- Retiros con aprobación del admin.
- Salas 1v1 y 5v5 con lista de espera, equipos Radiant/Dire y lobby.
- Cierre de partida con verificación manual por Steam Web API.
- Historial global y por jugador.
- Chat general en el landing y chat privado por sala.
- Notificaciones dentro de la web.

## 2. Stack y entorno

- Next.js 16.4.2 (App Router, Turbopack) + TypeScript + Tailwind CSS v4.
- Supabase (Postgres + Auth + Realtime + Storage).
- Proyecto Supabase: `rxkzqcxjtfxzxhkhezxr`.
- Variables en `.env.local` (NO commitear):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STEAM_API_KEY`
- Comandos: `npm run dev`, `npm run build`, `npm run lint`.
- Ruta de la app: `C:\Users\Usuario\Apuestasdota`.

## 3. Reglas del proyecto

1. El dinero se maneja **solo en el servidor** con funciones `rpc`. Nunca insertar/actualizar tablas de dinero desde el cliente.
2. Todos los montos son **céntimos enteros**.
3. La tabla `movimientos_billetera` es inmutable (solo `insert`).
4. Los cambios de SQL los ejecuta el usuario manualmente en el SQL Editor de Supabase. El asistente no puede ejecutar SQL.
5. Errores y textos en español.
6. Un módulo por vez; proponer un plan corto y esperar aprobación.
7. No agregar librerías sin preguntar.
8. Leer y actualizar `docs/ESTADO.md` al terminar cada módulo.

## 4. Modelo de datos relevante

- `profiles`: `id`, `nick`, `rol` (`admin`/`jugador`), `baneado`, `steam_id`, `steam_avatar_url`, `steam_nombre`, `mmr` (público), `roles_preferidos` (array de `carry`/`mid`/`off`/`roamer`/`support`, hasta 3 en orden; opcional).
- `salas`: `id`, `nombre`, `cuota`, `cupo`, `comision_bp`, `modalidad` (`1v1`/`5v5`), `estado`, `creado_por`, `iniciada_at`, `picks_estado` (`inactivo`/`eleccion`/`en_curso`/`terminado`), `pick_capitan1`, `pick_capitan2`, `pick_ganador_moneda`, `pick_decision_user_id`, `pick_decision_tipo` (`moneda`/`lado`), `pick_primer_user_id`, `pick_turno_user_id`, `pick_turno_expira_at`.
- `participantes_sala`: `sala_id`, `user_id`, `equipo` (nullable), `es_capitan`, `pick_orden`. `equipo = null` significa **lista de espera**; 1 = Radiant; 2 = Dire.
- `lobbies`: `sala_id` (único), `nombre`, `clave`.
- `partidas`: `sala_id`, `dota_match_id`, `equipo_ganador`, `pozo`, `comision`, `premio_por_ganador`, `cerrada_por`, `duracion_segundos`, `radiant_score`, `dire_score`, `detectada_auto`.
- `movimientos_billetera`: `user_id`, `tipo`, `monto`, `referencia_id`, `descripcion`, `creado_por`.
- `notificaciones`: `user_id`, `tipo`, `mensaje`, `leida`, `created_at`.
- `mensajes_chat`: `sala_id` (null = chat general), `user_id`, `mensaje`, `created_at`.
- La tabla `perfiles_dota` quedó obsoleta: el MMR y los roles ahora viven en `profiles` (públicos). El SQL de migración la elimina.

Estados de sala: `abierta`, `llena`, `en_juego`, `terminada`, `cancelada`.

## 5. Funciones SQL existentes

- `crear_sala(p_nombre, p_cuota, p_cupo, p_comision_bp)` — cupo 2 = 1v1, cupo 10 = 5v5. Guarda `modalidad`.
- `unirse_a_sala(p_sala)` — cobra la cuota e inserta al jugador en **lista de espera** (`equipo = null`). Si se llena, pasa a `llena`.
- `guardar_perfil_competitivo(p_mmr, p_roles)` — registra el MMR una sola vez y guarda los roles del usuario autenticado sin abrir un UPDATE general en `profiles`. Si el MMR ya existe y `p_mmr` es distinto, lanza error. Se usa en `Mi perfil` para el primer registro.
- `guardar_roles_preferidos(p_roles)` — edita solo los roles del usuario autenticado (no toca el MMR). La usan `Mi perfil` (cuando el MMR ya está registrado) y la sala.
- `admin_editar_mmr(p_user, p_mmr)` — solo admin: corrige el MMR de cualquier usuario (antifraude/boosters).
- `admin_renombrar_sala(p_sala, p_nombre)` — solo admin: cambia el nombre de una sala activa (`abierta`, `llena` o `en_juego`), con validación de 3–60 caracteres.
- `admin_destacar_sala(p_sala, p_destacar)` — solo admin: elige la sala que se muestra en el hero del landing; al activar una, desmarca la anterior. Solo acepta salas activas.
- `proteger_mmr()` — trigger `before update` en `profiles`: bloquea cambiar un MMR ya registrado salvo que lo haga un admin (o un proceso interno sin `auth.uid()`).
- `validar_perfil_dota()` — trigger `before insert` en `participantes_sala`: exige `profiles.mmr` antes de unirse.
- `capitan_de_pick(p_primer, p_otro, p_num)` — calcula el capitán del pick `n` con orden serpiente A-B-B-A.
- `iniciar_picks(p_sala, p_capitan1, p_capitan2)` — admin: valida sala 5v5 llena, resetea equipos, elige dos capitanes y lanza la moneda en el servidor.
- `elegir_moneda(p_sala, p_opcion)` — el ganador elige `pickear_primero` o `lado`; el otro completa la decisión.
- `elegir_lado(p_sala, p_equipo)` — en 5v5 asigna lado a los capitanes y arranca el draft; en 1v1 asigna al ganador del sorteo y manda al otro al lado contrario. El sorteo 1v1 lo dispara `iniciar_sorteo_1v1()` automáticamente al llenarse la sala (2 jugadores).
- `pickear_jugador(p_sala, p_user)` — solo el capitán de turno; asigna equipo, guarda `pick_orden` y avanza el turno.
- `auto_pickear_si_vencido(p_sala, p_forzar)` — auto-pick a los **45 s** (o forzado por admin): elige al disponible con **más MMR**.
- `cancelar_picks(p_sala)` — admin: devuelve a todos a la lista de espera y limpia la fase.
- `bloquear_cambios_en_picks()` — trigger `before update/delete` en `participantes_sala`: impide mover/expulsar durante `en_curso`; en salas 1v1 permite salir durante el sorteo de lado.
- `salir_de_sala(p_sala)` — reembolsa y permite salir en `abierta`/`llena`.
- `salir_de_sala_con_multa(p_sala)` — salida con multa de S/ 2.00 al abandonar una **5v5 llena** (llama a `salir_de_sala`, cobra la multa sin dejar saldo negativo, la apunta en `actividades` y notifica). En salas abiertas o 1v1 se comporta como `salir_de_sala`. Requiere `docs/sql/2026-10-21-multa-abandono-5v5.sql`.
- `unirse_a_equipo(p_sala, p_equipo)` — jugador se mueve a espera (`null`), Radiant (1) o Dire (2), con límite por equipo.
- `asignar_equipo(p_sala, p_user, p_equipo)` — admin mueve a cualquier jugador (incluida espera).
- `definir_lobby(p_sala, p_nombre, p_clave)` — valida equipos completos y espera vacía, pone `en_juego` y notifica a los jugadores.
- `cancelar_sala(p_sala, p_motivo)` — reembolsa a todos y cancela.
- `cerrar_partida(p_sala, p_dota_match_id, p_equipo_ganador)` — reparte premios y guarda en `partidas`.
- `cerrar_partida_con_detalle(...)` — admin: cierra con `cerrar_partida` y completa duración, marcador y origen automático.
- `cerrar_partida_auto(...)` — solo `service_role`: la usa `/api/dota/auto-close` tras validar la partida con Steam.
- `marcar_inicio_sala()` — trigger `before update` en `salas`: guarda `iniciada_at` al pasar a `en_juego`.
- `ajuste_admin`, `mi_saldo`, `_saldo_de`, `ganancias_casa`, `es_admin`.

## 6. Referencia histórica de funciones y SQL

Las siguientes definiciones documentan etapas anteriores. Las funcionalidades 1v1, cierre y MMR único están aplicadas; algunas definiciones se sustituyeron después. El estado y los pendientes vigentes están en [ESTADO.md](ESTADO.md); esta sección no autoriza reaplicar SQL.

### Turno de 45 s, auto-pick por mayor MMR y capitanes marcados (ya aplicada)

`docs/sql/2026-10-22-turno-45s-autopick-mmr.sql`. Cierra el arreglo del draft: cuenta solo a los 8 jugadores elegidos (excluye a los capitanes por id; antes el conteo los incluía porque `es_capitan` se quedaba en `false`, y por eso el draft repartía R-R-R-D-D y cerraba en el pick 6 con 5/3), marca `es_capitan = true` en los dos capitanes (la UI mostraba `Pick 3/8` al empezar y no pintaba la ⭐), deja el turno en **45 s** con un trigger que acota `pick_turno_expira_at` (las demás funciones fijan 60 s desde dentro) y cambia el auto-pick a **solo mayor MMR**. Verificado con `qa:flows`: `R-D-D-R-R-D` + auto-picks `D` y `R`, 5/5, turnos de ~45 s y el pick 7 al de mayor MMR.

### Orden de picks y verificación anticipada (ya aplicada)

`docs/sql/2026-10-22-orden-picks-y-verificacion-anticipada.sql` → helper `siguiente_capitan_de_pick` + `pickear_jugador`/`auto_pickear_si_vencido` recreados, `admin_pedir_verificacion` sin exigir sala llena e `iniciar_verificacion_llenada` reabriendo la verificación sin borrar confirmaciones. Se comprobó aplicado: el helper devuelve `A,B,B,A,A,B,B,A` y la RPC pide la verificación con 3/10 jugadores.

### Elección Radiant/LastPick en 5v5 (ya aplicada)

`docs/sql/2026-10-21-eleccion-radiant-lastpick.sql` → RPC `elegir_radiant_o_lastpick(p_sala, p_opcion)` (`'radiant'` | `'lastpick'`).

### Multa por abandonar una 5v5 llena (ya aplicada)

`docs/sql/2026-10-21-multa-abandono-5v5.sql` crea la RPC `salir_de_sala_con_multa`. Si alguna vez falta, la sala avisa de la multa pero al salir **no se cobra**: la app detecta que la función no existe y cae en `salir_de_sala` para no dejar al jugador atrapado. Falta comprobar el cobro real con una sala llena.

### Columnas de avatar Steam (ya ejecutadas)

```sql
alter table public.profiles
  add column if not exists steam_avatar_url text,
  add column if not exists steam_nombre text;
```

```sql
-- Realtime para ver cambios al instante
do $$
begin
  begin
    alter publication supabase_realtime add table public.participantes_sala;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.salas;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.lobbies;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
end $$;

-- Expulsar jugador (admin) con reembolso
create or replace function public.expulsar_de_sala(p_sala uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s salas%rowtype;
begin
  if not es_admin() then raise exception 'Solo administradores'; end if;

  select * into s from salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.estado not in ('abierta', 'llena') then
    raise exception 'No se puede expulsar en este estado';
  end if;

  delete from participantes_sala where sala_id = p_sala and user_id = p_user;
  if not found then raise exception 'Ese jugador no está en la sala'; end if;

  insert into movimientos_billetera (user_id, tipo, monto, referencia_id, descripcion, creado_por)
  values (p_user, 'reembolso', s.cuota, s.id, 'Expulsión de sala ' || s.nombre, auth.uid());

  if s.estado = 'llena' then
    update salas set estado = 'abierta' where id = p_sala;
  end if;

  insert into notificaciones (user_id, tipo, mensaje)
  values (p_user, 'expulsado_sala', 'El administrador te sacó de la sala "' || s.nombre || '". Se te devolvió la cuota.');
end
$function$;
```

### SQL de la última ronda (notificaciones y landing público)

```sql
-- Permitir los tipos de notificación nuevos
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check
  check (tipo in ('recarga_aprobada','recarga_rechazada','retiro_pagado','retiro_rechazado','partida_iniciada','expulsado_sala')) not valid;

-- Lectura pública para el landing sin sesión
grant select on public.salas to anon;
grant select on public.participantes_sala to anon;
grant select on public.profiles to anon;
grant select on public.partidas to anon;

drop policy if exists "salas_lectura_publica" on public.salas;
create policy "salas_lectura_publica" on public.salas for select using (true);

drop policy if exists "participantes_lectura_publica" on public.participantes_sala;
create policy "participantes_lectura_publica" on public.participantes_sala for select using (true);

drop policy if exists "profiles_lectura_publica" on public.profiles;
create policy "profiles_lectura_publica" on public.profiles for select using (true);

drop policy if exists "partidas_lectura_publica" on public.partidas;
create policy "partidas_lectura_publica" on public.partidas for select using (true);
```

> Nota de seguridad: para lanzamiento público conviene exponer solo `id, nick` de `profiles` mediante una vista, no toda la tabla.

### SQL del chat (general + privado por sala)

```sql
create table if not exists public.mensajes_chat (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid references public.salas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mensaje text not null,
  created_at timestamptz not null default now(),
  constraint mensajes_chat_mensaje_largo
    check (char_length(btrim(mensaje)) between 1 and 500)
);

create index if not exists mensajes_chat_general_idx
  on public.mensajes_chat (created_at desc)
  where sala_id is null;

create index if not exists mensajes_chat_sala_idx
  on public.mensajes_chat (sala_id, created_at desc);

alter table public.mensajes_chat enable row level security;

revoke all on public.mensajes_chat from anon, authenticated;
grant select on public.mensajes_chat to anon, authenticated;
grant insert on public.mensajes_chat to authenticated;

drop policy if exists "mensajes_chat_lectura_general" on public.mensajes_chat;
create policy "mensajes_chat_lectura_general"
on public.mensajes_chat for select
using (sala_id is null);

drop policy if exists "mensajes_chat_lectura_sala" on public.mensajes_chat;
create policy "mensajes_chat_lectura_sala"
on public.mensajes_chat for select
to authenticated
using (
  sala_id is not null
  and (
    public.es_admin()
    or exists (
      select 1
      from public.participantes_sala p
      where p.sala_id = mensajes_chat.sala_id
        and p.user_id = auth.uid()
    )
  )
);

drop policy if exists "mensajes_chat_insert_general" on public.mensajes_chat;
create policy "mensajes_chat_insert_general"
on public.mensajes_chat for insert
to authenticated
with check (
  user_id = auth.uid()
  and sala_id is null
);

drop policy if exists "mensajes_chat_insert_sala" on public.mensajes_chat;
create policy "mensajes_chat_insert_sala"
on public.mensajes_chat for insert
to authenticated
with check (
  user_id = auth.uid()
  and sala_id is not null
  and (
    public.es_admin()
    or exists (
      select 1
      from public.participantes_sala p
      where p.sala_id = mensajes_chat.sala_id
        and p.user_id = auth.uid()
    )
  )
);

do $$
begin
  begin
    alter publication supabase_realtime add table public.mensajes_chat;
  exception when duplicate_object then null;
  end;
end $$;
```

### SQL del perfil con MMR único y de la fase de picks

```sql
-- 1) MMR único y roles en profiles (públicos)
alter table public.profiles
  add column if not exists mmr integer,
  add column if not exists roles_preferidos text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_mmr_rango;
alter table public.profiles add constraint profiles_mmr_rango
  check (mmr is null or (mmr >= 0 and mmr <= 20000));

alter table public.profiles drop constraint if exists profiles_roles_validos;
alter table public.profiles add constraint profiles_roles_validos
  check (roles_preferidos <@ array['carry','mid','off','roamer','support']::text[]);

alter table public.profiles drop constraint if exists profiles_max_roles;
alter table public.profiles add constraint profiles_max_roles
  check (coalesce(array_length(roles_preferidos, 1), 0) <= 3);

-- Migrar desde perfiles_dota si el usuario ya ejecutó esa versión
do $$
begin
  if to_regclass('public.perfiles_dota') is not null then
    execute $mig$
      update public.profiles p
      set mmr = coalesce(d.mmr_core, d.mmr_support),
          roles_preferidos = case
            when coalesce(array_length(d.roles_preferidos, 1), 0) > 0 then d.roles_preferidos
            else p.roles_preferidos
          end
      from public.perfiles_dota d
      where d.user_id = p.id
        and p.mmr is null
        and (d.mmr_core is not null or d.mmr_support is not null)
    $mig$;
  end if;
end $$;

-- 2) Guardado seguro del perfil competitivo (sin abrir UPDATE general en profiles)
-- El MMR solo se puede registrar UNA vez; después solo un admin puede cambiarlo.
create or replace function public.guardar_perfil_competitivo(
  p_mmr integer,
  p_roles text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_mmr integer;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select mmr into v_mmr from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Perfil no encontrado'; end if;

  if coalesce(array_length(p_roles, 1), 0) > 3 then
    raise exception 'Elige como máximo 3 roles';
  end if;
  if p_roles is not null
     and not (p_roles <@ array['carry','mid','off','roamer','support']::text[]) then
    raise exception 'Rol inválido';
  end if;

  if v_mmr is null then
    if p_mmr is null or p_mmr < 0 or p_mmr > 20000 then
      raise exception 'El MMR debe estar entre 0 y 20000';
    end if;
    update public.profiles
    set mmr = p_mmr,
        roles_preferidos = coalesce(p_roles, '{}'::text[])
    where id = auth.uid();
  else
    if p_mmr is distinct from v_mmr then
      raise exception 'El MMR ya fue registrado y no se puede cambiar. Contacta a un administrador.';
    end if;
    update public.profiles
    set roles_preferidos = coalesce(p_roles, '{}'::text[])
    where id = auth.uid();
  end if;
end;
$function$;

grant execute on function public.guardar_perfil_competitivo(integer, text[]) to authenticated;

-- 2b) Editar SOLO los roles preferidos (no toca el MMR). La usan perfil y sala.
create or replace function public.guardar_roles_preferidos(
  p_roles text[]
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if coalesce(array_length(p_roles, 1), 0) > 3 then
    raise exception 'Elige como máximo 3 roles';
  end if;
  if p_roles is not null
     and not (p_roles <@ array['carry','mid','off','roamer','support']::text[]) then
    raise exception 'Rol inválido';
  end if;

  update public.profiles
  set roles_preferidos = coalesce(p_roles, '{}'::text[])
  where id = auth.uid();
  if not found then raise exception 'Perfil no encontrado'; end if;
end;
$function$;

grant execute on function public.guardar_roles_preferidos(text[]) to authenticated;

-- 2c) El admin puede corregir el MMR de cualquier usuario (antifraude / boosters)
create or replace function public.admin_editar_mmr(
  p_user uuid,
  p_mmr integer
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin'
  ) then
    raise exception 'Solo un administrador puede editar el MMR';
  end if;
  if p_mmr is null or p_mmr < 0 or p_mmr > 20000 then
    raise exception 'El MMR debe estar entre 0 y 20000';
  end if;

  update public.profiles set mmr = p_mmr where id = p_user;
  if not found then raise exception 'Usuario no encontrado'; end if;
end;
$function$;

grant execute on function public.admin_editar_mmr(uuid, integer) to authenticated;

-- 2d) Bloqueo a nivel de tabla: un MMR ya registrado solo lo puede cambiar un admin.
create or replace function public.proteger_mmr()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.mmr is distinct from old.mmr and old.mmr is not null then
    -- Sin usuario autenticado = proceso interno (service role / migración).
    if auth.uid() is null then return new; end if;
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    ) then
      raise exception 'El MMR ya fue registrado y no se puede cambiar. Contacta a un administrador.';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists proteger_mmr on public.profiles;
create trigger proteger_mmr
before update on public.profiles
for each row execute function public.proteger_mmr();

-- 3) Exigir MMR para unirse
create or replace function public.validar_perfil_dota()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.user_id and mmr is not null
  ) then
    raise exception 'Completa tu MMR en Mi perfil antes de unirte a una sala';
  end if;
  return new;
end
$function$;

drop trigger if exists validar_perfil_dota on public.participantes_sala;
create trigger validar_perfil_dota
before insert on public.participantes_sala
for each row execute function public.validar_perfil_dota();

drop table if exists public.perfiles_dota;

-- 4) Columnas de la fase de picks
alter table public.participantes_sala
  add column if not exists es_capitan boolean not null default false,
  add column if not exists pick_orden integer;

alter table public.salas
  add column if not exists picks_estado text not null default 'inactivo',
  add column if not exists pick_capitan1 uuid,
  add column if not exists pick_capitan2 uuid,
  add column if not exists pick_ganador_moneda uuid,
  add column if not exists pick_decision_user_id uuid,
  add column if not exists pick_decision_tipo text,
  add column if not exists pick_primer_user_id uuid,
  add column if not exists pick_turno_user_id uuid,
  add column if not exists pick_turno_expira_at timestamptz;

alter table public.salas drop constraint if exists salas_picks_estado_check;
alter table public.salas add constraint salas_picks_estado_check
  check (picks_estado in ('inactivo','eleccion','en_curso','terminado'));

alter table public.salas drop constraint if exists salas_pick_decision_tipo_check;
alter table public.salas add constraint salas_pick_decision_tipo_check
  check (pick_decision_tipo is null or pick_decision_tipo in ('moneda','lado'));

-- 5) Orden serpiente A-B-B-A
create or replace function public.capitan_de_pick(p_primer uuid, p_otro uuid, p_num int)
returns uuid
language sql
immutable
as $function$
  select case
    when p_num is null or p_num < 1 or p_primer is null or p_otro is null then null
    when (((p_num - 1) / 2) % 2) = 0 then
      case when ((p_num - 1) % 2) = 0 then p_primer else p_otro end
    else
      case when ((p_num - 1) % 2) = 0 then p_otro else p_primer end
  end;
$function$;

-- 6) Iniciar picks: reset, capitanes y moneda
create or replace function public.iniciar_picks(
  p_sala uuid,
  p_capitan1 uuid,
  p_capitan2 uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s public.salas%rowtype;
  v_total int;
  v_ganador uuid;
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;

  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.estado not in ('abierta','llena') then raise exception 'La sala no está en espera'; end if;
  if s.cupo <> 10 then raise exception 'La fase de picks es solo para 5v5'; end if;
  if s.picks_estado <> 'inactivo' then raise exception 'La fase de picks ya inició'; end if;

  select count(*) into v_total from public.participantes_sala where sala_id = p_sala;
  if v_total <> 10 then raise exception 'La sala debe estar llena (10 jugadores)'; end if;
  if p_capitan1 = p_capitan2 then raise exception 'Los capitanes deben ser diferentes'; end if;

  if not exists (select 1 from public.participantes_sala where sala_id = p_sala and user_id = p_capitan1) then
    raise exception 'El capitán 1 no está en la sala';
  end if;
  if not exists (select 1 from public.participantes_sala where sala_id = p_sala and user_id = p_capitan2) then
    raise exception 'El capitán 2 no está en la sala';
  end if;

  update public.participantes_sala
  set equipo = null, es_capitan = false, pick_orden = null
  where sala_id = p_sala;

  v_ganador := case when random() < 0.5 then p_capitan1 else p_capitan2 end;

  update public.salas
  set picks_estado = 'eleccion',
      pick_capitan1 = p_capitan1,
      pick_capitan2 = p_capitan2,
      pick_ganador_moneda = v_ganador,
      pick_decision_user_id = v_ganador,
      pick_decision_tipo = 'moneda',
      pick_primer_user_id = null,
      pick_turno_user_id = null,
      pick_turno_expira_at = null
  where id = p_sala;

  return v_ganador;
end;
$function$;

-- 7) El ganador de la moneda elige: pickear primero o elegir lado
create or replace function public.elegir_moneda(p_sala uuid, p_opcion text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s public.salas%rowtype;
  v_otro uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.picks_estado <> 'eleccion' or s.pick_decision_tipo <> 'moneda' then
    raise exception 'No es momento de elegir';
  end if;
  if s.pick_decision_user_id is distinct from auth.uid() then raise exception 'No es tu turno de elegir'; end if;
  if p_opcion not in ('pickear_primero','lado') then raise exception 'Opción inválida'; end if;

  v_otro := case when s.pick_decision_user_id = s.pick_capitan1 then s.pick_capitan2 else s.pick_capitan1 end;

  if p_opcion = 'pickear_primero' then
    update public.salas
    set pick_primer_user_id = s.pick_decision_user_id,
        pick_decision_user_id = v_otro,
        pick_decision_tipo = 'lado'
    where id = p_sala;
  else
    update public.salas
    set pick_primer_user_id = v_otro,
        pick_decision_user_id = s.pick_decision_user_id,
        pick_decision_tipo = 'lado'
    where id = p_sala;
  end if;
end;
$function$;

-- 8) Elegir lado y arrancar el draft
create or replace function public.elegir_lado(p_sala uuid, p_equipo integer)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s public.salas%rowtype;
  v_otro uuid;
  v_equipo_otro int;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.picks_estado <> 'eleccion' or s.pick_decision_tipo <> 'lado' then
    raise exception 'No es momento de elegir lado';
  end if;
  if s.pick_decision_user_id is distinct from auth.uid() then raise exception 'No es tu turno de elegir'; end if;
  if p_equipo not in (1,2) then raise exception 'Equipo inválido'; end if;

  v_otro := case when s.pick_decision_user_id = s.pick_capitan1 then s.pick_capitan2 else s.pick_capitan1 end;
  v_equipo_otro := case when p_equipo = 1 then 2 else 1 end;

  perform set_config('app.picks_operacion', 'on', true);

  update public.participantes_sala
  set es_capitan = true, equipo = p_equipo, pick_orden = 0
  where sala_id = p_sala and user_id = s.pick_decision_user_id;

  update public.participantes_sala
  set es_capitan = true, equipo = v_equipo_otro, pick_orden = 0
  where sala_id = p_sala and user_id = v_otro;

  update public.salas
  set picks_estado = 'en_curso',
      pick_decision_user_id = null,
      pick_decision_tipo = null,
      pick_turno_user_id = s.pick_primer_user_id,
      pick_turno_expira_at = now() + interval '60 seconds'
  where id = p_sala;
end;
$function$;

-- 9) Pickear un jugador
create or replace function public.pickear_jugador(p_sala uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s public.salas%rowtype;
  v_equipo_capitan int;
  v_equipo_objetivo int;
  v_hechos int;
  v_otro uuid;
  v_siguiente uuid;
  v_orden int;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.picks_estado <> 'en_curso' then raise exception 'La fase de picks no está activa'; end if;
  if s.pick_turno_user_id is distinct from auth.uid() then raise exception 'No es tu turno de pickear'; end if;
  if p_user = auth.uid() then raise exception 'No puedes pickearte a ti mismo'; end if;

  select equipo into v_equipo_objetivo
  from public.participantes_sala
  where sala_id = p_sala and user_id = p_user;

  if not found then raise exception 'Ese jugador no está en la sala'; end if;
  if v_equipo_objetivo is not null then raise exception 'Ese jugador ya fue elegido'; end if;

  select equipo into v_equipo_capitan
  from public.participantes_sala
  where sala_id = p_sala and user_id = s.pick_turno_user_id;

  if v_equipo_capitan is null then raise exception 'El capitán no tiene equipo asignado'; end if;

  perform set_config('app.picks_operacion', 'on', true);

  select coalesce(max(pick_orden), 0) + 1 into v_orden
  from public.participantes_sala
  where sala_id = p_sala and pick_orden is not null;

  update public.participantes_sala
  set equipo = v_equipo_capitan, pick_orden = v_orden
  where sala_id = p_sala and user_id = p_user;

  select count(*) into v_hechos
  from public.participantes_sala
  where sala_id = p_sala and es_capitan = false and equipo is not null;

  if v_hechos >= 8 then
    update public.salas
    set picks_estado = 'terminado',
        pick_turno_user_id = null,
        pick_turno_expira_at = null
    where id = p_sala;
  else
    v_otro := case when s.pick_turno_user_id = s.pick_capitan1 then s.pick_capitan2 else s.pick_capitan1 end;
    v_siguiente := public.capitan_de_pick(s.pick_primer_user_id, v_otro, v_hechos + 1);
    update public.salas
    set pick_turno_user_id = v_siguiente,
        pick_turno_expira_at = now() + interval '60 seconds'
    where id = p_sala;
  end if;
end;
$function$;

-- 10) Auto-pick a los 60 s, o forzado por admin
create or replace function public.auto_pickear_si_vencido(p_sala uuid, p_forzar boolean default false)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s public.salas%rowtype;
  v_equipo_capitan int;
  v_otro uuid;
  v_siguiente uuid;
  v_hechos int;
  v_orden int;
  v_roles_faltantes text[];
  v_target uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;

  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.picks_estado <> 'en_curso' then raise exception 'La fase de picks no está activa'; end if;

  if p_forzar then
    if not public.es_admin() then raise exception 'Solo administradores pueden forzar el auto-pick'; end if;
  elsif s.pick_turno_expira_at is null or now() < s.pick_turno_expira_at then
    raise exception 'El turno aún no vence';
  end if;

  select equipo into v_equipo_capitan
  from public.participantes_sala
  where sala_id = p_sala and user_id = s.pick_turno_user_id;

  if v_equipo_capitan is null then raise exception 'El capitán no tiene equipo asignado'; end if;

  select array_agg(r) into v_roles_faltantes
  from unnest(array['carry','mid','off','roamer','support']::text[]) r
  where not exists (
    select 1
    from public.participantes_sala ps
    join public.profiles pr on pr.id = ps.user_id
    where ps.sala_id = p_sala
      and ps.equipo = v_equipo_capitan
      and pr.roles_preferidos @> array[r]
  );

  select ps.user_id into v_target
  from public.participantes_sala ps
  left join public.profiles pr on pr.id = ps.user_id
  where ps.sala_id = p_sala
    and ps.equipo is null
    and ps.es_capitan = false
  order by
    (case when pr.roles_preferidos && coalesce(v_roles_faltantes, '{}'::text[]) then 0 else 1 end),
    coalesce(pr.mmr, 0) desc,
    ps.created_at asc
  limit 1;

  if v_target is null then
    update public.salas
    set picks_estado = 'terminado',
        pick_turno_user_id = null,
        pick_turno_expira_at = null
    where id = p_sala;
    return;
  end if;

  perform set_config('app.picks_operacion', 'on', true);

  select coalesce(max(pick_orden), 0) + 1 into v_orden
  from public.participantes_sala
  where sala_id = p_sala and pick_orden is not null;

  update public.participantes_sala
  set equipo = v_equipo_capitan, pick_orden = v_orden
  where sala_id = p_sala and user_id = v_target;

  select count(*) into v_hechos
  from public.participantes_sala
  where sala_id = p_sala and es_capitan = false and equipo is not null;

  if v_hechos >= 8 then
    update public.salas
    set picks_estado = 'terminado',
        pick_turno_user_id = null,
        pick_turno_expira_at = null
    where id = p_sala;
  else
    v_otro := case when s.pick_turno_user_id = s.pick_capitan1 then s.pick_capitan2 else s.pick_capitan1 end;
    v_siguiente := public.capitan_de_pick(s.pick_primer_user_id, v_otro, v_hechos + 1);
    update public.salas
    set pick_turno_user_id = v_siguiente,
        pick_turno_expira_at = now() + interval '60 seconds'
    where id = p_sala;
  end if;
end;
$function$;

-- 11) Cancelar picks
create or replace function public.cancelar_picks(p_sala uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s public.salas%rowtype;
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;

  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.estado = 'en_juego' then raise exception 'La partida ya está en juego'; end if;
  if s.picks_estado = 'inactivo' then return; end if;

  perform set_config('app.picks_operacion', 'on', true);

  update public.participantes_sala
  set equipo = null, es_capitan = false, pick_orden = null
  where sala_id = p_sala;

  update public.salas
  set picks_estado = 'inactivo',
      pick_capitan1 = null,
      pick_capitan2 = null,
      pick_ganador_moneda = null,
      pick_decision_user_id = null,
      pick_decision_tipo = null,
      pick_primer_user_id = null,
      pick_turno_user_id = null,
      pick_turno_expira_at = null
  where id = p_sala;
end;
$function$;

-- 12) Bloquear movimientos y expulsiones durante picks
create or replace function public.bloquear_cambios_en_picks()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_estado text;
  v_sala_id uuid;
begin
  if coalesce(current_setting('app.picks_operacion', true), '') = 'on' then
    if TG_OP = 'DELETE' then return old; end if;
    return new;
  end if;

  v_sala_id := case when TG_OP = 'DELETE' then old.sala_id else new.sala_id end;

  select picks_estado into v_estado from public.salas where id = v_sala_id;
  if v_estado in ('eleccion','en_curso') then
    raise exception 'La fase de picks está activa; espera a que termine';
  end if;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$function$;

drop trigger if exists bloquear_cambios_en_picks_update on public.participantes_sala;
create trigger bloquear_cambios_en_picks_update
before update on public.participantes_sala
for each row execute function public.bloquear_cambios_en_picks();

drop trigger if exists bloquear_cambios_en_picks_delete on public.participantes_sala;
create trigger bloquear_cambios_en_picks_delete
before delete on public.participantes_sala
for each row execute function public.bloquear_cambios_en_picks();
```

### Sorteo automático de lado en salas 1v1 (snapshot histórico; aplicado posteriormente)

Cuando una sala 1v1 se llena, el servidor sortea al azar quién elige lado. El ganador ve en su
sala los botones Radiant/Dire; el otro jugador queda en el lado contrario automáticamente. Si un
jugador sale mientras el sorteo está pendiente, la sala vuelve a `inactivo` y el próximo en unirse
dispara un nuevo sorteo. Incluye la versión de `bloquear_cambios_en_picks` que permite salir de la
sala 1v1 aunque el sorteo esté activo (en 5v5 se sigue bloqueando todo durante los picks).

```sql
-- Sorteo automático 1v1: al llenarse la sala (2 jugadores) se elige al azar quién decide lado.
create or replace function public.iniciar_sorteo_1v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sala_id uuid;
  s public.salas%rowtype;
  v_total int;
  v_ids uuid[];
  v_ganador uuid;
begin
  if TG_OP = 'DELETE' then
    v_sala_id := old.sala_id;
  else
    v_sala_id := new.sala_id;
  end if;

  select * into s from public.salas where id = v_sala_id for update;
  if not found then
    if TG_OP = 'DELETE' then return old; else return new; end if;
  end if;

  -- Solo aplica a salas 1v1
  if s.cupo <> 2 then
    if TG_OP = 'DELETE' then return old; else return new; end if;
  end if;

  select count(*), array_agg(user_id order by created_at)
    into v_total, v_ids
  from public.participantes_sala
  where sala_id = v_sala_id;

  if v_total = 2 then
    if s.estado in ('abierta', 'llena')
       and s.picks_estado = 'inactivo'
       and not exists (
         select 1 from public.participantes_sala
         where sala_id = v_sala_id and equipo is not null
       )
    then
      v_ganador := v_ids[case when random() < 0.5 then 1 else 2 end];

      update public.salas
      set picks_estado = 'eleccion',
          pick_capitan1 = v_ids[1],
          pick_capitan2 = v_ids[2],
          pick_ganador_moneda = v_ganador,
          pick_decision_user_id = v_ganador,
          pick_decision_tipo = 'lado',
          pick_primer_user_id = null,
          pick_turno_user_id = null,
          pick_turno_expira_at = null
      where id = v_sala_id;
    end if;
  elsif v_total < 2 then
    -- Si alguien sale antes de decidir, se limpia el sorteo para el próximo que entre
    if s.picks_estado <> 'inactivo' and s.estado <> 'en_juego' then
      update public.salas
      set picks_estado = 'inactivo',
          pick_capitan1 = null,
          pick_capitan2 = null,
          pick_ganador_moneda = null,
          pick_decision_user_id = null,
          pick_decision_tipo = null,
          pick_primer_user_id = null,
          pick_turno_user_id = null,
          pick_turno_expira_at = null
      where id = v_sala_id;

      update public.participantes_sala
      set equipo = null, es_capitan = false, pick_orden = null
      where sala_id = v_sala_id;
    end if;
  end if;

  if TG_OP = 'DELETE' then return old; else return new; end if;
end;
$function$;

drop trigger if exists sorteo_1v1_sync on public.participantes_sala;
create trigger sorteo_1v1_sync
after insert or delete on public.participantes_sala
for each row execute function public.iniciar_sorteo_1v1();

-- Elegir lado: en 1v1 asigna al ganador del sorteo y manda al otro al lado contrario; en 5v5
-- arranca el draft como antes.
create or replace function public.elegir_lado(p_sala uuid, p_equipo integer)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s public.salas%rowtype;
  v_otro uuid;
  v_equipo_otro int;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.picks_estado <> 'eleccion' or s.pick_decision_tipo <> 'lado' then
    raise exception 'No es momento de elegir lado';
  end if;
  if s.pick_decision_user_id is distinct from auth.uid() then raise exception 'No es tu turno de elegir'; end if;
  if p_equipo not in (1,2) then raise exception 'Equipo inválido'; end if;

  v_otro := case when s.pick_decision_user_id = s.pick_capitan1 then s.pick_capitan2 else s.pick_capitan1 end;
  v_equipo_otro := case when p_equipo = 1 then 2 else 1 end;

  perform set_config('app.picks_operacion', 'on', true);

  if s.cupo = 2 then
    -- 1v1: el ganador elige su lado y el otro va al contrario. El sorteo queda cerrado.
    update public.participantes_sala
    set equipo = p_equipo, es_capitan = false, pick_orden = null
    where sala_id = p_sala and user_id = s.pick_decision_user_id;

    update public.participantes_sala
    set equipo = v_equipo_otro, es_capitan = false, pick_orden = null
    where sala_id = p_sala and user_id = v_otro;

    update public.salas
    set picks_estado = 'terminado',
        pick_capitan1 = null,
        pick_capitan2 = null,
        pick_ganador_moneda = null,
        pick_decision_user_id = null,
        pick_decision_tipo = null,
        pick_primer_user_id = null,
        pick_turno_user_id = null,
        pick_turno_expira_at = null
    where id = p_sala;
    return;
  end if;

  update public.participantes_sala
  set es_capitan = true, equipo = p_equipo, pick_orden = 0
  where sala_id = p_sala and user_id = s.pick_decision_user_id;

  update public.participantes_sala
  set es_capitan = true, equipo = v_equipo_otro, pick_orden = 0
  where sala_id = p_sala and user_id = v_otro;

  update public.salas
  set picks_estado = 'en_curso',
      pick_decision_user_id = null,
      pick_decision_tipo = null,
      pick_turno_user_id = s.pick_primer_user_id,
      pick_turno_expira_at = now() + interval '60 seconds'
  where id = p_sala;
end;
$function$;

-- En 1v1 se puede salir de la sala aunque el sorteo esté activo; en 5v5 se bloquea igual que antes.
create or replace function public.bloquear_cambios_en_picks()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_estado text;
  v_cupo int;
  v_sala_id uuid;
begin
  if coalesce(current_setting('app.picks_operacion', true), '') = 'on' then
    if TG_OP = 'DELETE' then return old; end if;
    return new;
  end if;

  v_sala_id := case when TG_OP = 'DELETE' then old.sala_id else new.sala_id end;

  select picks_estado, cupo into v_estado, v_cupo
  from public.salas where id = v_sala_id;

  if v_estado in ('eleccion', 'en_curso') then
    if TG_OP = 'DELETE' and v_cupo = 2 then
      return old;
    end if;
    raise exception 'La fase de picks está activa; espera a que termine';
  end if;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$function$;
```

> Nota: si ya ejecutaste la versión anterior de `bloquear_cambios_en_picks` y `elegir_lado`, este bloque
> las reemplaza sin tocar los triggers existentes (se referencian por nombre).

### Cierre automático de partida e historial con detalle (snapshot histórico; aplicado posteriormente)

La app consulta la API de Steam desde `POST /api/dota/auto-close` mientras la sala está `en_juego`.
Cualquier jugador o admin con la sala abierta dispara la revisión (cada 60–90 s). El servidor:

1. Verifica que quien llama sea participante o admin.
2. Convierte los `steam_id` de los jugadores a `account_id` y consulta sus partidas recientes.
3. Confirma con `GetMatchDetails` que la partida contiene a los jugadores de la sala (al menos la mitad,
   con presencia en ambos lados).
4. Cierra con `cerrar_partida` reutilizando premios/notificaciones y guarda duración, marcador y si fue automática.

Requisitos: el lobby debe ser **público** en Dota 2 y deben existir `STEAM_API_KEY` y
`SUPABASE_SERVICE_ROLE_KEY` en `.env.local`. Si la partida no es pública o falta el SQL, el cierre
manual con ID sigue funcionando.

```sql
-- 1) Detalle de la partida para el historial
alter table public.partidas
  add column if not exists duracion_segundos integer,
  add column if not exists radiant_score integer,
  add column if not exists dire_score integer,
  add column if not exists detectada_auto boolean not null default false;

-- 2) Marca de inicio para no confundir la partida con una anterior
alter table public.salas
  add column if not exists iniciada_at timestamptz;

create or replace function public.marcar_inicio_sala()
returns trigger
language plpgsql
as $function$
begin
  if new.estado = 'en_juego' and old.estado is distinct from 'en_juego' then
    new.iniciada_at := now();
  end if;
  return new;
end;
$function$;

drop trigger if exists marcar_inicio_sala_trg on public.salas;
create trigger marcar_inicio_sala_trg
before update on public.salas
for each row execute function public.marcar_inicio_sala();

-- 3) Cierre con detalle (admin). Llama al cierre oficial y completa el historial.
create or replace function public.cerrar_partida_con_detalle(
  p_sala uuid,
  p_dota_match_id bigint,
  p_equipo_ganador integer,
  p_duracion integer default null,
  p_radiant_score integer default null,
  p_dire_score integer default null,
  p_auto boolean default false
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s public.salas%rowtype;
begin
  if not public.es_admin() then
    raise exception 'Solo administradores';
  end if;

  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.estado <> 'en_juego' then raise exception 'La sala no está en juego'; end if;
  if p_dota_match_id is null or p_dota_match_id <= 0 then
    raise exception 'ID de partida inválido';
  end if;
  if p_equipo_ganador not in (1, 2) then
    raise exception 'Equipo ganador inválido';
  end if;

  perform public.cerrar_partida(p_sala, p_dota_match_id, p_equipo_ganador);

  update public.partidas
  set duracion_segundos = coalesce(p_duracion, duracion_segundos),
      radiant_score = coalesce(p_radiant_score, radiant_score),
      dire_score = coalesce(p_dire_score, dire_score),
      detectada_auto = coalesce(p_auto, false)
  where sala_id = p_sala and dota_match_id = p_dota_match_id;
end;
$function$;

revoke all on function public.cerrar_partida_con_detalle(uuid, bigint, integer, integer, integer, integer, boolean) from public;
revoke all on function public.cerrar_partida_con_detalle(uuid, bigint, integer, integer, integer, integer, boolean) from anon;
grant execute on function public.cerrar_partida_con_detalle(uuid, bigint, integer, integer, integer, integer, boolean) to authenticated;

-- 4) Cierre automático desde el servidor. Solo service_role puede ejecutarlo;
--    el route valida la partida contra Steam antes de llamarlo.
create or replace function public.cerrar_partida_auto(
  p_sala uuid,
  p_dota_match_id bigint,
  p_equipo_ganador integer,
  p_duracion integer,
  p_radiant_score integer,
  p_dire_score integer
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s public.salas%rowtype;
  v_admin uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'No autorizado';
  end if;

  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.estado <> 'en_juego' then raise exception 'La sala no está en juego'; end if;
  if exists (select 1 from public.partidas where sala_id = p_sala) then
    raise exception 'La partida ya fue cerrada';
  end if;

  -- Reutiliza el cierre oficial con contexto de admin.
  select id into v_admin
  from public.profiles
  where rol = 'admin' and coalesce(baneado, false) = false
  order by (id = s.creado_por) desc
  limit 1;

  if v_admin is null then
    raise exception 'No hay un administrador disponible para cerrar la partida';
  end if;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text,
    true
  );

  perform public.cerrar_partida_con_detalle(
    p_sala,
    p_dota_match_id,
    p_equipo_ganador,
    p_duracion,
    p_radiant_score,
    p_dire_score,
    true
  );
end;
$function$;

revoke all on function public.cerrar_partida_auto(uuid, bigint, integer, integer, integer, integer) from public;
revoke all on function public.cerrar_partida_auto(uuid, bigint, integer, integer, integer, integer) from anon;
revoke all on function public.cerrar_partida_auto(uuid, bigint, integer, integer, integer, integer) from authenticated;
grant execute on function public.cerrar_partida_auto(uuid, bigint, integer, integer, integer, integer) to service_role;
```

> Nota: `cerrar_partida_auto` es la única función que puede ejecutar el route con la service role.
> No se expone a `anon` ni a `authenticated`. El route además exige sesión de participante o admin.

### SQL del MMR de un solo uso y edición por admin (snapshot histórico; aplicado posteriormente)

Reemplaza la definición de `guardar_perfil_competitivo` con la versión que bloquea el MMR
tras el primer registro, agrega `guardar_roles_preferidos` (roles sin tocar el MMR),
`admin_editar_mmr` (el admin corrige el MMR de cualquier usuario), el trigger `proteger_mmr`
(bloquea cambios directos al MMR ya registrado) y habilita Realtime para `profiles` (los roles
se ven al instante en la sala).

```sql
-- El MMR solo se registra una vez; después solo un admin puede cambiarlo.
create or replace function public.guardar_perfil_competitivo(
  p_mmr integer,
  p_roles text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_mmr integer;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select mmr into v_mmr from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Perfil no encontrado'; end if;

  if coalesce(array_length(p_roles, 1), 0) > 3 then
    raise exception 'Elige como máximo 3 roles';
  end if;
  if p_roles is not null
     and not (p_roles <@ array['carry','mid','off','roamer','support']::text[]) then
    raise exception 'Rol inválido';
  end if;

  if v_mmr is null then
    if p_mmr is null or p_mmr < 0 or p_mmr > 20000 then
      raise exception 'El MMR debe estar entre 0 y 20000';
    end if;
    update public.profiles
    set mmr = p_mmr,
        roles_preferidos = coalesce(p_roles, '{}'::text[])
    where id = auth.uid();
  else
    if p_mmr is distinct from v_mmr then
      raise exception 'El MMR ya fue registrado y no se puede cambiar. Contacta a un administrador.';
    end if;
    update public.profiles
    set roles_preferidos = coalesce(p_roles, '{}'::text[])
    where id = auth.uid();
  end if;
end;
$function$;

grant execute on function public.guardar_perfil_competitivo(integer, text[]) to authenticated;

-- Editar SOLO los roles preferidos (no toca el MMR). La usan perfil y sala.
create or replace function public.guardar_roles_preferidos(
  p_roles text[]
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if coalesce(array_length(p_roles, 1), 0) > 3 then
    raise exception 'Elige como máximo 3 roles';
  end if;
  if p_roles is not null
     and not (p_roles <@ array['carry','mid','off','roamer','support']::text[]) then
    raise exception 'Rol inválido';
  end if;

  update public.profiles
  set roles_preferidos = coalesce(p_roles, '{}'::text[])
  where id = auth.uid();
  if not found then raise exception 'Perfil no encontrado'; end if;
end;
$function$;

grant execute on function public.guardar_roles_preferidos(text[]) to authenticated;

-- El admin puede corregir el MMR de cualquier usuario (antifraude / boosters).
create or replace function public.admin_editar_mmr(
  p_user uuid,
  p_mmr integer
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin'
  ) then
    raise exception 'Solo un administrador puede editar el MMR';
  end if;
  if p_mmr is null or p_mmr < 0 or p_mmr > 20000 then
    raise exception 'El MMR debe estar entre 0 y 20000';
  end if;

  update public.profiles set mmr = p_mmr where id = p_user;
  if not found then raise exception 'Usuario no encontrado'; end if;
end;
$function$;

grant execute on function public.admin_editar_mmr(uuid, integer) to authenticated;

-- 2d) Bloqueo a nivel de tabla: un MMR ya registrado solo lo puede cambiar un admin.
create or replace function public.proteger_mmr()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.mmr is distinct from old.mmr and old.mmr is not null then
    -- Sin usuario autenticado = proceso interno (service role / migración).
    if auth.uid() is null then return new; end if;
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    ) then
      raise exception 'El MMR ya fue registrado y no se puede cambiar. Contacta a un administrador.';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists proteger_mmr on public.profiles;
create trigger proteger_mmr
before update on public.profiles
for each row execute function public.proteger_mmr();

-- Realtime: cambios de roles/MMR de los jugadores se ven al instante en la sala.
do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
end $$;
```

### Renombrar sala desde el panel admin (aplicado y verificado 20/10/2026)

```sql
-- Admin: cambia el nombre de una sala activa sin abrir UPDATE directo en `salas`.
create or replace function public.admin_renombrar_sala(
  p_sala uuid,
  p_nombre text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_nombre text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin'
  ) then
    raise exception 'Solo un administrador puede renombrar la sala';
  end if;

  v_nombre := btrim(coalesce(p_nombre, ''));
  if char_length(v_nombre) < 3 or char_length(v_nombre) > 60 then
    raise exception 'El nombre debe tener entre 3 y 60 caracteres';
  end if;

  update public.salas
  set nombre = v_nombre
  where id = p_sala
    and estado in ('abierta', 'llena', 'en_juego');

  if not found then
    raise exception 'Sala no encontrada o no se puede renombrar en este estado';
  end if;
end;
$function$;

grant execute on function public.admin_renombrar_sala(uuid, text) to authenticated;

notify pgrst, 'reload schema';
```

### Sala destacada elegida por el admin (aplicado y verificado 20/10/2026)

```sql
-- Una sola sala puede estar destacada en el landing.
alter table public.salas
  add column if not exists destacada boolean not null default false;

create unique index if not exists salas_solo_una_destacada
  on public.salas (destacada)
  where destacada;

create or replace function public.admin_destacar_sala(
  p_sala uuid,
  p_destacar boolean default true
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin'
  ) then
    raise exception 'Solo un administrador puede elegir la sala destacada';
  end if;

  if p_destacar then
    if not exists (
      select 1 from public.salas
      where id = p_sala
        and estado in ('abierta', 'llena', 'en_juego')
    ) then
      raise exception 'Sala no encontrada o no está activa';
    end if;

    update public.salas
    set destacada = false
    where destacada = true and id <> p_sala;

    update public.salas
    set destacada = true
    where id = p_sala;
  else
    update public.salas
    set destacada = false
    where id = p_sala;
  end if;
end;
$function$;

grant execute on function public.admin_destacar_sala(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
```

## 7. Archivos clave

- `src/app/page.tsx` — landing pública: envuelve `<HeroArena />` y las salas con `<SalasProvider>`; debajo salas a la izquierda, chat general a la derecha e historial global en modal. Los accesos a la guía viven en el navbar y el hero.
- `src/app/como-jugar/page.tsx` — guía pública: 7 pasos, checklist, 9 reglas, resumen sticky de tiempos/penalidades y CTAs; secciones `#como-jugar` y `#reglas`. No requiere sesión ni SQL.
- `src/components/SalasProvider.tsx` — fuente única de salas activas y participantes del landing: una consulta, una suscripción Realtime `landing-salas`, polling de respaldo y hook `useSalas()`.
- `src/lib/salas.ts` — tipos compartidos `SalaPublica` y `ParticipantePublico` para el hero y la lista de salas.
- `src/components/HeroArena.tsx` — hero del landing: imagen única `public/hero-arena.jpg` con Shadow Fiend, Phantom Assassin y la bandera; copy “JUEGA · COMPITE · GANA”; sala destacada en vivo (consulta `salas` + `participantes_sala`, se actualiza por Realtime `hero-salas`), **sala elegida por el admin** (`destacada`) con respaldo automático a la más llena, **todos los slots de la modalidad** (10 en 5v5, 2 en 1v1, libres y ocupados) con `PerfilHover`, ícono de Dota 2, stats de salas/jugadores/dinero en juego, partículas y spotlight de cursor. Enlace “Entrar a la sala” o `/login` según sesión, más accesos “Cómo jugar” y “Reglas” visibles en tablet/móvil.
- `src/components/SalasPublicas.tsx` — landing: tarjetas Arena Dark con ícono de Dota 2, chip **★ Destacada**, slots por modalidad, avatares con color de equipo, unirse y actualización en vivo.
- `public/dota2.svg` — ícono de Dota 2 (Simple Icons) usado en las tarjetas del landing y en la gestión de sala.
- `src/app/globals.css` — tokens de **Arena Dark** (grafito, indigo, Radiant, Dire, dorado; superficies, radios y sombras), clases nativas `.arena-shell`/`.arena-card`/`.arena-hero`/`.arena-nav` y animaciones del hero (`arena-aurora`, `arena-particle`, `arena-spotlight`, `arena-cta-shine`), con `prefers-reduced-motion`; body oscuro condicionado y controles nativos con `color-scheme: dark`.
- `src/app/layout.tsx` — carga **Manrope** y **Sora** con `next/font` y aplica la tipografía global.
- `src/lib/useArenaBody.ts` — hook que activa `body.arena-body` mientras una pantalla Arena está montada.
- `src/app/salas/page.tsx` — listado y creación de salas (admin), con conteos en una consulta y actualización en vivo; para salas activas, botón **Destacar en landing / Quitar de destacadas** con chip ★.
- `src/app/salas/[id]/page.tsx` — sala del jugador: Radiant/Dire y **lista de espera** en tres columnas en pantallas grandes, moverse, lobby, compartir enlace, salir, expulsión en vivo, **tablero de picks** (moneda, elección de lado, picks con cuenta regresiva) y tarjeta **Mis roles** compacta con guardado automático y actualización en vivo. Chat privado a la derecha.
- `src/app/admin/salas/[id]/page.tsx` — gestión: cambiar el nombre de la sala (`admin_renombrar_sala`), **elegir/quitar la sala destacada** (`admin_destacar_sala`), mover jugadores (inmediato), expulsar, ver MMR/roles y promedios por equipo, **iniciar/cancelar la fase de picks**, forzar auto-pick, poner en juego y cerrar partida con confirmación.
- `src/app/admin/jugadores/page.tsx` — admin: buscador de jugadores, MMR/roles y edición del MMR (antifraude) mediante `admin_editar_mmr`.
- `src/components/ConfirmDialog.tsx` — modal reutilizable de confirmación para acciones destructivas.
- `src/components/Toast.tsx` — aviso flotante con cierre automático y estilo Arena Dark.
- `src/components/AdminNav.tsx` — sub-navegación compartida por las pantallas admin (`Panel · Recargas · Retiros · Jugadores · Salas`), con estado activo e íconos; en móvil usa una grilla de 5 columnas (ícono + etiqueta) y en escritorio segmentos de igual ancho, sin scroll horizontal.
- `src/components/AdminPageHeader.tsx` — cabecera compartida de admin (kicker KódigoDota, título, descripción, badge y acción opcional), usada por Panel, Recargas, Retiros y Jugadores.
- `src/app/admin/page.tsx` — panel: tarjeta de ganancias de la casa, 4 KPI con enlaces (recargas/retiros pendientes, salas activas, jugadores; 2×2 en móvil) y grilla 2×2 de acciones rápidas.
- `src/app/perfil/page.tsx` — perfil, Steam, historial, movimientos, billetera. Cabecera con identidad/estado de MMR/Steam/saldo, accesos Recargar/Retirar y resumen de Partidas/Solicitudes/Movimientos; MMR como stat bloqueado, pestañas sticky con íconos/contadores y etiquetas cortas en móvil, listas en tarjetas responsivas, estados vacíos con CTA y skeletons. El MMR solo se registra una vez; después solo se editan roles. Incluye medalla de rango, enlace al perfil público y enlaces icon-only a Steam/Dotabuff si hay Steam; la píldora de estado y “Vincular con Steam” usan el logo oficial de Steam.
- `src/app/jugadores/[id]/page.tsx` — perfil público: avatar/Steam, iconos enlazados a Steam y Dotabuff si hay Steam, MMR + medalla, roles, partidas terminadas, victorias, winrate y últimas 10 partidas con resultado, modalidad, duración, marcador y enlace a Dotabuff por partida. Accesible sin sesión; valida UUID y muestra un estado de “no encontrado”.
- `src/components/PerfilHover.tsx` — tarjeta de jugador en portal con avatar, nick, Steam, equipo, MMR/medalla, roles, “Ver perfil público” y, a su lado, iconos de Steam/Dotabuff si hay Steam; se abre al pasar el cursor, enfocar o fijar con clic en la sala.
- `src/lib/playerLinks.ts` — convierte SteamID64 a `account_id` de 32 bits, genera `https://steamcommunity.com/profiles/{steam_id}` y `https://www.dotabuff.com/players/{account_id}`, y devuelve ambos enlaces juntos; también lo usa `/api/dota/auto-close`.
- `src/components/PlayerLinks.tsx` — enlaces icon-only reutilizables a Steam y Dotabuff; usa `steamId` directo si lo recibe o consulta `/api/jugadores/[id]/links` por `userId`, y se oculta por completo si no hay Steam. `SteamIcon.tsx` contiene el glifo oficial y `public/dotabuff.png` el favicon de Dotabuff; ambos abren en pestaña nueva con `noopener noreferrer`.
- `src/components/MedallaMmr.tsx` — imagen de medalla de rango (Herald a Immortal) con tamaños reutilizables, 1–5 estrellas según el MMR y placeholder “Sin MMR” con `rank_0.png`.
- `src/lib/mmr.ts` — rangos de MMR, `rangoMmr()` y `estrellasDeMmr()`; las imágenes viven en `public/medallas/rank_0.png` … `rank_8.png` (`rank_0` = sin calibrar, `rank_1` = Herald … `rank_8` = Immortal).
- `src/app/recargar/page.tsx`, `src/app/retirar/page.tsx` — recargas y retiros.
- `src/app/admin/recargas/page.tsx`, `src/app/admin/retiros/page.tsx` — aprobaciones.
- `src/components/Navbar.tsx` — menú único sticky con estilo **Arena Dark** (logo, saldo, campana y desplegable de perfil con perfil, recargar, retirar, historial, admin y cerrar sesión). En escritorio incluye los accesos `Cómo jugar · Reglas · Historial`; en tablet/móvil la guía se enlaza desde el hero.
- `src/components/Avatar.tsx` — avatar reutilizable con imagen de Steam y fallback a inicial.
- `src/components/ChatPanel.tsx` — chat reutilizable con estilo Arena Dark: general (landing) y privado por sala. Cada mensaje ajeno separa avatar, cabecera (nick + medalla) y burbuja; la tarjeta de jugador se ancla al avatar (`self-start`) para no abrirse debajo de todo el mensaje.
- `src/components/NotificationBell.tsx` — campana en tiempo real con desplegable Arena Dark.
- `src/components/HistorialGlobal.tsx` — historial de partidas con tarjetas y badges Arena Dark.
- `src/lib/steamServer.ts` — resolución de vanity URL y consulta de avatar/nombre a Steam (solo servidor).
- `src/lib/steamClient.ts` — sincronización del avatar desde componentes cliente.
- `src/app/api/steam/sync/route.ts` — actualiza avatar/nombre del usuario autenticado, con rate limit.
- `src/app/api/jugadores/[id]/links/route.ts` — devuelve `{ steamUrl, dotabuffUrl }` de un jugador; lee `steam_id` con service role pero solo responde URLs derivadas, con rate limit y caché.
- `src/app/api/auth/steam/start/route.ts` — inicia el OpenID de Steam con state firmado y cookie HttpOnly; el access token ya no viaja en la URL.
- `src/lib/steamState.ts` — firma/verificación HMAC del state de Steam y constantes de la cookie.
- `src/lib/rateLimit.ts` — rate limit en memoria por usuario/clave para las APIs.
- `src/app/api/dota/match/route.ts` — proxy a Steam Web API (usa `STEAM_API_KEY`); exige sesión de admin.
- `src/app/api/dota/auto-close/route.ts` — detecta la partida terminada de una sala, valida a los jugadores con Steam y cierra con `cerrar_partida_auto` (service role), con rate limit.
- `src/app/salas/[id]/page.tsx` — sala de jugador. Al pasar a `terminada`/`cancelada` muestra una pantalla de cierre y vuelve al inicio en 5 s; la sala deja de aparecer en los listados activos y la URL directa ya no permite volver al lobby.
- `src/lib/dotaAutoClose.ts` — helper de cliente para disparar la detección automática con la sesión del usuario.
- `src/lib/balance.ts` — roles de Dota, formato de MMR, promedios y orden serpiente de picks (referencia del cálculo SQL).
- `src/lib/supabase.ts` — cliente de navegador.
- `src/lib/types.ts` — tipos de dominio compartidos.
- `next.config.ts` — CSP y cabeceras de seguridad (X-Frame-Options, nosniff, HSTS en producción, etc.).
- `docs/ESTADO.md` — bitácora resumida.

## 8. Flujo de una sala

1. Admin crea sala 1v1 (cupo 2) o 5v5 (cupo 10).
2. Jugadores se unen desde el landing: quedan en **lista de espera** y pasan directo a la sala.
3. Jugador se mueve entre espera / Radiant / Dire, o el admin lo mueve. Para unirse debe tener MMR en su perfil.
4. En 5v5, al llenarse la sala se pide la verificación **"Estoy listo"** (el admin puede pedirla antes, con la sala incompleta, y se reabre si entra alguien nuevo). Cuando los 10 confirman, el admin elige dos capitanes y se lanza la moneda con sus avatares.
5. En 5v5 el ganador de la moneda elige **Radiant (pickea primero)** o **LastPick (se queda con Dire y abre el rival)**. En 1v1 el ganador del sorteo elige lado y el otro queda al contrario.
6. El draft 5v5 sigue el orden **R-DD-RR-DD-R** (8 picks): cada elegido va al equipo del capitán que lo hace. Si un capitán no pickea en **45 s**, el sistema elige al disponible de **mayor MMR**. El admin puede forzar el auto-pick o cancelar la fase.
7. Al completarse los 8 picks, cada equipo queda 5/5. El admin escribe nombre y clave del lobby y pulsa **Poner partida en juego**.
8. La sala pasa a `en_juego`; los jugadores ven el lobby en la sala y reciben notificación.
9. El admin crea el lobby en Dota 2 e invita a los jugadores (la web NO puede crear lobbies ni invitar).
10. Al terminar, la app detecta la partida en Steam y la cierra automáticamente (cualquier sala abierta). Se reparten premios y queda en el historial con duración y marcador. Si la partida no es pública (lobby custom/practice sin ticket), el admin puede pegar el ID, elegir el ganador y cerrar manualmente; al cerrarse, los jugadores ven “Partida finalizada” y vuelven al inicio en 5 s. La sala queda oculta de los listados activos, pero se conserva en el historial.

## 8.1 Perfiles públicos (20/10/2026)

- Ruta: `/jugadores/[id]`. No exige sesión y solo lee columnas públicas (`nick`, `steam_avatar_url`, `steam_nombre`, `mmr`, `roles_preferidos`, `created_at`) de `profiles`. Si el jugador tiene Steam vinculado, muestra dos enlaces **solo con icono** (Steam y Dotabuff); el `steam_id` sigue sin exponerse a visitantes anónimos.
- Estadísticas: parte de `participantes_sala` con `salas!inner.estado = 'terminada'` y `partidas!inner`; cuenta solo filas con equipo 1/2 y calcula victorias/winrate comparando `participantes_sala.equipo` con `partidas.equipo_ganador`.
- Últimas partidas: ordena por `partidas.cerrada_en`, luego `salas.iniciada_at` y `salas.created_at`; muestra fecha, modalidad, resultado, duración, marcador, chip `Auto` y enlace a Dotabuff.
- Medallas: `src/lib/mmr.ts` mapea MMR a Herald (0–769), Guardian (770–1539), Crusader (1540–2309), Archon (2310–3079), Legend (3080–3849), Ancient (3850–4619), Divine (4620–5419) e Immortal (5420+). Las imágenes locales están en `public/medallas/`: `rank_0.png` es el ícono gris de “sin calibrar”, `rank_1.png` es Herald, `rank_2.png` Guardian, `rank_3.png` Crusader, `rank_4.png` Archon, `rank_5.png` Legend, `rank_6.png` Ancient, `rank_7.png` Divine y `rank_8.png` Immortal.
- Estrellas: cada medalla de Herald a Divine muestra 1–5 estrellas según el MMR (umbrales en `src/lib/mmr.ts`), dibujadas **encima** de la medalla como en Dota 2. Inmortal se muestra con 5 estrellas como indicador de rango máximo porque la app no usa posición de leaderboard; sin MMR no se muestran estrellas. Ejemplos: 100 → Herald 1 estrella; 3500 → Legend 3 estrellas; 4500 → Ancient 5 estrellas.
- Tarjeta de jugador: muestra avatar, nick, nombre de Steam si existe, equipo, MMR, medalla con estrellas, roles, el botón “Ver perfil público” y, a su lado, los iconos de Steam/Dotabuff si hay Steam vinculado. Se renderiza en un portal para que no la recorte el scroll del chat ni los contenedores `overflow-hidden`. En el chat y en los avatares de las salas activas del landing se abre al pasar el cursor o enfocar el avatar; en la sala, además, un clic sobre la fila del jugador la abre y la fija (no navega al perfil), y se cierra con Escape o un clic fuera.
- Enlaces al perfil público desde avatares/nombres en landing, historial global, historial, chat, sala del jugador y paneles admin. El menú de perfil agrega “Perfil público”.
- Enlaces externos del jugador: `GET /api/jugadores/[id]/links` lee `steam_id` con service role, lo convierte con `src/lib/playerLinks.ts` y devuelve solo `{ steamUrl, dotabuffUrl }`; el SteamID nunca se envía al cliente. La tarjeta y el perfil público consultan al abrirse, y el perfil propio los genera directo con su `steamId` ya cargado. Rate limit de 120/min por IP y caché de 5 min en navegador / 1 h en CDN. Ambos enlaces se ocultan si no hay Steam.
- Sin SQL nuevo: usa las políticas de lectura pública de `profiles`, `salas`, `participantes_sala` y `partidas` ya aplicadas. El endpoint de enlaces no cambia los grants anónimos ni expone `steam_id`.
- Verificación (21/10/2026): con Chrome headless se probó `mik` (MMR 4500 → Ancient 5★, 6 partidas, 2 victorias, 33%, 6 enlaces a Dotabuff), un perfil sin partidas (0/0/— y estado vacío) y un UUID inválido/inexistente (“Jugador no encontrado”), en 1366×768, 390×844 y 360×800, sin overflow ni errores de consola. Los enlaces del hero, tarjetas de salas, chat, historial global, página de historial, sala autenticada (clic fija la tarjeta; “Ver perfil público” navega) y panel admin abren el perfil correcto. El perfil propio muestra “Tú” y “Editar mi perfil”. Los enlaces icon-only de Steam y Dotabuff se comprobaron en el perfil propio, el perfil público y la tarjeta (`mik` → `https://steamcommunity.com/profiles/76561198158655731` y `https://www.dotabuff.com/players/198390003`, `target="_blank"`, `rel="noopener noreferrer"`); un perfil sin Steam no muestra ninguno. La API devolvió 200 con ambas URLs, 200 con `null` sin Steam y 400 para UUID inválido. No requirió SQL.
- Verificación del chat general (21/10/2026): con Chrome headless se revisaron las 5 filas reales del chat en 1366×768, 390×844 y 360×800: avatar de 28 px, cabecera con nick y medalla `xs` de 20 px en la misma línea, nombre siempre encima de la burbuja y sin overflow horizontal. Al pasar el cursor por el avatar, la tarjeta se abre 8 px debajo de él, queda dentro del viewport y no tapa la cabecera del chat. Sin errores de consola. `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.

## 8.2 Endurecimiento de seguridad (20/10/2026)

Se auditó la app con usuarios de prueba. Hallazgos y correcciones:

- Las RPCs administrativas y de dinero ya validan `es_admin()` en el servidor (probado: un jugador no puede crear salas, aprobar recargas/retiros, editar MMR, expulsar, definir lobby, cancelar picks ni cerrar partidas).
- Las escrituras directas a `profiles`, `salas`, `participantes_sala`, `partidas`, `lobbies`, `recargas`, `retiros`, `movimientos_billetera` y `notificaciones` quedan bloqueadas para `anon` y `authenticated`; todo pasa por RPCs `security definer`.
- `profiles` deja de exponer `steam_id`, `rol` y `baneado` a visitantes anónimos. El landing, historial y chat público solo leen columnas públicas.
- El endpoint `/api/jugadores/[id]/links` usa service role solo para leer `steam_id` y devolver las URLs calculadas; no expone el SteamID ni cambia los grants de `profiles`. Tiene rate limit y caché.
- `lobbies` solo lo leen los participantes de la sala o un admin.
- Notificaciones: lectura solo del propio usuario; el panel admin usa `notificar_usuario`; la campana usa `marcar_notificaciones_leidas`.
- Storage `capturas`: bucket privado, subida solo a la carpeta del propio usuario y lectura ajena bloqueada (auditado).
- Steam: el flujo OpenID ya no pone el access token de Supabase en la URL. Usa un state firmado (HMAC) y una cookie HttpOnly de corta duración. Se eliminó `/api/auth/steam/link`, que permitía vincular una cuenta de Steam sin demostrar propiedad. En producción detrás de un proxy, define `NEXT_PUBLIC_APP_URL=https://tudominio.com` para que el `return_to` de Steam use el dominio público.
- APIs: `/api/dota/match` exige admin; `/api/dota/match`, `/api/dota/auto-close`, `/api/steam/sync`, `/api/auth/steam/start` y `/api/jugadores/[id]/links` tienen rate limit en memoria por usuario/clave o IP.
- La service role no tenía `SELECT` en `salas` ni `participantes_sala`; se le otorgó solo lectura para que el cierre automático pueda detectar la partida. No se le dieron permisos de escritura.
- Cabeceras de seguridad y CSP en `next.config.ts`.

Opcional recomendado: agregar `STEAM_STATE_SECRET` a `.env.local` con una cadena aleatoria larga. Si no está, se usa `SUPABASE_SERVICE_ROLE_KEY` como secreto HMAC (ambos quedan solo en el servidor).

### SQL de endurecimiento aplicado en Supabase (20/10/2026)

```sql
-- Endurecimiento de seguridad (20/10/2026) — aplicado y verificado
-- 1) Notificaciones: lectura propia; escritura solo por RPCs security definer.
alter table public.notificaciones enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'notificaciones'
  loop
    execute format('drop policy if exists %I on public.notificaciones', p.policyname);
  end loop;
end $$;

revoke all on public.notificaciones from anon, authenticated;
grant select on public.notificaciones to authenticated;

create policy "notificaciones_lectura_propia"
on public.notificaciones for select
to authenticated
using (user_id = auth.uid());

create index if not exists notificaciones_user_created_idx
on public.notificaciones (user_id, created_at desc);

-- 2) RPC admin para notificar (reemplaza los inserts directos del panel)
create or replace function public.notificar_usuario(
  p_user uuid,
  p_tipo text,
  p_mensaje text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo administradores';
  end if;

  if p_user is null or p_tipo is null or p_mensaje is null then
    raise exception 'Datos incompletos';
  end if;

  if length(p_mensaje) > 500 then
    raise exception 'Mensaje demasiado largo';
  end if;

  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'El usuario no existe';
  end if;

  insert into public.notificaciones (user_id, tipo, mensaje)
  values (p_user, p_tipo, p_mensaje);
end;
$$;

revoke all on function public.notificar_usuario(uuid, text, text) from public;
grant execute on function public.notificar_usuario(uuid, text, text) to authenticated;

-- 3) RPC para marcar notificaciones propias como leídas
create or replace function public.marcar_notificaciones_leidas(p_ids uuid[] default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  if p_ids is null then
    update public.notificaciones
    set leida = true
    where user_id = auth.uid() and leida = false;
  else
    update public.notificaciones
    set leida = true
    where user_id = auth.uid() and id = any(p_ids);
  end if;
end;
$$;

revoke all on function public.marcar_notificaciones_leidas(uuid[]) from public;
grant execute on function public.marcar_notificaciones_leidas(uuid[]) to authenticated;

-- 4) Perfiles: visitantes anónimos solo ven columnas públicas
revoke select on public.profiles from anon;
revoke select (steam_id, rol, baneado) on public.profiles from anon;
grant select (id, nick, steam_avatar_url, steam_nombre, mmr, roles_preferidos, created_at)
  on public.profiles to anon;

-- 5) Lobbies: solo participantes de la sala o admin
alter table public.lobbies enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'lobbies'
  loop
    execute format('drop policy if exists %I on public.lobbies', p.policyname);
  end loop;
end $$;

revoke all on public.lobbies from anon, authenticated;
grant select on public.lobbies to authenticated;

create policy "lobbies_solo_participantes"
on public.lobbies for select
to authenticated
using (
  public.es_admin()
  or exists (
    select 1
    from public.participantes_sala p
    where p.sala_id = lobbies.sala_id
      and p.user_id = auth.uid()
  )
);

-- 6) Escrituras directas: todo pasa por RPCs security definer
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.salas from anon, authenticated;
revoke insert, update, delete on public.participantes_sala from anon, authenticated;
revoke insert, update, delete on public.partidas from anon, authenticated;
revoke insert, update, delete on public.lobbies from anon, authenticated;
revoke insert, update, delete on public.recargas from anon, authenticated;
revoke insert, update, delete on public.retiros from anon, authenticated;
revoke insert, update, delete on public.movimientos_billetera from anon, authenticated;

-- 6b) Lectura mínima para la service role: la necesita el cierre automático.
--     (En este proyecto la service role no tenía SELECT en salas ni participantes_sala.)
grant select on public.salas to service_role;
grant select on public.participantes_sala to service_role;
grant select on public.profiles to service_role;

-- 7) Refrescar la caché de PostgREST para las nuevas RPCs
notify pgrst, 'reload schema';
```

## 8.3 Pulido de perfil y admin (21/10/2026)

- `/perfil`: cabecera con avatar/nick/estado MMR, email, enlace al perfil público, Steam (vincular/actualizar), saldo disponible y accesos rápidos a Recargar y Retirar. Debajo, una franja de resumen con Partidas, Solicitudes y Movimientos. El perfil competitivo mantiene MMR bloqueado + roles; las pestañas sticky usan `Partidas · Solicitudes · Billetera` en móvil y los nombres completos desde `sm`.
- Admin: `AdminPageHeader` unifica kicker, título, descripción y badge en Panel/Recargas/Retiros/Jugadores. El panel usa una tarjeta de ganancias más compacta con subtítulo, KPI 2×2 en móvil (4 columnas en `xl`) con icono/flecha y acciones rápidas con hover. Recargas, retiros y jugadores muestran estados vacíos con icono y texto de apoyo.
- `AdminNav` pasó de scroll horizontal a grilla de 5 columnas en móvil; en escritorio los 5 segmentos se reparten el ancho. Ya no se recorta “Salas” a 390/360 px.
- Verificación con Chrome headless autenticada (`mik` y admin) en 1366×768, 390×844 y 360×800: `document.scrollWidth === viewport`, pestañas y nav sin recortes, sin errores de consola. Se probó el cambio de pestaña a Movimientos y Billetera. `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan. Sin cambios de SQL ni librerías; landing y salas no se tocaron.

## 8.4 QA de datos y flujos (21/10/2026)

- `scripts/qa/lib.mjs`: utilidades REST/auth/RPC, lectura de salas y helpers de limpieza. `service_role` solo tiene grants de lectura en `salas`, `participantes_sala` y `profiles`; no puede insertar movimientos, leer `recargas` ni ejecutar RPCs de jugador.
- `scripts/qa/probes.mjs`: 21 comprobaciones de RLS/grants (`anon` y sesión), CSP/X-Frame/nosniff, endpoints `/api/steam/sync`, `/api/dota/match`, `/api/perfil/steam` y `/api/jugadores/[id]/links`, y existencia de RPCs/columnas vía OpenAPI con `service_role`.
- `scripts/qa/seed.mjs`: crea `qa-admin` y `qa-p1..qa-p10` (MMR 4500, roles variados) y acredita S/ 100 con `crear_recarga` + `aprobar_recarga`. Los perfiles QA llevan un `steam_id` ficticio para que `unirse_a_sala` los acepte. `--cleanup` llama a `qa_cleanup()` (security definer) porque `service_role` no tiene DELETE/UPDATE en movimientos, notificaciones, recargas, retiros ni participantes.
- `scripts/qa/flows.mjs`: 1v1 (sorteo, lado, lobby, notificación, cancelación y reembolso) y 5v5 (10 uniones, `iniciar_picks`, moneda, lado, picks, auto-pick, lobby y reembolso). Limpia cada sala en `finally`.
- Hallazgos corregidos con `docs/sql/2026-10-21-qa-hallazgos.sql`:
  - `pickear_jugador` y `auto_pickear_si_vencido` calculaban el siguiente capitán con el rival del turno actual en vez del rival fijo del primer pick; el draft se desbalanceaba desde el tercer pick (3/7). Ahora el reparto cierra 5/5.
  - `authenticated` podía leer `profiles.steam_id` de otros por REST. Ahora solo tiene las columnas públicas; Navbar y `/perfil` no piden `steam_id` directo y el propio lo obtiene de `GET /api/perfil/steam`.
  - El trigger de sorteo 1v1 está aplicado: el flujo 1v1 pasa completo.
- Verificación tras aplicar el SQL: `npm run qa:probes` **21/21**, `npm run qa:flows` 1v1 y 5v5 verdes, y `npm run qa:cleanup` sin perfiles `qa-*` ni salas `QA `. Se conserva `qa_cdp` para el QA visual.

## 9. Limitaciones conocidas

- **Dota 2 no tiene API pública** para crear lobbies ni enviar invitaciones. Eso lo hace el admin desde el cliente del juego.
- El cierre automático exige Auto habilitado, ID exacto asociado y resultado final verificable con todos los jugadores y lados correctos. `/api/dota/auto-close` es una vía desde la web; además `arena-cierre` invoca `arena-worker` cada minuto en Supabase, sin depender de pestañas abiertas. El cierre manual queda disponible si no hay datos verificables. La prueba operativa de pago con una partida real sigue pendiente.
- **Los lobbies personalizados/practice sin ticket no aparecen en la API pública** (Steam/OpenDota). El ID existe en el cliente, pero `GetMatchDetails` responde 500 y OpenDota 404. Probado con `9053507699` (1v1 custom): OpenDota 404 / Steam 500. Para cierre automático hay que usar un **lobby de torneo con ticket/liga** o cerrar manualmente eligiendo el ganador (sin duración/marcador).
- `GetMatchDetails` de Steam puede devolver HTTP 500 incluso para partidas públicas; `/api/dota/match` y `/api/dota/auto-close` tienen respaldo por `GetMatchHistoryBySequenceNum` y OpenDota.
- La vía web de detección consulta Steam/OpenDota; `/api/dota/auto-close` conserva rate limit en memoria y caché de 45 s de cierres exitosos. `arena-worker` consulta resultados finales de OpenDota. La existencia de un marcador simulado no acredita un resultado ni dispara pagos. Los controles financieros persistentes están en PostgreSQL.
- La UI de admin usa `es_admin` para mostrar/ocultar, pero todas las RPCs administrativas y de dinero validan `es_admin()`/`auth.role()` en el servidor. Auditado con un usuario de prueba: no puede escalar rol, escribir tablas sensibles ni ejecutar RPCs de admin.
- Notificaciones: lectura solo del propio usuario; el panel admin inserta con `notificar_usuario` y la campana marca leídas con `marcar_notificaciones_leidas`. No hay inserts directos desde el cliente.
- Los visitantes anónimos solo leen columnas públicas de `profiles`; `steam_id`, `rol` y `baneado` quedan fuera del landing/historial/chat público.
- El perfil público calcula partidas/victorias/winrate en el cliente a partir de `participantes_sala` + `salas` + `partidas`; solo cuenta salas `terminada` con equipo asignado y partida registrada.
- `lobbies` solo es legible por participantes de la sala o admin.
- Steam tiene acceso/alta y vinculación: OpenID validado en servidor, state/cookie HttpOnly, desafío de navegador y consumo único en PostgreSQL. Vincular exige conservar JWT/UUID; el token de acceso no viaja en URL. Ver implementación y pruebas vigentes en [REGISTRO-SOCIAL.md](REGISTRO-SOCIAL.md); el diseño HMAC de las secciones antiguas fue ampliado por este flujo.
- El auto-pick de los 45 s se valida en servidor. Además de la interacción web, `arena-plazos` lo ejecuta cada 5 s desde Supabase, junto con los vencimientos; no requiere una pantalla abierta.
- Los triggers de la fase de picks bloquean mover/expulsar durante `en_curso`; si hiciera falta, el admin debe cancelar la fase primero.
- Hay pruebas automatizadas de lógica, SDK/handlers, UI con proveedores simulados y PostgreSQL desechable, más verificación de tipos/lint/build y Deno en GitHub Actions. Comandos y alcance en el [README](../README.md) y [ESTADO.md](ESTADO.md). No equivalen a pruebas reales de autorización de terceros ni a una prueba de carga.

## 10. Evolución y próximos trabajos

La cola vigente está en [ESTADO.md](ESTADO.md). Chat, perfiles, operaciones, acceso social, worker persistente y mantenimiento de consultas/índices ya están implementados. La estructura actual de salas y perfil está en [ESTRUCTURA-UI.md](ESTRUCTURA-UI.md); los índices/políticas revisados, en [OPTIMIZACION-DB.md](OPTIMIZACION-DB.md).

La integración real de datos de Valve y su aprobación/ID de liga siguen pendientes. Automatizar lobbies e invitaciones con una cuenta bot es un módulo adicional que requiere alcance y recursos propios; no es una dependencia de la limpieza local ni de actualizar documentos.

## 11. Cómo probar rápido

1. `npm run dev` y abrir `http://localhost:3000`.
2. Admin: crear sala 1v1 y 5v5.
3. Jugador: unirse, moverse entre columnas, ver slots libres. El landing muestra 2 o 10 círculos y se llena en vivo.
4. Admin: mover jugadores y ver el cambio reflejado en la ventana del jugador.
5. Llenar la sala, definir lobby y poner en juego.
6. Verificar notificación 🎮 y datos del lobby en ambas pantallas.
7. Probar “Sacar” del admin: aparece un modal de confirmación; al aceptar, el jugador desaparece de la sala y su pestaña vuelve al landing automáticamente (Realtime o máximo 5 s).
8. Probar “Compartir sala” en la sala del jugador: copia el enlace o abre el menú nativo de compartir.
9. En el landing, unirse con una cuenta sin saldo debe mostrar un toast de error en lugar de un alert.
10. Landing: el chat general está a la derecha y el historial global se abre desde el botón de la izquierda.
11. Sala: el chat privado aparece en la columna derecha solo para participantes; el admin también puede escribir desde su panel.
12. Menú superior: el avatar abre el desplegable; debe cerrarse al hacer clic fuera, con Escape o al elegir una opción. En móvil solo deben quedar logo, saldo, campana y avatar.
13. Steam: al vincular una cuenta debe aparecer su avatar en navbar y perfil. En perfil, “Actualizar datos de Steam” refresca avatar y nombre. Salas, chat e historial deben mostrar el mismo avatar con fallback a la inicial.
14. Perfil: en Mi perfil guardar un MMR y, opcionalmente, 1–3 roles en orden. Un jugador sin MMR no debe poder unirse: `Completa tu MMR en Mi perfil antes de unirte a una sala`.
15. Sala 5v5 llena: el admin elige dos capitanes y pulsa “Lanzar moneda e iniciar picks”. El ganador debe ver en su sala los botones para pickear primero o elegir lado; el otro completa la decisión de lado.
16. Draft: verificar el orden serpiente A-B-B-A, que solo el capitán de turno pueda pickear y que los equipos se actualicen en vivo. Al completar 8 picks deben quedar 5/5 y `picks_estado = terminado`.
17. Auto-pick: dejar vencer 45 s sin pickear; el sistema debe elegir al disponible de mayor MMR. Probar también "Auto-pick ahora" desde el admin.
18. Cancelar picks: el admin cancela, todos vuelven a la lista de espera y se pueden mover de nuevo. Durante `en_curso` los botones de mover/expulsar deben estar bloqueados.
19. Con picks terminados, definir lobby y “Poner partida en juego”; el cierre automático debe empezar a revisar a los 8–12 s y luego cada 60–90 s.
20. Sala 1v1: al entrar el segundo jugador debe dispararse el sorteo automáticamente. El ganador ve los botones Radiant/Dire en su sala; al elegir, el otro jugador queda en el lado contrario y el sorteo queda cerrado. Si alguien sale antes de decidir, la sala vuelve a `inactivo` y el siguiente en entrar dispara un nuevo sorteo.
21. Cierre automático: jugar una partida en un **lobby de torneo con ticket** (los lobbies custom/practice sin ticket no aparecen en la API) y con cuentas con Steam vinculado. Al terminar, en menos de ~2 minutos la sala debe pasar a `terminada`, repartir premios y aparecer en el historial con duración, marcador y chip `Auto`. Probar “Detectar ahora” y el toggle `Auto` en el panel admin.
22. Cierre manual: desactivar `Auto`, pegar el ID, verificar y confirmar. También debe guardar duración/marcador en el historial. Si la partida es un lobby custom/practice sin ticket, la verificación fallará; elige el ganador manualmente y confirma (no se guardarán duración/marcador).
23. Perfil público: sin iniciar sesión, abrir el avatar/nombre de un jugador desde el landing, historial, chat o sala. Debe mostrar su MMR con la medalla correcta, partidas terminadas, victorias, winrate y últimas partidas; si tiene Steam, deben aparecer los iconos de Steam y Dotabuff en el perfil público, el perfil propio y la tarjeta, abrir el jugador correcto en otra pestaña y ocultarse ambos si no hay Steam. Probar `/jugadores/[id]` con un ID inexistente o inválido: debe aparecer “Jugador no encontrado”.
24. Guía: abrir `/como-jugar` desde el navbar de escritorio junto a Historial o desde el hero en tablet/móvil. Debe mostrar 7 pasos y 9 reglas; “Reglas” debe llevar a `#reglas`. Probar en móvil y escritorio que no haya overflow horizontal ni solapamiento en el navbar.

> Verificado el 21/10/2026 con Chrome headless en 1366×768, 390×844 y 360×800. Se probaron perfil con partidas, perfil vacío y estados de error; los enlaces desde landing, chat, historial, sala autenticada y admin abren el jugador correcto. Los iconos de Steam y Dotabuff se verificaron en el perfil propio, el perfil público y la tarjeta con `mik`; un perfil sin Steam no muestra ninguno. La fila de la tarjeta mide 234 px y no desborda. No hubo cambios de SQL.

## 12. Recarga manual y multas desde Admin → Jugadores (21/10/2026)

- Pantalla: `src/app/admin/jugadores/page.tsx`. Cada fila muestra el **saldo actual** (suma de `movimientos_billetera`, leída con la sesión del admin, paginada en lotes de 1000; si la tabla crece mucho, conviene una RPC agregada `admin_saldos`) y dos acciones: **Recargar** y **Multar**, ambas con un modal propio.
- **Recargar**: monto en soles (se convierte a céntimos), sin motivo. Se llama a `ajuste_admin(p_user, p_monto, p_motivo)` con `p_motivo = 'Recarga manual'` y `p_monto` positivo. El movimiento queda con `tipo = 'ajuste_admin'` y `creado_por` = admin. Se notifica al jugador con el tipo existente `recarga_aprobada`.
- **Multar**: monto en soles + **motivo obligatorio** (máx. 200 caracteres). Se llama a `ajuste_admin` con `p_monto` negativo y `p_motivo = 'Multa: <motivo>'`; así la multa queda lista para el panel de actividades (filtro: `tipo = 'ajuste_admin'`, `monto < 0`, descripción que empieza con `Multa: `). Si la multa supera el saldo, la UI avisa que la cuenta quedará en negativo (el movimiento lo permite). Se notifica con el tipo nuevo `multa`.
- El admin no puede recargar ni multar su propia cuenta (botones deshabilitados y validación en la función de la pantalla). El botón se bloquea mientras guarda para que un doble clic no duplique el movimiento.
- `src/components/NotificationBell.tsx` ya muestra el icono ⚠️ para el tipo `multa`.
- **SQL aplicado en Supabase**: `docs/sql/2026-10-21-multas.sql` agrega `'multa'` al `notificaciones_tipo_check` (verificado: la notificación de multa se crea y se lee en la campana).
- Verificación (21/10/2026): Chrome headless en 1366×768, 390×844 y 360×800 sin overflow ni errores de consola; flujo real de UI sobre `qa-p1` (recarga S/ 1.00 y multa S/ 0.50, saldo final S/ 102.00, notificaciones y movimientos comprobados por REST); un jugador que llama `ajuste_admin` recibe "Solo administradores". `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.

## 13. Verificación de sala "Estoy listo" y sonidos (21/10/2026)

- Objetivo: cuando la sala está completa, el admin pide que todos confirmen "Estoy listo"; suena un aviso y los jugadores ven el progreso. **No bloquea** el inicio de la partida. Además, suena un aviso cuando la sala termina.
- SQL (aplicar en Supabase): `docs/sql/2026-10-21-verificacion-sala.sql`.
  - Columnas: `salas.verificacion_estado` (`inactiva` | `pendiente` | `completa`), `salas.verificacion_iniciada_at`, `salas.verificacion_expira_at` (15 min) y `participantes_sala.verificado_at`.
  - Tipos de notificación nuevos: `verificacion_sala` (el admin pide la confirmación) y `verificacion_completa` (todos confirmaron; se avisa al creador de la sala).
  - RPCs `security definer`: `admin_pedir_verificacion(p_sala)` (solo admin, exige sala completa, reinicia el check-in y notifica a cada participante), `confirmar_verificacion(p_sala)` (solo participante de la sala; idempotente; al llegar a todos marca `completa` y notifica al admin) y `admin_cancelar_verificacion(p_sala)` (limpia estado y marcas).
- Admin (`src/app/admin/salas/[id]/page.tsx`): tarjeta **Verificación** con botón "Pedir verificación" (activo cuando la sala está completa), contador `listos/total`, "Volver a pedir" y "Cancelar".
- Jugador (`src/app/salas/[id]/page.tsx`): banner en la sala con el botón **Estoy listo** y el contador `listos/total`. En los slots de la sala, los que confirmaron muestran **✓** y los que no, nada (no se lista nombres de los que faltan).
- Sonidos (`src/lib/sonidos.ts`): motor propio con la Web Audio API, sin archivos de audio ni dependencias ni botón de volumen (siempre activo). Tonos sintetizados: `verificacion` (dos pitidos) y `fin` (acorde). El contexto de audio se libera con el primer clic/tecla porque los navegadores bloquean el autoplay.
  - El aviso de "Estoy listo" **no usa notificación**: el sonido sale del evento Realtime de `salas` (canal aparte en `NotificationBell`) y solo suena si el usuario es jugador de esa sala (se comprueba contra `participantes_sala`). Así el jugador lo oye **esté donde esté en la app** y la campana no se llena de mensajes repetidos: los avisos `verificacion_sala` se ocultan de la lista y del contador.
  - El aviso de fin de partida **suena para todos** los jugadores de la sala, estén o no dentro de ella: al cerrar la partida (a mano o por detección automática) se inserta la notificación `partida_finalizada` con la RPC `notificar_sala_terminada(p_sala)` (permitida para admin y `service_role`), y `NotificationBell` reproduce el tono `fin` al llegar.
- SQL:
  - `docs/sql/2026-10-21-verificacion-sala.sql` (columnas, tipos de notificación y las 3 RPCs de la verificación).
  - `docs/sql/2026-10-21-verificacion-sin-notificacion.sql` (versión de `admin_pedir_verificacion` que **no** crea el aviso `verificacion_sala` y borra los avisos viejos: la campana queda limpia).
  - `docs/sql/2026-10-21-fin-partida-sonido.sql` (tipo `partida_finalizada` y RPC `notificar_sala_terminada`).
  - `docs/sql/2026-10-21-realtime-notificaciones.sql` (**importante**): `notificaciones` no estaba en la publicación `supabase_realtime`. Suscribirse a una tabla no publicada hace que el servidor acepte el canal pero **no envíe ningún evento**, así que la campana no se actualizaba en vivo y tampoco llegaban los sonidos. Con ese SQL la campana y el sonido de fin de partida funcionan.
  - Las RPCs de la verificación escriben `app.picks_operacion = 'on'` porque el trigger `bloquear_cambios_en_picks` congela `participantes_sala` durante la fase de picks (si no, la verificación fallaba en 1v1, cuyo sorteo arranca solo).
- Verificación (21/10/2026): flujo de API sobre una sala 5v5 con `qa-p1..qa-p10` (pedir → 10 avisados, un jugador no puede pedir la verificación, confirmar → `verificado_at` en el slot, reintento idempotente, cancelación limpia las marcas) y flujo de UI (el jugador pulsa "Estoy listo" → "Listo. Ahora esperamos a los demás jugadores" y el contador sube a 2/10); Chrome headless en 1366×768, 390×844 y 360×800 sin overflow ni errores de consola. `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.

## 14. Donaciones entre usuarios y panel de actividades (21/10/2026)

- SQL (aplicar en Supabase): `docs/sql/2026-10-21-donaciones.sql`.
  - `actividades`: feed **público** de la actividad (`tipo` `donacion` | `multa`, `emisor_id`, `receptor_id`, `monto`, `descripcion`, `creado_en`). Lectura para `anon` y `authenticated`, sin escrituras directas; se publica en `supabase_realtime` para que el panel se actualice solo. Las claves foráneas van en `on delete cascade`: si se borra un perfil, sus actividades se van con él y el feed no queda con filas huérfanas.
  - `donaciones`: auditoría de cada donación (donante, receptor, monto, mensaje). Solo el donante y el receptor la pueden leer.
  - RPC `donar_saldo(p_receptor, p_monto, p_mensaje)`: valida sesión, monto > 0, que no sea a uno mismo y que el receptor exista y no esté baneado; **bloquea la fila del donante** (`for update`) para que dos donaciones simultáneas no gasten dos veces el mismo saldo; comprueba el saldo con `_saldo_de`; y en una sola transacción escribe la donación, los dos movimientos (`donacion_enviada` negativo y `donacion_recibida` positivo, con la misma `referencia_id`), la fila del feed y la notificación `donacion_recibida`. Devuelve el nuevo saldo del donante.
  - RPC `admin_aplicar_multa(p_user, p_monto, p_motivo)`: delega el movimiento en `ajuste_admin` (mismo control de saldo, tipo de movimiento y auditoría) y, en la misma transacción, deja la multa en `actividades` y notifica al jugador con el tipo `multa`. Admin → Jugadores usa esta RPC para las multas.
  - Sin límites de monto ni de frecuencia (decisión del usuario): las únicas restricciones son técnicas (saldo suficiente, no donarse a uno mismo, cuentas no baneadas, operación atómica).
  - Ojo: `ajuste_admin` **rechaza** dejar el saldo en negativo ("El ajuste dejaría el saldo en negativo"), así que una multa nunca puede superar el saldo del jugador; la UI lo avisa antes de enviarla.
- UI de donación: botón **Donar saldo** en el perfil público `/jugadores/[id]` **y en la tarjeta flotante de cada jugador** (`PerfilHover`, la que sale al pasar el cursor por un avatar en el landing, el chat o las salas). El modal (`src/components/ModalDonar.tsx`) lo monta una sola vez el `DonarProvider` (`src/components/DonarProvider.tsx`, en `src/app/layout.tsx`), así que cualquier tarjeta puede abrirlo sin duplicar código. Solo aparece con sesión y nunca para uno mismo. Modal con monto en soles, mensaje opcional (140 caracteres), saldo actual y aviso si el monto supera el saldo.
- Layout del landing en **tres columnas**: actividad reciente a la izquierda (compacta, con scroll propio), salas al centro y chat a la derecha. En móvil el orden es salas → actividad → chat. Las tarjetas de sala se compactaron (padding, título, stats y slots más pequeños) para que la 5v5 muestre los **10 slots en una sola fila** sin hacer scroll.
- ⚠️ La tabla `movimientos_billetera` tiene **dos** checks: `movimientos_billetera_tipo_check` (qué tipos existen) y `signo_correcto` (que el signo del monto corresponda al tipo: positivos `recarga`/`premio`/`reembolso`, negativos `entrada_sala`/`retiro`, `ajuste_admin` en ambos sentidos). Los dos necesitan admitir los tipos de donación: `docs/sql/2026-10-21-tipos-movimiento-donacion.sql` y `docs/sql/2026-10-21-signo-movimiento-donacion.sql`. Sin ellos la RPC `donar_saldo` falla con *"violates check constraint"*.
- Layout del landing en **tres columnas** y ancho de contenedor 1860 px: actividad reciente a la izquierda (340 px, compacta, con scroll propio), salas al centro (lo que más espacio toma) y chat a la derecha (360 px). Las tarjetas de sala pasan a **una por fila** hasta 1536 px de pantalla y a **dos por fila** a partir de ahí, para que la 5v5 muestre los **10 slots en una sola fila** sin hacer scroll.
- En las tarjetas de sala el segundo dato es el **premio por ganador** (`(cuota × cupo − comisión) ÷ ganadores por equipo`, el mismo cálculo que el hero y la sala) en vez del contador de jugadores; el contador `x/cupo` sigue visible como chip junto a los slots.
- Panel de actividades (`src/components/ActividadPanel.tsx`) en el landing: lista las últimas actividades con avatares superpuestos (donante y receptor), texto en dos líneas que **no se corta** (“Perfil 1 donó S/ 2.00 a Perfil 2”), el mensaje en cursiva y la hora relativa debajo. Se actualiza con Realtime y tiene refresco de respaldo cada 30 s. Sin la pastilla “En vivo”: solo un punto verde junto al título. Los avatares del feed abren la **tarjeta de jugador** al pasar el cursor (con su perfil, MMR y el botón de donar), igual que en las salas y el chat.
- Verificación automática al llenarse la sala: el trigger `iniciar_verificacion_llenada` (en `participantes_sala`, corre antes que `sorteo_1v1_sync` porque Postgres ordena los triggers AFTER por nombre) pone la sala en `verificacion_estado = 'pendiente'` en cuanto se completa. El admin puede volver a pedirla con `admin_pedir_verificacion` (reinicia el check-in) o cancelarla.
- Aviso central de verificación (`src/components/AvisoVerificacion.tsx`, montado en el layout): si al jugador le piden la confirmación y todavía no confirmó, aparece un cartel en el centro de **cualquier** página (por ejemplo, en el landing) con “Estoy listo” (confirma sin salir y **lo lleva a su sala**) e “Ir a mi sala”. Desaparece al confirmar. Ignora las salas terminadas o canceladas. El sonido lo pone la campana (evento Realtime de `salas`).
- Sonido de **moneda** (`src/lib/sonidos.ts`, tono `moneda`): cuando la sala pasa a `picks_estado = 'eleccion'` (se lanzó el sorteo), al admin que creó la sala le suena un aviso para que cree el lobby en Dota y ponga la sala en juego. Lo dispara la campana comparando `salas.creado_por` con el usuario en sesión.
- Sala 1v1: la **moneda gira** cuando los dos jugadores confirman “Estoy listo” (`src/components/MonedaSorteo.tsx`, animación 3D en `globals.css` con `moneda-giro`, 3,8 s y respeta `prefers-reduced-motion`). La moneda lleva el avatar de cada jugador en una cara y cae en la del ganador, que elige Radiant o Dire; el otro va al lado contrario. Mientras la verificación está pendiente la sala muestra “Esperando a que ambos confirmen que están listos (X/2)” y esconde los botones de lado. El admin **no mueve** a los jugadores en 1v1 y tampoco los jugadores (los equipos los define el sorteo, `elegir_lado` asigna a ambos).
- En las salas (jugador y admin) los slots muestran la **medalla de MMR** junto al MMR (`MedallaMmr` en tamaño `xs`).
- Resumen de Dota 2 por jugador (`src/lib/dotaResumen.ts` + `GET /api/dota/jugador/[id]`): el servidor lee el `steam_id` con la service role, lo convierte a `account_id` y consulta la **API pública de OpenDota** (la misma fuente de datos que Dotabuff): `/players/{id}/recentMatches?limit=20` y el catálogo `/heroes`. Se calcula en el servidor y **nunca sale el `steam_id` ni el `steam64`**; la respuesta solo trae datos agregados y la URL pública de Dotabuff. Lo que se muestra **solo en la lista de espera** (columna `equipo = null` de la sala, la fila sin equipo del panel admin y el pool de “Disponibles” del tablero de picks): los **3 héroes más jugados** con su icono, los **3 roles más jugados con su winrate** (safe/mid/offlane/support, según el `lane_role` de las partidas), los **roles de sus últimas partidas** (“Últimos: …”) y el enlace **Dotabuff ↗**. En Radiant/Dire la información **no** se muestra (el jugador ya tiene equipo definido). Si el jugador no tiene partidas públicas (cuenta privada o sin historial) la API devuelve `disponible: false` y la UI no muestra nada. Caché en memoria: catálogo de héroes 24 h y resumen por jugador 20 min, para no castigar la API pública; además la ruta exige sesión y tiene rate limit por usuario.
- Preferencia de lado informativa (`docs/sql/2026-10-21-preferencia-lado.sql`): la columna `participantes_sala.preferencia_equipo` (1 = Radiant, 2 = Dire) y la RPC `elegir_preferencia_equipo(p_sala, p_equipo)`, que solo deja elegir durante la fase de picks (`picks_estado` en `eleccion`/`en_curso`) y solo al propio jugador. En la sala aparece el botón “☀ Radiant / ☾ Dire” (con “Quitar”) y en las tarjetas de los jugadores y en los slots del admin el chip `PreferenciaLado` (“☀ Quiere Radiant”). **No cambia el reparto**: es solo para que los capitanes lo vean. La app lee la preferencia en una consulta aparte y tolerante: si el SQL todavía no está aplicado, la sala funciona igual.
- Gestión de salas desde el landing (`src/components/SalasPublicas.tsx`): solo para admins, aparece “+ Crear sala” junto al título de “Salas activas” (modal con `FormularioCrearSala`) y, en cada tarjeta, “☆ Destacar / ★ Quitar destacado” (RPC `admin_destacar_sala`, que mueve el destaque del hero) y “Gestionar →” (enlace a `/admin/salas/[id]`). El formulario de creación es el mismo componente que usa la página `/salas` (`src/components/FormularioCrearSala.tsx`).

## 15. Vista de partida en vivo (mockup) y arreglo de HTML anidado (21/10/2026)

- **Vista de partida en vivo**: ya está montada en la web real (aún con **datos de ejemplo**):
  - `src/components/VivoMarcador.tsx`: franja con el score (Radiant/Dire) y el reloj de la partida. En versión **compacta** (sala destacada del hero y tarjetas del landing) solo eso: los héroes ya van bajo el avatar y no se repiten. En versión **completa** (dentro de la sala) añade las dos listas con héroe y K/D/A.
  - `src/components/VivoJugador.tsx`: el K/D/A de un jugador; con `mostrarIcono={false}` solo el K/D/A (cuando el icono va aparte, bajo el avatar).
  - `src/components/HeroEnSlot.tsx`: **el icono del héroe que está jugando cada jugador, justo debajo de su avatar**, sin números (las kills no aportaban y se quitaron). Es la información que después usarán las apuestas por partida.
  - `src/lib/vivo.ts`: tipos (`PartidaViva`, `JugadorVivo`) y helpers (reloj `23:41`, URL del icono del héroe en el CDN de Valve, K/D/A).
  - `src/lib/vivoMock.ts`: **MOCK** que arma una partida de ejemplo con los jugadores reales de la sala. Respeta los equipos reales (`equipo` 1 = Radiant, 2 = Dire) y solo reparte por mitades si aún no hay equipos. Aparece solo cuando la sala está `en_juego`. Helper `jugadorVivoDe(partida, nick)` para cruzar el jugador de un slot con su datos en la partida.
  - Puntos de montaje:
    - `src/components/HeroArena.tsx`: franja compacta en la sala destacada del hero + el héroe bajo cada avatar.
    - `src/components/SalasPublicas.tsx`: **tarjetas de sala del landing** con la misma franja compacta (cuando la sala está `en_juego`) y el héroe bajo cada avatar.
    - `src/app/salas/[id]/page.tsx`: marcador completo arriba + héroe bajo el avatar en cada slot (variante compacta y grande) y el K/D/A junto al nick.
    - `src/app/admin/salas/[id]/page.tsx`: el panel admin también muestra el héroe bajo cada avatar.
  - Para conectarlo de verdad: un endpoint de servidor que consulte `GetLiveLeagueGames` de Valve con caché (15–30 s), cruce los `account_id` con los perfiles de la sala (nunca exponiendo el `steam_id`) y devuelva el marcador normalizado; entonces `partidaVivaMock` se sustituye por ese endpoint y la interfaz no cambia. Hace falta el `league_id` de la liga/torneo: Valve solo publica ese tipo de partidas.
  - La ruta `/demo-vivo` queda como vista previa aislada de ambos diseños.
  - En las tarjetas del landing y en el hero, el héroe va **justo debajo del avatar** de cada jugador, para saber de un vistazo quién juega qué: es la base de las apuestas por partida.
  - Cuando la sala tiene equipos (o está `en_juego`), los jugadores se ordenan por equipo: **Radiant a la izquierda y Dire a la derecha**, con un separador “vs” entre los dos grupos en las tarjetas del landing (en el hero y en móvil, Radiant ocupa las primeras posiciones).
- **HTML anidado (errores de hidratación)**: se corrigieron 4 casos:
  1. `MedallaMmr` renderizaba un `<div>` dentro de un `<p>` (el MMR de los slots). Se añadió la prop `inline`, que devuelve solo la imagen en un `<span>` para poder incrustarla en `<p>`/`<span>`.
  2. El `<div>` de la medalla dentro del `<p>` del MMR (sala del jugador).
  3. y 4. El enlace a Dotabuff (`<a>`) quedaba anidado dentro del `<a>` del perfil. Ahora el resumen de Dota 2 se renderiza **fuera** del enlace del perfil (en un `<div>` hermano) tanto en la sala como en el panel admin, y así el clic en Dotabuff no dispara la tarjeta flotante.
- Verificado: `qa:probes` 22/22 y QA visual sin errores de consola en la sala y en el panel admin (1366×768, 390×844, 360×800).
- En 5v5 **no** hay que mover a los jugadores a mano: el reparto sale de los picks (el admin elige dos capitanes, lanza la moneda y los capitanes eligen; el reparto queda 5/5). Los botones de “mover” del panel admin solo sirven antes de los picks, para balancear, y se ocultan solos durante la fase de picks.
- El hero de la sala destacada muestra el **premio por ganador** (mismo cálculo que las tarjetas y la sala: pozo − comisión entre los ganadores de cada equipo).
- `src/lib/actividades.ts` centraliza los tipos, el formato de soles, el tiempo relativo y las etiquetas de los tipos de movimiento de la billetera (`donacion_enviada`, `donacion_recibida`, `ajuste_admin`…).

## 16. Multa por abandonar una sala 5v5 llena (21/10/2026)

- **Regla**: si una sala 5v5 está llena (10/10) y un jugador se sale por su cuenta, se le cobra una **multa de S/ 2.00** además del reembolso normal de la cuota (recupera la cuota menos la multa).
- **SQL** (`docs/sql/2026-10-21-multa-abandono-5v5.sql`): RPC nueva `salir_de_sala_con_multa(p_sala)`. Llama primero a `salir_de_sala` (reembolso + salida, sin reescribir esa función) y después cobra la multa en la **misma transacción**:
  - solo si la sala es `cupo = 10` y estaba `llena`; en salas abiertas o 1v1 salir sigue siendo gratis;
  - nunca deja saldo negativo: si quedan menos de S/ 2.00 se cobra solo lo disponible;
  - la multa queda en `actividades` (`tipo = 'multa'`, emisor = receptor = jugador, descripción “Abandonó una sala 5v5 llena”) y se le notifica al jugador;
  - el movimiento de billetera es `ajuste_admin` negativo con `referencia_id` = sala.
- **UI** (`src/app/salas/[id]/page.tsx`): si `cupo === 10 && estado === 'llena'`, el botón pasa a “Salir de la sala (multa de S/ 2.00)”, se muestra el aviso bajo el botón y se pide confirmación con `ConfirmDialog` (peligro). Si la RPC aún no existe en Supabase, la app cae en `salir_de_sala` y el jugador puede salir igual (sin multa).
- **Verificado** (sin el SQL aplicado): botón, aviso, diálogo y salida con fallback probados con `qa-p1` en una sala 5v5 llena; `tsc`, `lint`, `build`, `qa:probes` 22/22 y QA visual (1366/390/360) en verde.
- **SQL ya aplicado** por el usuario el 21/10/2026. **Pendiente**: comprobar el cobro real (saldo −S/ 2.00 y la multa en el panel de actividades) abandonando una 5v5 llena.

## 17. Flujo 5v5 completo y pulido de tarjetas (21/10/2026)

- **Tarjetas del landing** (`src/components/SalasPublicas.tsx`):
  - el chip de cupo (`10/10`) pasa a la **cabecera**, junto al estado (antes iba al final de la fila de avatares);
  - cuando la sala tiene equipos, la fila se renderiza en **dos grupos**: Radiant (con la lista de espera y los slots libres) a la izquierda, un “vs” que ocupa el espacio libre (`flex-1 text-center`, así queda centrado) y Dire con `ml-auto` para pegarse al **extremo derecho**; si en móvil Dire cae a una segunda línea, `ml-auto` lo mantiene a la derecha. Sin equipos se mantiene la fila única con slots libres.
- **Franja compacta** (`src/components/VivoMarcador.tsx`): el **reloj va al centro** (grid absoluto con “En vivo” a la izquierda) y el score sigue debajo. En la versión grande (sala) el reloj sigue a la derecha.
- **Aviso al admin cuando todos están listos** (`src/components/NotificationBell.tsx` + `src/lib/sonidos.ts`):
  - tono nuevo `'listos'` (acorde ascendente C5-E5-B5-E6, más largo que el de verificación);
  - se dispara desde el canal Realtime de `salas` cuando `verificacion_estado` pasa a `completa` en una sala `cupo = 10` y el usuario es `creado_por`; se deduplica por sala (`listosVistos`) y se reinicia cuando la verificación vuelve a `pendiente`. En 1v1 no suena: allí la moneda se lanza sola y ya suena `'moneda'`.
- **Admin de la sala** (`src/app/admin/salas/[id]/page.tsx`):
  - banner verde “✅ Los 10 jugadores confirmaron que están listos. Elige a los dos capitanes y guarda para lanzar la moneda.” cuando `cupo = 10`, verificación `completa`, picks `inactivo` y 10/10 jugadores;
  - el botón pasa a “Guardar capitanes y lanzar moneda” y se pinta en verde cuando toca; el texto explica que al guardar se lanza la moneda con los avatares;
  - la tarjeta de verificación indica el siguiente paso; en `eleccion` se muestra `MonedaSorteo` con los dos capitanes.
- **Sala del jugador** (`src/app/salas/[id]/page.tsx`):
  - en 5v5 `eleccion` se muestra `MonedaSorteo` con los **avatares de los dos capitanes** y una única decisión: “☀ Radiant · pickeo primero” / “☾ LastPick · Dire”; si no eres el ganador, “Esperando a que X elija…”;
  - se elimina el paso doble anterior (`elegir_moneda` → `elegir_lado`) para 5v5; la función `elegirRadiantOLastPick` llama a la RPC nueva y traduce el error de “function not found” al aviso de SQL pendiente. El 1v1 sigue igual (`elegir_lado`).
- **SQL nuevo** (`docs/sql/2026-10-21-eleccion-radiant-lastpick.sql`): RPC `elegir_radiant_o_lastpick(p_sala uuid, p_opcion text)`.
  - valida sesión, `cupo = 10`, `picks_estado = 'eleccion'`, que quien decide sea `pick_decision_user_id` y que existan los dos capitanes;
  - `'radiant'` → el ganador queda Radiant y abre el draft; `'lastpick'` → el ganador queda Dire y el rival (Radiant) abre el draft;
  - asigna `equipo` a los dos capitanes con `set_config('app.picks_operacion','on')` (igual que `pickear_jugador`), limpia `pick_decision_user_id`/`pick_decision_tipo`, fija `pick_primer_user_id` y `pick_turno_user_id` en el capitán de Radiant, `pick_turno_expira_at = now() + 60 s` y pone `picks_estado = 'en_curso'`;
  - no reescribe `iniciar_picks`, `elegir_moneda`, `elegir_lado` ni `capitan_de_pick`: el resto del draft (serpiente A-B-B-A, 60 s por turno, auto-pick, el elegido va al equipo del capitán) sigue intacto. Se comprobó en vivo que tras una decisión de lado el sistema deja `pick_decision_user_id` y `pick_decision_tipo` en `null`, así que limpiarlos es lo esperado por el esquema.
- **QA**:
  - `scripts/qa/flows.mjs`: el escenario 1v1 se actualizó a la verificación automática (llena → `pendiente` → los dos confirman → moneda) y el 5v5 usa la RPC nueva con fallback al flujo anterior + `[pendiente]` si el SQL no está aplicado.
  - Verificado con datos reales: `llena` → `pendiente` → 10 confirmaciones → `completa` → `iniciar_picks` → `eleccion` (gana `qa-p1`, moneda con los dos capitanes, botones de decisión) y el error guiado al pulsar sin el SQL. `qa:probes` 22/22, `qa:flows` 1v1 y 5v5 en verde, `tsc`/`lint`/`build` en verde. Medición por DOM de la tarjeta: reloj y “vs” exactamente al centro (desvío 0 px) y el último avatar de Dire a 17 px del borde en 1366/390/360.

## 18. Orden del draft y verificación anticipada (22/10/2026)

- **Hallazgo al probar el flujo completo con la RPC ya aplicada**: el draft no seguía el orden acordado. El servidor repartía **R-R-R-D-D-R** y lo cerraba en el **pick 6** (equipos 5/3), porque la versión desplegada de `pickear_jugador` contaba a los dos capitanes dentro de los 8 picks y `capitan_de_pick` devolvía el turno equivocado desde el segundo pick.
- **SQL** (`docs/sql/2026-10-22-orden-picks-y-verificacion-anticipada.sql`, aplicado):
  - helper propio `siguiente_capitan_de_pick(p_primer, p_otro, p_pick)`: `1 → primer`, `2,3 → otro`, `4,5 → primer`, `6,7 → otro`, `8 → primer`, es decir **R-DD-RR-DD-R**;
  - `pickear_jugador` y `auto_pickear_si_vencido` se recrean (`drop` + `create`) usando el helper y contando solo a los **8 jugadores elegidos** (`es_capitan = false`), de modo que el draft dura 8 picks y termina 5/5; el auto-pick conserva la elección por roles/MMR del equipo que pickea (el conteo aún fallaba porque `es_capitan` no se marcaba: lo corrige el §19);
  - `admin_pedir_verificacion` ya no exige la sala completa: pide confirmar con **cualquier cantidad de jugadores ≥ 1**;
  - `iniciar_verificacion_llenada`: si la verificación estaba `completa` y entra alguien nuevo, vuelve a `pendiente` **sin borrar** `verificado_at` de los demás (solo refresca la expiración). La verificación automática al llenarse y la moneda 1v1 siguen igual (el sorteo 1v1 se detiene mientras haya una verificación `pendiente`).
- **UI**:
  - admin: el botón “Pedir 'Estoy listo'” ya no se deshabilita con la sala incompleta y el texto explica que los que entran después también reciben el aviso;
  - sala y aviso central: los textos dejan de decir “la sala está completa” cuando se pide con la sala a medias.
- **QA**: `scripts/qa/flows.mjs` ahora recorre los 6 primeros picks comprobando que cada uno va al equipo del capitán y que la secuencia es **R-DD-RR-D**, y cierra con dos auto-picks exigiendo **D y R** y el 5/5 final. Mientras el SQL no esté aplicado, el escenario imprime `[pendiente]` (el servidor sigue repartiendo 5/3) y no cuenta como falla; al aplicarlo se validan el orden y el 5/5.

## 19. Turno de 45 s, auto-pick por mayor MMR y capitanes marcados (22/10/2026)

- **Hallazgo tras aplicar el SQL del orden**: el draft seguía repartiendo **R-R-R-D-D-R** y cerrando en el pick 6. El motivo no era el helper (que devuelve `A,B,B,A,A,B,B,A` correctamente) sino que **`es_capitan` nunca se ponía en `true`**: los dos capitanes contaban dentro de los 8 picks, así que `v_hechos` arrancaba en 2, el turno se desplazaba (`n = v_hechos + 1` → 4, 5...) y el draft terminaba al llegar a 8 con solo 6 picks reales. Efecto secundario en la UI: el contador mostraba `Pick 3/8` al empezar y no salía la ⭐ de capitán.
- **SQL** (`docs/sql/2026-10-22-turno-45s-autopick-mmr.sql`, aplicado):
  - `pickear_jugador` y `auto_pickear_si_vencido` cuentan los picks **excluyendo a los dos capitanes por id** (`user_id is distinct from pick_capitan1/2`), sin depender de `es_capitan`;
  - trigger `sincronizar_capitanes` (`after insert or update of pick_capitan1, pick_capitan2 on salas`): deja `es_capitan = true` solo a esos dos jugadores (y en `false` al resto) con un backfill para las salas que ya tienen capitanes;
  - turno de **45 s**: `pickear_jugador` y `auto_pickear_si_vencido` lo fijan directamente y el trigger `limitar_turno_pick` (`before insert or update of pick_turno_expira_at on salas`) acota cualquier valor mayor a 45 s, porque `iniciar_picks`, `elegir_moneda`, `elegir_lado` y `elegir_radiant_o_lastpick` viven en funciones que no están en el repo y fijan 60 s;
  - el auto-pick ordena solo por **`mmr` desc** (desempate: `created_at asc`); ya no prioriza los roles que le faltan al equipo.
- **UI**: el texto del panel admin pasa a “Si no pickea en 45 segundos, el sistema elegirá automáticamente al jugador de mayor MMR disponible.”
- **QA**: `flows.mjs` detecta el SQL pendiente porque los capitanes no están marcados (`[pendiente]`) y, cuando esté aplicado, comprueba además que el primer turno y los siguientes duran ~45 s y que el auto-pick del pick 7 elige al jugador con más MMR de los dos que quedan (les pone 9000/1000 temporalmente y restaura su MMR al terminar).
- **Aplicado y verificado (22/10/2026)**: al primer intento el backfill falló (`null value in column "es_capitan"`) porque hay salas con participantes en un equipo pero sin `pick_capitan1/2` guardado → `user_id = null` daba `NULL` y la columna es `NOT NULL`. Se corrigió con `coalesce(..., false)` en el trigger y en el backfill (commit `e76fb21`), y el `select set_config(...)` de nivel superior se pasó a un bloque `do $$ ... $$` para que el editor no muestre `set_config | on`. Con el SQL aplicado, `npm run qa:flows` queda verde: `R-D-D-R-R-D` + auto-picks `D` y `R` → **R-DD-RR-DD-R**, 5/5, turnos de ~45 s y el pick 7 al de mayor MMR.

## 20. Datos de la partida: K/D/A, ítems, oro, día/noche y mapa (22/10/2026)

- **Qué se pidió**: cuando la sala está `en_juego`, el botón de las tarjetas del landing ya no dice “Ver sala”/“Unirse” sino **“Ver datos de la partida”**, y adentro ver K/D/A, ítems, si es de día o de noche, el oro y, si es posible, el mapa.
- **Ruta nueva**: `/salas/[id]/partida` (`src/app/salas/[id]/partida/page.tsx`), **pública** (clave anónima, igual que el landing) y envuelta en `<Suspense>` porque usa `useParams()`. Carga la sala (`id, nombre, estado, cupo, modalidad, iniciada_at`) y sus participantes, tics el reloj cada segundo y recalcula la partida. Si la sala no está `en_juego` muestra un aviso con enlace a la sala; si no existe, otro con “Ver las salas”. Se suscribe a Realtime (`UPDATE` en `salas` con filtro por id) para enterarse si el admin cierra la partida sin recargar.
- **Panel**: `src/components/PartidaDetalle.tsx`.
  - Cabecera: pulso “En vivo”, id de partida, chip **día/noche**, torres en pie, marcador Radiant/Dire con el reloj al centro.
  - Tablas por equipo (Radiant/Dire): héroe con nivel, nick, K/D/A, oro, GPM/XPM, LH/DN, neto, **ítems** (6 ranuras + neutral desde el minuto 15, con ranuras vacías punteadas) y **cuenta de respawn** (☠ segundos) si el héroe está muerto.
  - Columna derecha (`lg:sticky`): **minimapa** SVG (bases, río, tres líneas, Roshan) con los 10 héroes posicionados y oscurecido + viñeta de noche, y tarjeta de **oro de equipo** (barra Radiant/Dire, ventaja y torres). En móvil el mapa va primero y las tablas debajo.
  - Nota al pie: es una vista previa con datos simulados hasta que Valve apruebe la liga (no cambia cuando llegue el feed real).
- **Datos ampliados** (`src/lib/vivo.ts`): `JugadorVivo` gana `nivel`, `oro`, `netWorth`, `gpm`, `xpm`, `ultimosGolpes`, `denies`, `items`, `neutral`, `respawn` y `x`/`y` (posición en el minimapa); `EquipoVivo` gana `torres`; `PartidaViva` gana `esDia`. Helpers: `esDeDia` (ciclo de 5 min), `duracionDesdeInicio` (segundos desde `iniciada_at`, acotados a 90 min), `urlIconoItem` (CDN de Valve), `formatearOro` (“850” / “12,4k”) y `DURACION_MAXIMA_PARTIDA`.
- **MOCK enriquecido** (`src/lib/vivoMock.ts`): `partidaVivaMock(jugadores, duracionSegundos = 1421)` ahora **deriva todo del reloj** (mismo jugador + mismo minuto ⇒ mismos datos, sin azar): K/D/A y score escalan hasta la tabla de referencia a los ~24 min, oro/nivel/últimos golpes crecen con el tiempo, los ítems se compran de 1 en 1 cada ~3 min (botas según posición, nunca dos pares, pool determinista por hash FNV-1a del `user_id`), las torres caen con el reloj y las **posiciones avanzan por las tres rutas** del mapa (el lado Dire usa las rutas espejadas). `esDia` sale del ciclo de 5 min. Como los cuatro puntos de montaje pasan la duración desde `iniciada_at`, el reloj de las tarjetas, el hero, la sala, el panel admin y la pantalla nueva **coinciden**.
- **Puntos de montaje actualizados**:
  - `src/components/SalasPublicas.tsx`: si `estado === 'en_juego'` el CTA pasa a “Ver datos de la partida” → `/salas/${id}/partida` (por encima de los demás casos: sin sesión, ya dentro, unirse).
  - `src/components/HeroArena.tsx`: la sala destacada en juego muestra el mismo botón en el hero.
  - `src/app/salas/[id]/page.tsx`: bajo el marcador aparece “Ver datos de la partida (K/D/A, ítems, oro y mapa) →”; también pasa la duración real al marcador.
  - `src/app/admin/salas/[id]/page.tsx`: pasa la duración real al marcador.
  - `src/app/demo-vivo/page.tsx`: ahora se arma con `partidaVivaMock` (ya no duplica el literal) y añade la sección 3 con el panel completo (ancla `#datos-partida`).
- **Tipos**: `Sala`/`SalaPublica` ganan `iniciada_at` (la guarda el trigger `marcar_inicio_sala` al pasar a `en_juego`; el landing la consulta con `select('*')`, así que ya venía en el payload).
- **Detalle del trigger**: `marcar_inicio_sala` reescribe `iniciada_at = now()` en **cualquier** update de una sala `en_juego`, así que no se puede "backdatar" una partida para pruebas vía PostgREST; el QA crea la sala con el flujo real.
- **Verificado (22/10/2026)**: `tsc`, `lint` y `build` limpios; QA visual con sala 5v5 real creada por API (10 jugadores, lobby, `en_juego`): `/salas/[id]/partida` sin overflow ni errores de consola en 1366×768, 390×844 y 360×800, con el chip 🌙 Noche al minuto 8; el landing muestra el botón nuevo en los tres viewports (`--expect "Ver datos de la partida"`); capturas de referencia en `qa-artifacts/` (`partida-real.png`, `panel-escritorio.png`, `panel-movil.png`, `tabla-dire.png`, `fila-jugador.png`).

## 21. Medallas en la partida, estrellas estilo Dota y mapa con sendas y torres (22/10/2026)

- **Pedido**: en “Ver datos de la partida” quería la **medalla al costado del nick**, las **estrellas de las medallas** como en el juego (las de texto no le gustaban) y un **mapa más claro, con las torres y las sendas**.
- **Medalla junto al nick**: `JugadorVivo` gana `mmr` y `partidaVivaMock` lo copia de `profiles.mmr`, así que la medalla sale del perfil real del jugador. En la fila de `PartidaDetalle` va `MedallaMmr size="xs" inline` justo después del nick. Todos los puntos de montaje ya pedían `mmr` a Supabase (landing, hero, sala, admin); la pantalla nueva lo añadió a su `select`.
- **Estrellas estilo Dota** (`src/components/MedallaMmr.tsx`): se cambiaron los `★`/`☆` de texto por `EstrellaDota`, una **estrella SVG de 5 puntas** (`ESTRELLA_DOTA`) rellena en dorado (`#efb23c`, borde `#6b3f0a`, brillo interior `#ffdd8a` y sombra). El usuario pasó una captura del juego: las estrellas van **en arco encima de la medalla**, no debajo, así que la fila se rehizo como insignia (medalla abajo, arco arriba):
  - `medidasInsignia(rangoId, size)` calcula todo: `estrella`, `paso` (distancia entre centros), `arco` (0.42 de la estrella) y `hueco`. El `hueco` descuenta el **margen transparente del PNG** (`ARTE[rangoId].arriba`, medido pixel a pixel sobre `public/medallas/rank_*.png`) para que las estrellas queden pegadas al borde real del arte y no flotando.
  - El arco se escala con el **ancho real del arte** (`ARTE[rangoId].ancho`, de 0.555 en `rank_0` a 0.965 en Immortal), así Herald (estrecho) lleva estrellas más chicas y Ancient/Immortal más grandes; `paso` nunca baja de 0.72 estrellas para que no se pisen.
  - Posición: la estrella del centro va en el borde superior del contenedor y las de los extremos bajan según `(1 - dx²) * arco`. El contenedor reserva el alto del arco, así que no se monta sobre el texto de al lado.
  - **Immortal no lleva estrellas** (en Dota muestra la placa del leaderboard): se detecta con `rango.estrellas === null`.
  - A **20 px** (`xs`: chip de MMR de la sala, chat, panel admin) se omite el arco, porque a ese tamaño las estrellas quedan como motas; desde **32 px** (`sm`, `md`, `lg`, `xl`) sale la insignia completa.
  - `PartidaDetalle` usa `size="sm"` para que la medalla del costado del nick lleve sus estrellas; los usos de `inline` en líneas de texto siguen en `xs` y no cambian de alto.
- **Mapa nuevo** (`src/lib/mapaDota.ts` + `PartidaDetalle`):
  - Módulo con la geometría en porcentajes: `CARRILES` (senda inferior, media y superior con sus polilíneas), `BASES`, `ROSHAN`, `RUTAS_HEROE` (carry/support por la inferior, mid por la media, offlane/support por la superior) y `puntoEnRuta`.
  - `TORRES_POR_EQUIPO`: las **11 torres de cada equipo** colocadas sobre su senda (T1 la más lejana, T3 la más cercana y las dos T4 pegadas al antiguo), **en orden de caída**; `torresDestruidas(equipo, enPie)` da cuántas pintar apagadas, así que el minimapa coincide siempre con el contador “X/11” del marcador.
  - El minimapa dibuja cada senda como un camino (borde oscuro + pista clara), escribe **TOP / MID / BOT** fuera del camino, pinta las torres en pie con el color del equipo (con un halo suave) y las caídas oscuras con una ✕, y mantiene las bases, el río y Roshan. La leyenda pasó a “Torre Radiant / Torre Dire / Torre caída / Roshan” y debajo va un texto que explica cuántas quedan de cada lado y que la posición de los héroes es simulada.
  - `vivoMock` ya no tiene sus rutas propias: los héroes caminan **por las sendas que dibuja el mapa** (`RUTAS_HEROE` + `puntoEnRuta`), así que lo que se ve arriba coincide con el mapa.
  - Detalle de coordenadas: los tres carriles arrancan en la base Radiant y terminan en la Dire, así que las torres de los dos equipos caen sobre la misma polilínea (fracciones 0.40/0.26/0.13 para Radiant y 0.60/0.74/0.87 para Dire, simétricas respecto al centro).
- **Verificado (22/10/2026)**: `tsc`, `lint` y `build` limpios; QA visual 9/9 sin overflow ni errores de consola en `/`, `/demo-vivo` y `/jugadores/[id]` (1366×768, 390×844 y 360×800); más otra pasada con `--login` sobre `/salas/[id]`, `/salas/[id]/partida` y `/perfil` (9/9 OK). Sala 5v5 real creada por API para revisar la pantalla de partida (medallas con arco al lado del nick, mapa con las 22 torres y sendas, sin overflow). El arco se revisó con MMR 4300 (3 estrellas), 4500 (5 estrellas, Ancient), 5480 (Immortal, sin estrellas) y en el panel a 1366 y 390; el MMR de `qa-p1` se restauró a 4500. Capturas: `qa-artifacts/mapa.png`, `medalla-3-estrellas.png`, `medalla-5-estrellas.png`, `fila-mik.png`, `tabla-medallas-movil.png`, `panel-movil.png`.

## 22. Apuestas de sala entre usuarios (23/10/2026)

- Migración necesaria: `docs/sql/2026-10-23-apuestas-salas.sql`. **Pendiente de aplicar manualmente en Supabase**; no se ejecutó contra la base remota.
- `apuestas_sala` guarda el creador/lado, aceptante, estado, ganador, comisión y fechas. Una oferta pendiente por creador y sala; después de aceptarla se pueden publicar otras. Estados: pendiente → aceptada → liquidada/reembolsada; pendiente → cancelada/expirada.
- `crear_apuesta_sala(p_sala, p_equipo, p_id)` exige sesión, cuenta habilitada, sala en juego y saldo ≥ 550. Publicar no reserva ni cobra dinero; `p_id` permite reintentar sin duplicar. Si el creador gasta su saldo antes de que alguien acepte, la aceptación se rechaza sin cobrar al rival.
- `aceptar_apuesta_sala(p_apuesta)` bloquea sala, apuesta y los dos perfiles (orden UUID), exige usuarios distintos, oferta pendiente y saldo suficiente de ambos; cobra dos movimientos `apuesta_aporte` de −550 y confirma en una transacción. Aceptar de nuevo con el mismo rival no vuelve a cobrar. `cancelar_apuesta_sala` solo permite al creador cancelar ofertas pendientes y no mueve saldo.
- `validar_debito_billetera_trg` bloquea el perfil y verifica el saldo antes de **cualquier débito** de la billetera: también protege frente a cuotas, donaciones y retiros simultáneos. Es un cambio compartido que debe comprobarse con los flujos existentes tras aplicar la migración.
- El trigger de INSERT en `partidas` liquida las apuestas aceptadas según `equipo_ganador`: un movimiento `apuesta_premio` de +1000 al ganador, comisión de 100 en la apuesta y notificaciones a ambos. Funciona con el cierre manual y automático existentes sin depender de que un navegador permanezca abierto. El trigger de estado en `salas` también contempla el orden de cierre inverso (resultado antes de estado); las guardas por estado impiden pagar dos veces. Los resultados pagados no admiten cambiar ganador/sala ni borrarse; los demás detalles del cierre siguen siendo editables.
- Cancelar una sala reembolsa +550 a cada usuario mediante `apuesta_reembolso`, sin comisión. Las ofertas sin aceptar expiran al terminar/cancelar sin cobro. Las notificaciones usan `apuesta_aceptada` y `apuesta_resultado`; la billetera muestra etiquetas en español. `ganancias_apuestas_casa()` es solo para admin; el panel agrega la comisión de apuestas a la de partidas.
- RLS: los usuarios autenticados ven las ofertas pendientes y sus apuestas; el admin ve todas. Anon no lee apuestas. Sin escrituras directas de usuarios ni RPC pública de liquidación. Se agrega la tabla a Realtime y se actualiza `qa_cleanup()` para borrar primero apuestas QA, conservando la limpieza existente.
- `ApuestasProvider` monta un único `ModalApuestas` con `<dialog>` nativo (foco, Escape y scroll); `BotonApostar` aparece solo en salas en juego del landing, hero destacado y datos de partida. El modal muestra saldo, Radiant/Dire, ofertas contrarias, confirmación de cobro, publicar/cancelar, estados propios, vacíos y errores. Actualiza por Realtime y polling de respaldo cada 10 s; descarta cargas antiguas. Una sesión nueva reinicia los datos del modal.
- Reglas visibles: S/ 5.50 por usuario, premio **total** de S/ 10.00 (incluye el aporte) y S/ 1.00 de casa. No se retira una apuesta aceptada. Las estadísticas actuales **son simuladas**; el modal lo advierte y el resultado registrado en el cierre determina el pago.
- QA local: `npm run qa:apuestas:local`, **17/17**, PostgreSQL 18 aislado, esquema mínimo y migración real; incluye ambos ganadores/órdenes de cierre, cancelación, reintentos, permisos/RLS, saldo insuficiente, baneos, simultaneidad y cleanup. No verifica las definiciones remotas de los RPC existentes.
- QA UI: `npm run qa:apuestas:ui`, **13/13**, respuestas HTTP interceptadas y sesión ficticia en una pestaña propia, sin escrituras a Supabase. Landing/hero/partida, publicar/aceptar/cancelar, saldo, vacío/errores/SQL pendiente, sin sesión y Escape en 1366×768, 390×844 y 360×800. Capturas en `qa-artifacts/apuestas/ui/`. Landing real con y sin `--login`: 3/3 en cada pasada, sin overflow. `tsc`, `lint` y build verificados.
- Pendiente después de aplicar SQL: probar dos cuentas QA contra Supabase con cierre manual/automático, cancelar sala, recargas/retiros/donaciones/cuotas y ejecutar `qa:cleanup`. No se ha afirmado que la integración remota esté activada.

## 23. Apuestas públicas, avatares y cantidad sin límite (23/10/2026)

- El usuario confirmó aplicada `2026-10-23-apuestas-salas.sql`; se verificó lectura autenticada de la tabla por REST (HTTP 200, sin escrituras remotas). Esto reemplaza el pendiente de aplicación de la sección 22.
- **Nueva migración incremental pendiente**: `docs/sql/2026-10-23-apuestas-publicas-sin-limite.sql`, aplicar después de la base. Elimina el índice único de oferta pendiente y reemplaza `crear_apuesta_sala` sin la restricción de cantidad. Se conservan idempotencia por petición, validación de saldo/cuenta y bloqueo de la sala. No reaplicar la base después de la ampliación, porque restauraría la restricción antigua.
- El dato de comisión se quitó del modal: solo muestra aporte S/ 5.50 y premio total S/ 10.00. La contabilidad y el panel admin conservan su comisión. La migración revoca SELECT general y concede solo campos públicos; la columna `comision` no se puede consultar directamente como anon ni authenticated (admin usa RPC).
- Nueva RLS: `aceptada`, `liquidada` y `reembolsada` son legibles por todos, incluso sin sesión. Las pendientes siguen visibles a usuarios con sesión; canceladas/expiradas solo a los involucrados o admin. No se abren escrituras directas ni RPC de liquidación.
- `ApuestasPublicas` muestra cantidad y cruces en cada sala en juego del landing, hero destacado, datos de partida y modal. `CruceApuesta` ordena Radiant a la izquierda y Dire a la derecha y muestra avatar, nick y enlace de perfil de ambos, más el aporte y estado. Solo se consultan nick y `steam_avatar_url` (nunca Steam ID ni datos privados).
- `src/lib/apuestas.ts` centraliza los campos públicos explícitos y tipos. Listas paginadas con count/range y orden fecha + ID: 3 cruces por página en tarjetas/hero, 10 en listas completas, ofertas y apuestas propias; no existe tope total. Publicar sigue habilitado aunque ya existan ofertas propias pendientes. Los cruces se actualizan por Realtime, evento local tras operar y polling de respaldo.
- QA: 18/18 PostgreSQL local aislado (incluye 66 ofertas pendientes del mismo usuario, lectura de cruces por otro usuario/anon, nick de ambos y prohibición de leer comisión) y 16/16 UI con fixtures (incluye listas de 55 ofertas, 60 apuestas propias y 25 cruces, publicaciones sucesivas, sin comisión visible y ambos avatares/nicks sin sesión). Capturas actualizadas en `qa-artifacts/apuestas/ui/`. La lectura remota inicial se comprobó; las escrituras integradas requieren aplicar la ampliación.
- Acceso: se consultaron OpenAI Docs y la guía de Supabase MCP. La integración Supabase aparece sin instalar/conectar en esta sesión y no existe un MCP Supabase configurado en el archivo de configuración consultado. Se sugirió la integración disponible; para la extensión de Codex se puede configurar el servidor remoto con alcance `project_ref` y autenticar con `codex mcp login supabase`. No se modificó la configuración ni se instalaron dependencias/MCPs.

## 24. Conexión Supabase y revisión general (23/10/2026)

- Complemento instalado, autorizado y operativo: se consultó por MCP el mismo proyecto configurado en la aplicación, PostgreSQL 17.11. Solo lecturas de catálogo/funciones y Advisors; sin aplicar migraciones ni mover dinero.
- Ampliación de apuestas confirmada aplicada: `crear_apuesta_sala` sin guard de una oferta, índice antiguo ausente, política de cruces públicos presente, sin SELECT directo de comisión para anon/authenticated. Esto reemplaza el pendiente de la sección 23.
- `perfiles_publicos` remoto: `SELECT id,nick FROM profiles`, owner postgres, sin opciones invoker, SELECT solo authenticated. Los permisos subyacentes y RLS de esas columnas permiten la corrección propuesta `ALTER VIEW public.perfiles_publicos SET (security_invoker=true)`. No ejecutada; documentada para revisión/aplicación manual.
- Informe completo: `docs/REVISION-2026-10-23.md`. Hallazgos principales: criterio débil de identidad/lados en auto-close, aceptación sin corte independiente del cierre, mocks presentados En vivo, multa eludible por la RPC antigua (definición y EXECUTE authenticated confirmados), Auto solo local, saldo desactualizado tras retirar y falta de historial completo.
- Advisors: 1 error de vista, 3 avisos search_path, 19 RPC SECURITY DEFINER ejecutables por anon, 55 por authenticated y protección de contraseñas filtradas deshabilitada. No todos implican acceso indebido: muchas RPC authenticated necesitan privilegios controlados. Rendimiento: 16 FK sin índice de cobertura, 11 avisos initplan RLS, 7 de políticas múltiples y 2 índices sin uso; priorizar por carga real.
- La lista remota de migraciones registradas está vacía; el SQL manual sí fue aplicado. Versionar un esquema reproducible y validar la integración en un entorno separado.
- QA de revisión: tsc/lint/build pasan, landing 1366/390/360 3/3 sin overflow. Se ejecutó variante temporal local del harness con `_saldo_de RETURNS bigint STABLE SECURITY DEFINER`: 18/18. No se reprodujo fallo causado por STABLE; no tratarlo como vulnerabilidad confirmada. Ninguna fuente de aplicación ni base remota fue alterada en la auditoría.


## 25. Aplicación autorizada de la revisión (23/10/2026)

Alcance confirmado: aplicar recomendaciones salvo filtros/navegación de salas; hero móvil sin alterar su composición desktop; cerrar apuestas 25 minutos después de entrar en juego. El usuario autorizó SQL remoto y confirmó alojamiento Vercel. Contacto público de soporte: Miguel RIVERA, 949451869; sin plazo de atención inventado.

### Cambios aplicados en Supabase

- Migraciones registradas por MCP: `correcciones_revision_arena`, `operaciones_seguras_arena`, `historial_y_consultas_arena`, `plazos_arena`, `trabajador_cierre_supabase`, `frecuencia_apuestas`. SQL correspondiente en `docs/sql/2026-10-23-*.sql`. Las dos migraciones iniciales de apuestas siguen siendo base y ampliación, en ese orden; no reaplicar la base después de la ampliación.
- Vista invoker verificada por catálogo. Search_path fijo y retirada de EXECUTE anónimo innecesario. RLS usa identidad evaluada por consulta; desaparecieron los 11 avisos initplan. Índices añadidos para historial de apostadores, recargas y retiros; no se borraron índices por un aviso de desuso.
- Trigger de ventana: creación y aceptación requieren sala en juego, inicio válido, menos de 25 minutos y ausencia de resultado. Se rechazan jugadores de esa misma sala. Si el plazo vence durante el bloqueo, se revierte la aceptación completa, incluidos los dos débitos. Publicar no cobra. Las apuestas confirmadas se mantienen para liquidación/reembolso.
- Sin límite acumulado de ofertas/apuestas. Protección técnica ante automatización: máximo 120 publicaciones/aceptaciones exitosas por 10 segundos y usuario; pasado el intervalo se puede continuar. No es un cupo de apuestas. Reintentar la misma petición no duplica ni consume una nueva operación.
- Multa en `salir_de_sala`: salir de 5v5 llena devuelve cuota y cobra hasta S/ 2.00 una sola vez; el wrapper delega en esa función. Salir de abierta/1v1 no multa.
- `donar_saldo_seguro` y `solicitar_retiro_seguro`: ID de petición, parámetros compatibles y resultado persistido en `peticiones_dinero`, sin doble cobro por reintento. `admin_saldos` agrega en servidor; `mi_billetera_historial` conserva todos los movimientos y saldo posterior; `resumen_mis_apuestas` agrega únicamente los datos propios.

### Procesos persistentes y Vercel

- `arena-plazos` (pg_cron, cada 5 segundos) expira pendientes y ejecuta auto-picks vencidos. Las validaciones de apuesta son exactas al minuto 25 aunque la limpieza visual se haga segundos después.
- `arena-cierre` (cada minuto) llama `invocar_cierre_arena` solo si existen salas Auto con match asociado. Usa pg_net y token aleatorio generado/guardado en Vault; ninguna clave se agrega al repositorio.
- Edge Function `arena-worker` desplegada y activa. `verify_jwt=false` porque autentica explícitamente `X-Arena-Token` mediante RPC accesible solo a service_role. Sin token: 401. Token interno: 200, lista vacía en la prueba. No expone Steam ID ni secretos en la respuesta. `supabase/config.toml` conserva la configuración.
- Toma hasta ocho salas por ejecución con bloqueo SKIP LOCKED y prioridad por última revisión; ese tamaño de lote no limita la cantidad total de salas. Consulta resultados finales públicos de OpenDota y comparte `validarResultadoDota.ts` con el endpoint de la web. Exige ID exacto, inicio posterior/al de la sala, partida terminada, todos los jugadores únicos y lados correctos. La RPC vuelve a comprobar Auto/ID bajo bloqueo antes de pagar. Si no hay datos verificables, conserva la sala y permite cierre manual.
- Auto se guarda globalmente en admin. El administrador debe asociar el ID exacto de Dota mediante Verificar. El trabajador no requiere cron de Vercel ni un proceso local. `dotaCierreServer.ts` conserva el flujo web Steam/OpenDota con la misma validación estricta.

### Interfaz y cuenta

- `/mi-actividad`: todas las apuestas con rival, aporte/resultado y gestión por modal; resumen de pendientes/confirmadas/aportes/premios; historial completo de billetera con saldo posterior; recargas, retiros y partidas propias, paginadas sin recorte total.
- Recuperación `/recuperar`, retorno seguro a la partida tras login, confirmación/reenvío de registro y sesión inmediata si Auth no requiere confirmar correo. Falta probar entrega real de correo y configurar la URL pública de recuperación en la allowlist de Supabase Auth.
- Saldo se refresca al retirar y distingue error de cero. Datos simulados llevan rótulo junto al marcador. Errores de salas/historial conservan estado y permiten reintentar. Modales manuales incorporan foco inicial, Tab y restauración; apuestas conserva `<dialog>` nativo.
- Hero: únicamente ajustes bajo 640 px para evitar CTA duplicado y exceso de espacio; composición desktop conservada. Área central desktop ampliada reduciendo columnas laterales. Contraste secundario mejorado. No se añadieron filtros ni navegación de salas activas.
- Hero/tarjeta/modal comparten canal Realtime y sondeo por sala; consultas idénticas simultáneas se deduplican. Polling de respaldo cada 30 s y pausado con pestaña oculta.
- Soporte de recargas/retiros con WhatsApp al número autorizado; cada historial conserva la referencia de solicitud. No se publica un SLA sin definición del negocio.

### Verificación y límites

- `qa:apuestas:local -- --schema-real`: 23/23, clúster local desechable, 14 tablas del snapshot más ampliaciones, funciones/constraints/triggers/RLS/grants/índices reales. Prueba cuotas, multa directa/wrapper, cierre/premios, idempotencia, concurrencia, ventana, frecuencia, historial y privacidad. `auth.uid/role` se reproducen con claims; no reproduce todo GoTrue/Storage ni integra la red externa.
- Snapshot sin datos de usuarios en `docs/schema/`: public, permisos e índices. No es un respaldo completo de Supabase. La identidad bigint de movimientos también se restaura. Para cambios posteriores, mantener snapshot/migraciones y no asumir que SQL manual antiguo aparecerá en list_migrations.
- `qa:cierre`: 13/13 casos de identidad, tiempos, roster y lados. `qa:apuestas:ui`: 15/15 con HTTP interceptado y sin escrituras reales. TSC de Edge Function verificado aisladamente con tipos del SDK y shim de las dos APIs Deno usadas; despliegue/call real también verificados.
- `2026-10-23-pruebas-revision.sql`: ejecutado contra funciones remotas dentro de BEGIN/ROLLBACK; corte y reintentos correctos, todos los actores/movimientos de prueba revertidos. No se pagó ninguna partida real durante la verificación.
- `tsc`, lint, build y QA visual 1366×768, 390×844 y 360×800. CI genera tipos de rutas antes de tsc, ejecuta lint/build, pruebas locales y comprobación Deno. La interfaz aún requiere el despliegue habitual en Vercel; la base y el trabajador sí están aplicados.
- Advisor de vista/search_path/anon corregido. Quedan avisos por RPC authenticated intencionalmente privilegiadas y tablas internas RLS sin políticas (cerradas por grants). Protección de contraseñas filtradas todavía deshabilitada: se configura en Auth, no mediante SQL, y el MCP conectado no ofrece ese ajuste. Referencia: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
- El cierre automático con un resultado externo real, entrega de correo y la vinculación Steam siguen requiriendo una prueba operativa de esos proveedores. No se simula su validación como si ya se hubiese ejecutado.


## 26. Corrección de presentación y retirada de Mi actividad (23/10/2026)

- Pedido del usuario: eliminar Mi actividad y conservar exactamente los datos que mostraban movimientos, recargas/retiros y billetera del perfil. Eliminada `src/app/mi-actividad/page.tsx` y sus enlaces de Navbar/perfil. `/perfil` vuelve al archivo previo a esa incorporación, incluidas sus consultas, listados, importes, estados y descripciones; no se sustituyen por las RPC nuevas de historial. Los objetos SQL existentes se conservan; esta corrección no requiere cambios de base.
- Modal de apuestas: títulos Sora y cuerpo Manrope, superficie/tarjetas Arena Dark y acciones Prism. Se sustituye el párrafo extenso por una introducción breve y reglas desplegables; siguen visibles aporte, premio, aviso de marcador de ejemplo, confirmación de cobro y corte a los 25 minutos. Reglas y operaciones financieras conservadas.
- Contacto de Miguel Rivera (949451869) al pie de recargas/retiros, dentro del ancho principal y con tarjeta, icono y enlace WhatsApp del tema. Sin bloque flotante sobre el saldo ni tipografías ajenas.
- Verificado: tsc/lint/build; 16/16 UI de apuestas y 12/12 QA de landing, perfil, recargas y retiros en 1366×768, 390×844 y 360×800. `/mi-actividad` devuelve 404 y no quedan enlaces en el código de la aplicación. El diff de `/perfil` y Navbar respecto a su versión anterior a Mi actividad queda vacío.

## 27. Refinamiento de diseño y siguiente paso del jugador (23/10/2026)

- Alcance autorizado: paso 6 de las recomendaciones competitivas; conservar Arena Dark, Manrope/Sora y prioridad PC. No incorpora liga, datos de Dota reales, filtros/navegación adicional de salas ni Mi actividad.
- `ImportesSala` comparte la presentación de Entrada y Premio por ganador entre HeroArena y SalasPublicas. Cálculos y céntimos originales. Nombre/estado/jugadores legibles, etiquetas de equipos, avatares mayores y ajuste de nombres largos. Acciones principales Prism y secundarias neutras; enlaces de login conservan la sala de destino.
- Leyenda de jugadores y pasos de inicio en `<details>` nativo. Los cruces confirmados, con ambos avatares/nicks, siguen visibles. VivoMarcador separa el texto de demostración y el reloj centrado para evitar superposición en móvil. Fondo, imagen y columnas del hero PC conservados.
- `SiguientePaso` se monta antes de SalasPublicas dentro de SalasProvider. Oculto para visitantes, administradores y jugadores con una sala terminada; usa consultas propias a perfil, participación terminada y `es_admin`. Steam pendiente lleva a `/perfil#steam`; MMR pendiente a `/perfil#perfil-dota`; MMR 0 es válido. Perfil listo lleva al listado existente; si no hay cupos ofrece la guía; si ya participa ofrece su sala. Errores/datos incompletos muestran reintento, sin inventar progreso.
- `/api/perfil/steam?estado=1` autentica con `getUser` y solo devuelve `{vinculado:boolean}` del usuario de la sesión, con `no-store`; un perfil ausente devuelve 404. No acepta una identidad externa. El contrato anterior `{steamId}` para el perfil permanece igual. En `/perfil` se añadieron anclas, margen de scroll y resolución del enlace al montar el contenido de Suspense, sin tocar consultas ni listados.
- Sin SQL, dependencias nuevas, movimientos de dinero ni despliegue. QA de decisiones: `npm run qa:inicio`; interfaz con fixtures: `npm run qa:landing:ui`. Este último cubre 1v1/5v5, estados, cruces públicos, nombres largos, pasos, MMR 0, errores/reintento, admin y vacío; intercepta Supabase y APIs locales, bloquea escrituras y guarda capturas en `qa-artifacts/landing/ui/`. Ejecutar los harnesses de Chrome en serie. CI suma las decisiones de inicio.
- Verificación completada: tsc, lint y build; 14/14 decisiones iniciales, 16/16 escenarios visuales del landing y 16/16 de apuestas. QA de la web con sesión en landing/perfil 6/6, más landing público 3/3, a 1366×768, 390×844 y 360×800. Lectura autenticada real con cuenta QA: booleano Steam, 401 sin sesión/token inválido, identidad externa ignorada, contrato anterior conservado y las tres consultas de progreso permitidas. No se movió dinero. Capturas revisadas visualmente, incluido siguiente paso y equipos 5v5 con nombres largos.

## 28. Restauración después de modificaciones externas

- Recuperados `ImportesSala`, accesos a apuestas/cruces del hero y listado, guía inicial y acciones Prism. Fondos de tarjetas conservados. Solo las tarjetas del landing se compactan en PC cuando no están en juego; dos columnas desde 1024 px, laterales 220/240 px y guía inicial en la izquierda. Hero/destacada conservan dimensiones y roster: se retiró la reducción propuesta al aclararlo el usuario.
- Cabida de las dos primeras tarjetas completas comprobada a 1920×1080, sin scroll, para visitante/admin/nuevo usuario. A 1366×768 se conserva el hero y puede requerirse desplazamiento para ver completas las tarjetas. Sin alturas fijas ni recorte de datos o acciones.
- Verificación: tsc/lint/build, landing 19/19 con fixtures (incluye cabida y errores), apuestas 16/16 y QA general 3/3 a 1366×768, 390×844 y 360×800. Capturas de landing ahora se guardan en carpetas `qa-artifacts/landing/ui-<timestamp>` para evitar conflictos con archivos abiertos. Sin SQL, movimientos reales, commit ni despliegue.

## 29. Verificación y estado al regresar al landing

- El usuario solicita “Estoy listo” únicamente al completar la sala o por petición del admin. Se reemplaza la reapertura incondicional de una ronda completa al insertar un participante. `verificacion_origen` distingue manual/automática: trigger bloquea sala, cuenta participantes y comienza la ronda automática solo con cupo completo. DELETE limpia ronda automática si deja de estar llena y cualquier ronda al vaciarse. Solicitud manual vigente admite nuevos participantes; una solicitud manual completada no se reabre al entrar alguien salvo que se complete el cupo.
- SQL `docs/sql/2026-10-23-verificacion-rondas.sql` aplicado mediante migración MCP `verificacion_rondas_y_entrada_sala`. Retira rondas heredadas sin origen de salas incompletas. No toca saldos. Mantiene permisos/admin y search_path; el trigger no tiene EXECUTE público. Es una modificación necesaria para distinguir correctamente el pedido anticipado del admin del automatismo.
- AvisoVerificacion consulta participaciones propias y ronda vigente, clave usuario/sala/inicio; guarda descartes de la sesión y bloquea respuestas anteriores a la confirmación. Realtime de sala y participación más respaldo visible cada 10 segundos limpian avisos al cancelar, salir o vencer. “Ir a mi sala” descarta solo esa ronda; una nueva solicitud manual tiene otra clave y puede volver a avisar. Errores de confirmación visibles/reintentables.
- SalasPublicas limpia procesando al tener éxito, antes del router.push: evita que Next conserve “Uniéndose” en el landing. Salir emite `salas:refresh`; SalasProvider escucha ese evento y pageshow, y refresca datos al regresar. Confirmación dentro de sala emite `verificacion:refresh` para sincronizar el aviso global.
- Pruebas: 24/24 PostgreSQL aislado con esquema real y migración aplicada dos veces, incluidas entradas parciales, permisos, admin, confirmación, llenar/vaciar/rellenar y salidas manuales/automáticas. UI del landing 21/21: confirmar sin reaparición, nueva ronda y navegación de unión/regreso con botón habilitado. Tsc/lint/build correctos. Sin pruebas con dinero real, commit ni despliegue de la web.

## 30. Ancho de laterales y altura útil de las salas

- Grid del landing: 280 px de actividad / centro flexible / 300 px de chat desde 1024 px, 320/340 px desde 1536 px. Hero/destacada no cambian. Eliminada la leyenda de colores.
- SalasPublicas mide la posición absoluta de su rejilla y calcula el alto restante del viewport menos 16 px. ResizeObserver en rejilla/hero/navbar/cabecera y resize mantienen el cálculo actualizado sin depender del scroll ni de una altura fija del hero. Solo se aplica como min-height en PC a las primeras dos tarjetas si ambas esperan. Mínimo de 270 px conserva legibilidad en pantallas bajas; el contenido puede crecer. Resto de salas permanece en el flujo, con separación vertical de 32 px para evitar cabeceras asomadas en la vista inicial de 1080 px.
- Primera fila con padding, importes y avatares mayores; botones al pie y títulos agrupados con icono. Fondos existentes conservados. UI con fixtures verifica ancho de laterales, primera fila completa hasta el borde inferior y siguiente fila fuera de 1920×1080, para visitante/admin/nuevo usuario. Verificación responsive a 1366×768, 390×844 y 360×800. Sin SQL ni nuevas dependencias.

## 31. Todas las tarjetas uniformes y preparación de registro social

- A pedido del usuario, el tamaño se aplica a **todas** las tarjetas del listado, sin depender de fila/estado ni marca destacada del listado. El hero está fuera de la rejilla y conserva su presentación. Altura fija por viewport: 380 px móvil, cálculo del espacio bajo el hero menos 48 px en PC con mínimo de 300 px. Se reduce 32 px respecto al margen anterior de 16 px. Separación de filas 48 px para no asomar las siguientes salas en 1080 px de alto.
- Cuerpo desplazable/focalizable con nombre accesible cuando excede el alto; cruces de apuestas dentro de ese cuerpo, botones de apostar/datos/unirse fuera del scroll y siempre visibles. Todos los avatares de 32 px y mismos importes/padding en todas las fichas.
- QA del landing comprueba igualdad de alto/ancho de todas las tarjetas y acciones dentro de sus límites a 1366/390/360. A 1920×1080 comprueba primera fila completa, margen de 32–60 px, laterales anchos y siguiente fila fuera del viewport para visitante/admin/nuevo usuario. Tsc/lint/build y 21 casos UI correctos.
- Registro social: se revisaron flujos actuales y documentación oficial. Supabase público informa Google/Facebook deshabilitados; propietario confirma que no ha creado sus aplicaciones. Steam actual exige sesión para vincular y necesita un recorrido adicional para registro/inicio directo. `docs/REGISTRO-SOCIAL.md` contiene propuesta, URL de callback del proyecto y pasos de configuración. Esta etapa no implementa ni activa accesos sociales. Sin SQL/credenciales/dependencias nuevas.

## 32. Margen inicial y continuidad del scroll sobre las tarjetas

- Aclaración del usuario: pantalla 1920×1080 a zoom 100 %, dos primeras tarjetas completas con un espacio pequeño debajo; no aumentar la distancia entre filas. `SalasPublicas` calcula el alto con 16 px de margen inferior y la rejilla vuelve a su separación normal de 16 px. Mantiene el tamaño uniforme para todas las tarjetas del listado. Hero, destacada y fondos conservados.
- Se reemplaza `overscroll-contain` por `overscroll-auto` en el cuerpo de cada tarjeta: los detalles largos conservan scroll interno y al alcanzar sus límites la rueda continúa desplazando la página.
- Verificación: tsc/lint/build correctos; 21/21 casos UI con fixtures, incluidos visitante/admin/nuevo usuario a 1920×1080, margen de 8–24 px, siguiente fila fuera del viewport y desplazamiento real CDP con el cursor sobre la tarjeta. QA general 4/4 a 1920×1080, 1366×768, 390×844 y 360×800, sin overflow ni errores de consola. Capturas en `qa-artifacts/landing/ui-1792784947437/`. Sin SQL, dependencias, commit ni despliegue.

## 33. Alto útil de Chrome y dominio comprado

- La captura del usuario muestra monitor 1920×1080, pero unos 945 px de contenido al descontar las barras de Chrome y Windows. El mínimo anterior de 300 px impedía ajustarse al espacio real bajo el hero. Se baja a 220 px y se activa `data-compacta` al disponer de menos de 300 px; solo el listado compacta padding, título, importes y espacios. La identidad usa display:contents para que título y todos los chips ocupen dos filas en PC. Hero y destacada sin cambios.
- Todas las tarjetas siguen teniendo iguales dimensiones. Las dos primeras completas con margen de 16 px también en 1920×945. Pruebas de visitante, admin y nuevo usuario; escenario sin participantes y destacada en tercera posición reproduce la captura. Comprueba importes/roster sin scroll interno, botones dentro del borde, siguiente fila fuera del viewport y rueda interna con continuidad hacia la página al llegar al límite.
- Tsc/lint/build, 26/26 casos landing y QA general 5/5 en 1920×945, 1920×1080, 1366×768, 390×844 y 360×800. Capturas revisadas: `qa-artifacts/landing/ui-1792786498418/`. Build actual ejecutándose en :3001. Sin SQL, nuevas dependencias, commit ni despliegue.
- Usuario adquirió `kodigodota.com` en Spaceship. `docs/DOMINIO.md` explica conectar A/@ y CNAME/www con los valores exactos del proyecto Vercel, validación/HTTPS, `NEXT_PUBLIC_APP_URL` de Production y Site URL/Redirect URLs de Supabase. Guía contrastada con documentación oficial; no se han cambiado DNS, Auth o variables remotas. La compra no activa registro social.

## 34. Publicación autorizada en el dominio (23/10/2026)

Referencia histórica: el despliegue por CLI y `link=null` descritos abajo corresponden al 23/10. La integración GitHub/Vercel está conectada actualmente y los envíos autorizados a `main` publican mediante ella; consultar [ESTADO.md](ESTADO.md).

- Solicitud explícita del usuario: aplicar todos los cambios pendientes a la web. Proyecto Vercel enlazado `kodigodota` (`prj_jkGYnGnaeFk2QR8nrEOtUCJuWjNu`), equipo `kodigodota`, Node 22.x; CLI autenticada. Los dominios están verificados: raíz con 308 a `www.kodigodota.com`. Se conserva esa configuración y se establece `NEXT_PUBLIC_APP_URL=https://www.kodigodota.com` en Production, necesaria para que el retorno de Steam comparta origen con la cookie.
- Publicación con `vercel deploy --prod --skip-domain --yes`, comprobación protegida de landing/recuperación 200 y Mi actividad 404, y promoción posterior con `vercel promote`. Despliegue `dpl_8to1UDW8Dn3RxyXmYxbhT3ymwkup`, URL de versión `https://kodigodota-4ejizx5s0-kodigodota.vercel.app`, estado Ready. Versión anterior para reversión: `dpl_4RDzetSAyNjyJLsz8BqmVfFwEfbQ`.
- `.vercelignore` excluye capturas, pruebas, documentos, SQL, funciones de Supabase y archivos de entorno del paquete web. Inspección previa redujo la subida de unos 130 MB a 2.2 MB; sin archivos privados incluidos. Las funciones/trabajadores de Supabase ya estaban aplicados; no se reaplicó SQL ni se movió saldo.
- Verificación previa: tsc/lint/build, 24/24 PostgreSQL local con esquema real, 13/13 cierre, 14/14 primeros pasos, 16/16 UI de apuestas y 26/26 landing, QA general 4/4. Compilación cloud Ready y comprobación de www por Vercel apuntando al nuevo despliegue.
- En producción: QA público 4/4 (1920×945, 1366×768, 390×844, 360×800), con sesión 9/9 en perfil/recargas/retiros (tres viewports). Captura real de 1920×945 revisada: dos primeras salas completas, margen inferior, fondos/hero/destacada conservados. Smoke de sesión QA, estado Steam propio, 401 sin sesión, retorno Steam al dominio www con cookie HttpOnly/Secure y rutas eliminadas/recuperación. No se abrió Steam ni se vinculó una cuenta; no se realizaron operaciones financieras.
- URL Configuration de Supabase sigue pendiente: propietario respondió que aún no la configuró. Se indicó Site URL con www y Redirect URLs raíz/recuperación del mismo dominio. MCP sin capacidad de configurar Auth; navegador de automatización sin superficies disponibles. La entrega de correo y el recorrido externo completo de Steam siguen pendientes de prueba operativa.
- Repositorio GitHub sincronizado con el paquete publicado. El proyecto Vercel no tiene repositorio Git conectado (`link=null`); la publicación actual se hizo mediante CLI.

## 35. Confirmación de URL Configuration de Supabase

Esta sección conserva la comprobación inicial. El propietario confirmó después recepción del correo, cambio de contraseña e inicio de sesión; Google y Steam también se publicaron y probaron. Estado consolidado en [ESTADO.md](ESTADO.md) y [REGISTRO-SOCIAL.md](REGISTRO-SOCIAL.md).

- El propietario guardó las direcciones con www después de detectar que la primera configuración usaba el dominio raíz y rechazaba el destino de recuperación de la aplicación.
- Verificado por GET `/auth/v1/verify` con token ficticio inválido, tipo recovery y `redirect:manual`: sin destino explícito devuelve 303 a `https://www.kodigodota.com/`; con el destino explícito devuelve 303 a `https://www.kodigodota.com/recuperar?cambiar=1`. El error esperado `otp_expired` confirma rechazo del token de prueba. La ruta y consulta de recuperación se conservan.
- Sin correos enviados, enlaces de usuarios, cambios de cuentas/saldo o nuevo despliegue. Se confirma la configuración de redirecciones; entrega de correo y recorrido completo con token válido siguen como prueba operativa pendiente. Solo documentación modificada; código idéntico a la versión publicada y validada.

## 36. Favicon e indexación en Google (23/10/2026)

- El propietario confirmó recepción del correo de recuperación, cambio de contraseña e inicio de sesión correctos. Cerrada esa prueba operativa.
- Sustituido favicon genérico de Next por el logo vectorial existente: ICO con PNG 16/32/48/64/96/256, icon.png 96, apple-icon.png 180 y marca pública PNG 512. `scripts/generar-iconos.mjs` reproduce las exportaciones con sharp ya incluido por Next. Sin dependencias nuevas ni cambios al SVG del navbar.
- `sitio.ts` centraliza dominio/nombre/descripción y datos sociales. Root layout define metadataBase, título/description, robots y Open Graph/Twitter. Page principal de servidor incorpora canonical y JSON-LD WebSite/Organization; el componente cliente original se mueve íntegro a `Inicio.tsx`. Layouts de guía/historial tienen título, descripción, canonical y Open Graph propios. No se hereda la canonical de inicio a todas las páginas.
- Robots permite rastrear y anuncia sitemap con inicio, guía e historial público. No se inventan fechas de modificación. `/salas` exige sesión y se excluye; cuenta/admin/pagos/API/demostración reciben X-Robots-Tag noindex/nofollow en headers, permitiendo que el crawler lea la instrucción. Autenticación y privacidad existentes conservadas. Archivo googlecbe33b2d625a888c.html conservado.
- Verificado tsc/lint/build, 26/26 landing con fixtures y 9/9 QA de páginas públicas en 1366/390/360. Prueba HTTP local y remota: tres URLs indexables y canonical correcto, título/metadatos/JSON-LD, hashes y dimensiones de cuatro iconos, robots/sitemap, diez rutas noindex y verificación Google. Exportaciones revisadas visualmente.
- Vercel `dpl_EPqXx8bPkYosCHbmst9xcK3nrzDV`, URL de versión `https://kodigodota-o2fe488lx-kodigodota.vercel.app`, Ready. Comprobación de icono/sitemap antes de promover a www y smoke SEO completo posterior en producción. Versión anterior para reversión `dpl_8to1UDW8Dn3RxyXmYxbhT3ymwkup`.
- El usuario confirma propiedad Search Console verificada. Falta envío del sitemap e inspección/solicitud de indexación desde su cuenta; no se simula una solicitud ni un estado de Google. Guía y fuentes oficiales en `docs/GOOGLE.md`. Google decide indexación, presentación y plazos.
