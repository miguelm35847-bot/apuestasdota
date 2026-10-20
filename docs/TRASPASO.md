# Traspaso del proyecto — Apuestas Dota 2

Documento para continuar el trabajo en un chat nuevo sin perder contexto.

> Estado actual y punto exacto de reanudación: ver `docs/ESTADO.md`, sección “Punto de reanudación”.

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
- `auto_pickear_si_vencido(p_sala, p_forzar)` — auto-pick a los 60 s (o forzado por admin): prioriza roles faltantes y luego MMR.
- `cancelar_picks(p_sala)` — admin: devuelve a todos a la lista de espera y limpia la fase.
- `bloquear_cambios_en_picks()` — trigger `before update/delete` en `participantes_sala`: impide mover/expulsar durante `en_curso`; en salas 1v1 permite salir durante el sorteo de lado.
- `salir_de_sala(p_sala)` — reembolsa y permite salir en `abierta`/`llena`.
- `unirse_a_equipo(p_sala, p_equipo)` — jugador se mueve a espera (`null`), Radiant (1) o Dire (2), con límite por equipo.
- `asignar_equipo(p_sala, p_user, p_equipo)` — admin mueve a cualquier jugador (incluida espera).
- `definir_lobby(p_sala, p_nombre, p_clave)` — valida equipos completos y espera vacía, pone `en_juego` y notifica a los jugadores.
- `cancelar_sala(p_sala, p_motivo)` — reembolsa a todos y cancela.
- `cerrar_partida(p_sala, p_dota_match_id, p_equipo_ganador)` — reparte premios y guarda en `partidas`.
- `cerrar_partida_con_detalle(...)` — admin: cierra con `cerrar_partida` y completa duración, marcador y origen automático.
- `cerrar_partida_auto(...)` — solo `service_role`: la usa `/api/dota/auto-close` tras validar la partida con Steam.
- `marcar_inicio_sala()` — trigger `before update` en `salas`: guarda `iniciada_at` al pasar a `en_juego`.
- `ajuste_admin`, `mi_saldo`, `_saldo_de`, `ganancias_casa`, `es_admin`.

## 6. Funciones y SQL pendientes de ejecutar

Si el usuario aún no los ejecutó, pegarlos en Supabase:

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

### Sorteo automático de lado en salas 1v1 (pendiente de ejecutar)

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

### Cierre automático de partida e historial con detalle (pendiente de ejecutar)

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

### SQL del MMR de un solo uso y edición por admin (pendiente de ejecutar)

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

### Sala destacada elegida por el admin (pendiente de ejecutar)

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

