# Referencia técnica — KódigoDota

Documento de referencia del proyecto: esquema SQL, archivos, flujos y verificaciones detalladas. Ya no es un documento de traspaso entre chats.

> Estado vigente y pendientes: `docs/ESTADO.md`. Bitácora: `docs/HISTORIAL.md`.
> Las verificaciones nuevas se anotan en el historial, no aquí.

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
4. En 5v5, al llenarse la sala el admin inicia la **fase de picks**: elige dos capitanes y se lanza la moneda en el servidor.
5. El ganador de la moneda elige **pickear primero** o **elegir lado**; el otro jugador completa la decisión.
6. Los capitanes pickean por turnos en orden **serpiente A-B-B-A**. Si un capitán no pickea en 60 s, el sistema elige por él (rol faltante y luego MMR). El admin puede forzar el auto-pick o cancelar la fase.
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
- Gestión de salas desde el landing (`src/components/SalasPublicas.tsx`): solo para admins, aparece “+ Crear sala” junto al título de “Salas activas” (modal con `FormularioCrearSala`) y, en cada tarjeta, “☆ Destacar / ★ Quitar destacado” (RPC `admin_destacar_sala`, que mueve el destaque del hero) y “Gestionar →” (enlace a `/admin/salas/[id]`). El formulario de creación es el mismo componente que usa la página `/salas` (`src/components/FormularioCrearSala.tsx`).
- En 5v5 **no** hay que mover a los jugadores a mano: el reparto sale de los picks (el admin elige dos capitanes, lanza la moneda y los capitanes eligen; el reparto queda 5/5). Los botones de “mover” del panel admin solo sirven antes de los picks, para balancear, y se ocultan solos durante la fase de picks.
- El hero de la sala destacada muestra el **premio por ganador** (mismo cálculo que las tarjetas y la sala: pozo − comisión entre los ganadores de cada equipo).
- `src/lib/actividades.ts` centraliza los tipos, el formato de soles, el tiempo relativo y las etiquetas de los tipos de movimiento de la billetera (`donacion_enviada`, `donacion_recibida`, `ajuste_admin`…).
