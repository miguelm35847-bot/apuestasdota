# Traspaso del proyecto — Apuestas Dota 2

Documento para continuar el trabajo en un chat nuevo sin perder contexto.

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
- `salas`: `id`, `nombre`, `cuota`, `cupo`, `comision_bp`, `modalidad` (`1v1`/`5v5`), `estado`, `creado_por`, `picks_estado` (`inactivo`/`eleccion`/`en_curso`/`terminado`), `pick_capitan1`, `pick_capitan2`, `pick_ganador_moneda`, `pick_decision_user_id`, `pick_decision_tipo` (`moneda`/`lado`), `pick_primer_user_id`, `pick_turno_user_id`, `pick_turno_expira_at`.
- `participantes_sala`: `sala_id`, `user_id`, `equipo` (nullable), `es_capitan`, `pick_orden`. `equipo = null` significa **lista de espera**; 1 = Radiant; 2 = Dire.
- `lobbies`: `sala_id` (único), `nombre`, `clave`.
- `partidas`: `sala_id`, `dota_match_id`, `equipo_ganador`, `pozo`, `comision`, `premio_por_ganador`, `cerrada_por`.
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
- `proteger_mmr()` — trigger `before update` en `profiles`: bloquea cambiar un MMR ya registrado salvo que lo haga un admin (o un proceso interno sin `auth.uid()`).
- `validar_perfil_dota()` — trigger `before insert` en `participantes_sala`: exige `profiles.mmr` antes de unirse.
- `capitan_de_pick(p_primer, p_otro, p_num)` — calcula el capitán del pick `n` con orden serpiente A-B-B-A.
- `iniciar_picks(p_sala, p_capitan1, p_capitan2)` — admin: valida sala 5v5 llena, resetea equipos, elige dos capitanes y lanza la moneda en el servidor.
- `elegir_moneda(p_sala, p_opcion)` — el ganador elige `pickear_primero` o `lado`; el otro completa la decisión.
- `elegir_lado(p_sala, p_equipo)` — asigna lado a los capitanes y arranca el draft con el primer turno.
- `pickear_jugador(p_sala, p_user)` — solo el capitán de turno; asigna equipo, guarda `pick_orden` y avanza el turno.
- `auto_pickear_si_vencido(p_sala, p_forzar)` — auto-pick a los 60 s (o forzado por admin): prioriza roles faltantes y luego MMR.
- `cancelar_picks(p_sala)` — admin: devuelve a todos a la lista de espera y limpia la fase.
- `bloquear_cambios_en_picks()` — trigger `before update/delete` en `participantes_sala`: impide mover/expulsar durante `en_curso`.
- `salir_de_sala(p_sala)` — reembolsa y permite salir en `abierta`/`llena`.
- `unirse_a_equipo(p_sala, p_equipo)` — jugador se mueve a espera (`null`), Radiant (1) o Dire (2), con límite por equipo.
- `asignar_equipo(p_sala, p_user, p_equipo)` — admin mueve a cualquier jugador (incluida espera).
- `definir_lobby(p_sala, p_nombre, p_clave)` — valida equipos completos y espera vacía, pone `en_juego` y notifica a los jugadores.
- `cancelar_sala(p_sala, p_motivo)` — reembolsa a todos y cancela.
- `cerrar_partida(p_sala, p_dota_match_id, p_equipo_ganador)` — reparte premios y guarda en `partidas`.
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

## 7. Archivos clave