- `src/app/page.tsx` — landing pública: monta `<HeroArena />` y debajo salas a la izquierda, chat general a la derecha e historial global en modal.
- `src/components/HeroArena.tsx` — hero del landing: sala destacada en vivo (consulta `salas` + `participantes_sala`, se actualiza por Realtime `hero-salas`), **sala elegida por el admin** (`destacada`) con respaldo automático a la más llena, **todos los slots de la modalidad** (10 en 5v5, 2 en 1v1, libres y ocupados) con `PerfilHover`, ícono de Dota 2, stats de salas/jugadores/dinero en juego, auroras, partículas y spotlight de cursor. Enlace “Entrar a la sala” o `/login` según sesión.
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
- `src/components/AdminNav.tsx` — sub-navegación segmentada compartida por las pantallas admin (`Panel · Recargas · Retiros · Jugadores · Salas`), con estado activo e íconos.
- `src/app/admin/page.tsx` — panel: tarjeta de ganancias de la casa, 4 KPI con enlaces (recargas/retiros pendientes, salas activas, jugadores) y grilla 2×2 de acciones rápidas.
- `src/app/perfil/page.tsx` — perfil, Steam, historial, movimientos, billetera. Cabecera unificada (perfil + saldo), MMR como stat bloqueado, pestañas sticky con íconos y contadores, listas en tarjetas responsivas, estados vacíos con CTA y skeletons. El MMR solo se registra una vez; después solo se editan roles. Incluye medalla de rango y enlace al perfil público.
- `src/app/jugadores/[id]/page.tsx` — perfil público: avatar/Steam, MMR + medalla, roles, partidas terminadas, victorias, winrate y últimas 10 partidas con resultado, modalidad, duración, marcador y enlace a Dotabuff. Accesible sin sesión; valida UUID y muestra un estado de “no encontrado”.
- `src/components/MedallaMmr.tsx` — imagen de medalla de rango (Herald a Immortal) con tamaños reutilizables, 1–5 estrellas según el MMR y placeholder “Sin MMR” con `rank_0.png`.
- `src/lib/mmr.ts` — rangos de MMR, `rangoMmr()` y `estrellasDeMmr()`; las imágenes viven en `public/medallas/rank_0.png` … `rank_8.png` (`rank_0` = sin calibrar, `rank_1` = Herald … `rank_8` = Immortal).
- `src/app/recargar/page.tsx`, `src/app/retirar/page.tsx` — recargas y retiros.
- `src/app/admin/recargas/page.tsx`, `src/app/admin/retiros/page.tsx` — aprobaciones.
- `src/components/Navbar.tsx` — menú único sticky con estilo **Arena Dark** (logo, saldo, campana y desplegable de perfil con perfil, recargar, retirar, historial, admin y cerrar sesión).
- `src/components/Avatar.tsx` — avatar reutilizable con imagen de Steam y fallback a inicial.
- `src/components/ChatPanel.tsx` — chat reutilizable con estilo Arena Dark: general (landing) y privado por sala.
- `src/components/NotificationBell.tsx` — campana en tiempo real con desplegable Arena Dark.
- `src/components/HistorialGlobal.tsx` — historial de partidas con tarjetas y badges Arena Dark.
- `src/lib/steamServer.ts` — resolución de vanity URL y consulta de avatar/nombre a Steam (solo servidor).
- `src/lib/steamClient.ts` — sincronización del avatar desde componentes cliente.
- `src/app/api/steam/sync/route.ts` — actualiza avatar/nombre del usuario autenticado, con rate limit.
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
4. En 5v5, al llenarse la sala el admin inicia la **fase de picks**: elige dos capitanes y se lanza la moneda en el servidor.
5. El ganador de la moneda elige **pickear primero** o **elegir lado**; el otro jugador completa la decisión.
6. Los capitanes pickean por turnos en orden **serpiente A-B-B-A**. Si un capitán no pickea en 60 s, el sistema elige por él (rol faltante y luego MMR). El admin puede forzar el auto-pick o cancelar la fase.
7. Al completarse los 8 picks, cada equipo queda 5/5. El admin escribe nombre y clave del lobby y pulsa **Poner partida en juego**.
8. La sala pasa a `en_juego`; los jugadores ven el lobby en la sala y reciben notificación.
9. El admin crea el lobby en Dota 2 e invita a los jugadores (la web NO puede crear lobbies ni invitar).
10. Al terminar, la app detecta la partida en Steam y la cierra automáticamente (cualquier sala abierta). Se reparten premios y queda en el historial con duración y marcador. Si la partida no es pública (lobby custom/practice sin ticket), el admin puede pegar el ID, elegir el ganador y cerrar manualmente; al cerrarse, los jugadores ven “Partida finalizada” y vuelven al inicio en 5 s. La sala queda oculta de los listados activos, pero se conserva en el historial.

## 8.1 Perfiles públicos (20/10/2026)

- Ruta: `/jugadores/[id]`. No exige sesión y solo lee columnas públicas (`nick`, `steam_avatar_url`, `steam_nombre`, `mmr`, `roles_preferidos`, `created_at`) de `profiles`.
- Estadísticas: parte de `participantes_sala` con `salas!inner.estado = 'terminada'` y `partidas!inner`; cuenta solo filas con equipo 1/2 y calcula victorias/winrate comparando `participantes_sala.equipo` con `partidas.equipo_ganador`.
- Últimas partidas: ordena por `partidas.cerrada_en`, luego `salas.iniciada_at` y `salas.created_at`; muestra fecha, modalidad, resultado, duración, marcador, chip `Auto` y enlace a Dotabuff.
- Medallas: `src/lib/mmr.ts` mapea MMR a Herald (0–769), Guardian (770–1539), Crusader (1540–2309), Archon (2310–3079), Legend (3080–3849), Ancient (3850–4619), Divine (4620–5419) e Immortal (5420+). Las imágenes locales están en `public/medallas/`: `rank_0.png` es el ícono gris de “sin calibrar”, `rank_1.png` es Herald, `rank_2.png` Guardian, `rank_3.png` Crusader, `rank_4.png` Archon, `rank_5.png` Legend, `rank_6.png` Ancient, `rank_7.png` Divine y `rank_8.png` Immortal.
- Estrellas: cada medalla de Herald a Divine muestra 1–5 estrellas según el MMR (umbrales en `src/lib/mmr.ts`), dibujadas **encima** de la medalla como en Dota 2. Inmortal se muestra con 5 estrellas como indicador de rango máximo porque la app no usa posición de leaderboard; sin MMR no se muestran estrellas. Ejemplos: 100 → Herald 1 estrella; 3500 → Legend 3 estrellas; 4500 → Ancient 5 estrellas.
- Tarjeta de jugador: muestra avatar, nick, nombre de Steam si existe, equipo, MMR, medalla con estrellas, roles y el botón “Ver perfil público”. Se renderiza en un portal para que no la recorte el scroll del chat ni los contenedores `overflow-hidden`. En el chat y en los avatares de las salas activas del landing se abre al pasar el cursor o enfocar el avatar; en la sala, además, un clic sobre la fila del jugador la abre y la fija (no navega al perfil), y se cierra con Escape o un clic fuera.
- Enlaces al perfil público desde avatares/nombres en landing, historial global, historial, chat, sala del jugador y paneles admin. El menú de perfil agrega “Perfil público”.
- Sin SQL nuevo: usa las políticas de lectura pública de `profiles`, `salas`, `participantes_sala` y `partidas` ya aplicadas.

## 8.2 Endurecimiento de seguridad (20/10/2026)

Se auditó la app con usuarios de prueba. Hallazgos y correcciones:

- Las RPCs administrativas y de dinero ya validan `es_admin()` en el servidor (probado: un jugador no puede crear salas, aprobar recargas/retiros, editar MMR, expulsar, definir lobby, cancelar picks ni cerrar partidas).
- Las escrituras directas a `profiles`, `salas`, `participantes_sala`, `partidas`, `lobbies`, `recargas`, `retiros`, `movimientos_billetera` y `notificaciones` quedan bloqueadas para `anon` y `authenticated`; todo pasa por RPCs `security definer`.
- `profiles` deja de exponer `steam_id`, `rol` y `baneado` a visitantes anónimos. El landing, historial y chat público solo leen columnas públicas.
- `lobbies` solo lo leen los participantes de la sala o un admin.
- Notificaciones: lectura solo del propio usuario; el panel admin usa `notificar_usuario`; la campana usa `marcar_notificaciones_leidas`.
- Storage `capturas`: bucket privado, subida solo a la carpeta del propio usuario y lectura ajena bloqueada (auditado).
- Steam: el flujo OpenID ya no pone el access token de Supabase en la URL. Usa un state firmado (HMAC) y una cookie HttpOnly de corta duración. Se eliminó `/api/auth/steam/link`, que permitía vincular una cuenta de Steam sin demostrar propiedad. En producción detrás de un proxy, define `NEXT_PUBLIC_APP_URL=https://tudominio.com` para que el `return_to` de Steam use el dominio público.
- APIs: `/api/dota/match` exige admin; `/api/dota/match`, `/api/dota/auto-close`, `/api/steam/sync` y `/api/auth/steam/start` tienen rate limit en memoria por usuario/clave.
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

## 9. Limitaciones conocidas

- **Dota 2 no tiene API pública** para crear lobbies ni enviar invitaciones. Eso lo hace el admin desde el cliente del juego.
- El cierre de partida es **automático** cuando el lobby es público y hay una sala abierta (jugador o admin): `/api/dota/auto-close` busca la partida en Steam, valida a los jugadores y cierra con `cerrar_partida_auto`. El cierre manual con ID queda como respaldo. Si nadie tiene la app abierta, la detección corre en la siguiente visita a la sala.
- **Los lobbies personalizados/practice sin ticket no aparecen en la API pública** (Steam/OpenDota). El ID existe en el cliente, pero `GetMatchDetails` responde 500 y OpenDota 404. Probado con `9053507699` (1v1 custom): OpenDota 404 / Steam 500. Para cierre automático hay que usar un **lobby de torneo con ticket/liga** o cerrar manualmente eligiendo el ganador (sin duración/marcador).
- `GetMatchDetails` de Steam puede devolver HTTP 500 incluso para partidas públicas; `/api/dota/match` y `/api/dota/auto-close` tienen respaldo por `GetMatchHistoryBySequenceNum` y OpenDota.
- La detección automática consume la API de Steam. Hay caché de 45 s por sala y rate limit en memoria por usuario/clave; en un despliegue multi-instancia conviene un rate limit distribuido (Redis).
- La UI de admin usa `es_admin` para mostrar/ocultar, pero todas las RPCs administrativas y de dinero validan `es_admin()`/`auth.role()` en el servidor. Auditado con un usuario de prueba: no puede escalar rol, escribir tablas sensibles ni ejecutar RPCs de admin.
- Notificaciones: lectura solo del propio usuario; el panel admin inserta con `notificar_usuario` y la campana marca leídas con `marcar_notificaciones_leidas`. No hay inserts directos desde el cliente.
- Los visitantes anónimos solo leen columnas públicas de `profiles`; `steam_id`, `rol` y `baneado` quedan fuera del landing/historial/chat público.
- El perfil público calcula partidas/victorias/winrate en el cliente a partir de `participantes_sala` + `salas` + `partidas`; solo cuenta salas `terminada` con equipo asignado y partida registrada.
- `lobbies` solo es legible por participantes de la sala o admin.
- El flujo Steam usa state HMAC + cookie HttpOnly; el access token de Supabase ya no viaja en la URL. `/api/auth/steam/link` fue eliminado.
- El auto-pick de los 60 s se dispara desde la sala o el panel admin abiertos (el RPC valida el vencimiento en el servidor). Si nadie tiene la pantalla abierta, se resuelve en la siguiente interacción.
- Los triggers de la fase de picks bloquean mover/expulsar durante `en_curso`; si hiciera falta, el admin debe cancelar la fase primero.
- No hay tests automatizados.