- `src/app/page.tsx` — landing pública con hero **Arena Dark** (base grafito, glows indigo/Radiant/Dire, Sora + Manrope), salas a la izquierda, chat general a la derecha e historial global en modal.
- `src/components/SalasPublicas.tsx` — landing: tarjetas Arena Dark, slots por modalidad, avatares con color de equipo, unirse y actualización en vivo.
- `src/app/globals.css` — tokens de **Arena Dark** (grafito, indigo, Radiant, Dire, dorado; superficies, radios y sombras), clases nativas `.arena-shell`/`.arena-card`/`.arena-hero`/`.arena-nav`, body oscuro condicionado y controles nativos con `color-scheme: dark`.
- `src/app/layout.tsx` — carga **Manrope** y **Sora** con `next/font` y aplica la tipografía global.
- `src/lib/useArenaBody.ts` — hook que activa `body.arena-body` mientras una pantalla Arena está montada.
- `src/app/salas/page.tsx` — listado y creación de salas (admin), con conteos en una consulta y actualización en vivo.
- `src/app/salas/[id]/page.tsx` — sala del jugador: Radiant/Dire y **lista de espera** en tres columnas en pantallas grandes, moverse, lobby, compartir enlace, salir, expulsión en vivo, **tablero de picks** (moneda, elección de lado, picks con cuenta regresiva) y tarjeta **Mis roles** compacta con guardado automático y actualización en vivo. Chat privado a la derecha.
- `src/app/admin/salas/[id]/page.tsx` — gestión: mover jugadores (inmediato), expulsar, ver MMR/roles y promedios por equipo, **iniciar/cancelar la fase de picks**, forzar auto-pick, poner en juego y cerrar partida con confirmación.
- `src/app/admin/jugadores/page.tsx` — admin: buscador de jugadores, MMR/roles y edición del MMR (antifraude) mediante `admin_editar_mmr`.
- `src/components/ConfirmDialog.tsx` — modal reutilizable de confirmación para acciones destructivas.
- `src/components/Toast.tsx` — aviso flotante con cierre automático y estilo Arena Dark.
- `src/app/admin/page.tsx` — panel de ganancias y accesos.
- `src/app/perfil/page.tsx` — perfil, Steam, historial, movimientos, billetera. El MMR solo se registra una vez; después el campo queda bloqueado y solo se editan roles.
- `src/app/recargar/page.tsx`, `src/app/retirar/page.tsx` — recargas y retiros.
- `src/app/admin/recargas/page.tsx`, `src/app/admin/retiros/page.tsx` — aprobaciones.
- `src/components/Navbar.tsx` — menú único sticky con estilo **Arena Dark** (logo, saldo, campana y desplegable de perfil con perfil, recargar, retirar, historial, admin y cerrar sesión).
- `src/components/Avatar.tsx` — avatar reutilizable con imagen de Steam y fallback a inicial.
- `src/components/ChatPanel.tsx` — chat reutilizable con estilo Arena Dark: general (landing) y privado por sala.
- `src/components/NotificationBell.tsx` — campana en tiempo real con desplegable Arena Dark.
- `src/components/HistorialGlobal.tsx` — historial de partidas con tarjetas y badges Arena Dark.
- `src/lib/steamServer.ts` — resolución de vanity URL y consulta de avatar/nombre a Steam (solo servidor).
- `src/lib/steamClient.ts` — sincronización del avatar desde componentes cliente.
- `src/app/api/steam/sync/route.ts` — actualiza avatar/nombre del usuario autenticado.
- `src/app/api/dota/match/route.ts` — proxy a Steam Web API (usa `STEAM_API_KEY`).
- `src/lib/balance.ts` — roles de Dota, formato de MMR, promedios y orden serpiente de picks (referencia del cálculo SQL).
- `src/lib/supabase.ts` — cliente de navegador.
- `src/lib/types.ts` — tipos de dominio compartidos.
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
10. Al terminar, el admin pega el ID de la partida, verifica con Steam API y cierra: se reparten premios y queda en el historial.

## 9. Limitaciones conocidas

- **Dota 2 no tiene API pública** para crear lobbies ni enviar invitaciones. Eso lo hace el admin desde el cliente del juego.
- El cierre de partida es **manual** (botón Verificar + ID de Dotabuff). El cierre automático con Steam API es el siguiente módulo.
- La verificación de admin es del lado del cliente (`supabase.rpc('es_admin')`). Sirve para operar; para lanzamiento público hay que mover la seguridad al servidor.
- Las notificaciones se insertan desde el cliente con RLS permisiva (temporal).
- El auto-pick de los 60 s se dispara desde la sala o el panel admin abiertos (el RPC valida el vencimiento en el servidor). Si nadie tiene la pantalla abierta, se resuelve en la siguiente interacción.
- Los triggers de la fase de picks bloquean mover/expulsar durante `en_curso`; si hiciera falta, el admin debe cancelar la fase primero.
- No hay tests automatizados.

## 10. Próximos módulos

La limpieza técnica ya está hecha: tipos centralizados en `src/lib/types.ts`, sin `any` en las pantallas principales, componentes fuera del render y `npm run lint` / `npm run build` limpios.

El chat general y el chat privado por sala también están implementados en `src/components/ChatPanel.tsx`.

Opciones para continuar (elegir una):

1. **Endurecimiento de seguridad/dinero**: mover la verificación de admin al servidor, restringir notificaciones y revisar RLS antes del lanzamiento público.
2. **Cierre automático + historial con datos de la partida**:
   - Guardar `steam_id` de cada participante (ya existe en `profiles`).
   - Consultar partidas recientes con Steam Web API y detectar una partida común.
   - Cerrar la sala con `cerrar_partida` y compartir duración, marcador y ganador en el historial.
   - Requisito: el lobby debe ser público en Dota 2 para que Steam exponga la partida.
   - Alternativa segura: mantener el cierre manual y mejorar el historial con los datos que ya devuelve `/api/dota/match`.

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
19. Con picks terminados, definir lobby y “Poner partida en juego”; el flujo de cierre manual sigue igual.