## 10. Próximos módulos

La limpieza técnica ya está hecha: tipos centralizados en `src/lib/types.ts`, sin `any` en las pantallas principales, componentes fuera del render y `npm run lint` / `npm run build` limpios.

El chat general y el chat privado por sala también están implementados en `src/components/ChatPanel.tsx`.

Opciones para continuar (elegir una):

1. **Endurecimiento de seguridad/dinero**: completado el 20/10/2026 (RLS de notificaciones/lobbies, columnas públicas de perfiles, RPCs admin, Steam state HMAC, rate limit y cabeceras). Pendiente opcional: rate limit distribuido y revisión de políticas de Storage si se agregan más buckets.
2. **Historial y estadísticas**: agregar filtros por jugador/sala, detalle de la partida y enlaces a Dotabuff/OpenDota.
3. **Créditos y comprobantes**: mejorar el flujo de recargas/retiros con comprobantes y validación admin.
4. **Lobby automático + invitaciones + ticket de torneo**: bot de Steam conectado al Game Coordinator (`steam-user` + `node-dota2`), cuenta(s) bot, creación del lobby, invitaciones automáticas y asociación a una liga/ticket para que Dota 2 muestre “jugando un torneo” y la partida aparezca en la API pública. Requiere dependencias nuevas, un proceso persistente y un league/ticket ID; es un módulo aparte.

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
17. Auto-pick: dejar vencer 60 s sin pickear; el sistema debe elegir al mejor disponible (rol faltante y luego MMR). Probar también “Auto-pick ahora” desde el admin.
18. Cancelar picks: el admin cancela, todos vuelven a la lista de espera y se pueden mover de nuevo. Durante `en_curso` los botones de mover/expulsar deben estar bloqueados.
19. Con picks terminados, definir lobby y “Poner partida en juego”; el cierre automático debe empezar a revisar a los 8–12 s y luego cada 60–90 s.
20. Sala 1v1: al entrar el segundo jugador debe dispararse el sorteo automáticamente. El ganador ve los botones Radiant/Dire en su sala; al elegir, el otro jugador queda en el lado contrario y el sorteo queda cerrado. Si alguien sale antes de decidir, la sala vuelve a `inactivo` y el siguiente en entrar dispara un nuevo sorteo.
21. Cierre automático: jugar una partida en un **lobby de torneo con ticket** (los lobbies custom/practice sin ticket no aparecen en la API) y con cuentas con Steam vinculado. Al terminar, en menos de ~2 minutos la sala debe pasar a `terminada`, repartir premios y aparecer en el historial con duración, marcador y chip `Auto`. Probar “Detectar ahora” y el toggle `Auto` en el panel admin.
22. Cierre manual: desactivar `Auto`, pegar el ID, verificar y confirmar. También debe guardar duración/marcador en el historial. Si la partida es un lobby custom/practice sin ticket, la verificación fallará; elige el ganador manualmente y confirma (no se guardarán duración/marcador).
23. Perfil público: sin iniciar sesión, abrir el avatar/nombre de un jugador desde el landing, historial, chat o sala. Debe mostrar su MMR con la medalla correcta, partidas terminadas, victorias, winrate y últimas partidas. Probar `/jugadores/[id]` con un ID inexistente o inválido: debe aparecer “Jugador no encontrado”.
