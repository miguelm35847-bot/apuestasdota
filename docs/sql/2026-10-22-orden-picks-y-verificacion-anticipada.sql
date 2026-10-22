-- Orden de picks R-DD-RR-DD-R y verificación "Estoy listo" anticipada (22/10/2026)
--
-- 1) El orden del draft pasa a ser explícito: R · DD · RR · DD · R (8 picks).
--    Antes dependía de `capitan_de_pick`, que con el turno actual devolvía
--    secuencias incorrectas (R-R-R-D-D y el draft terminaba en el pick 6).
--    Ahora `pickear_jugador` y `auto_pickear_si_vencido` usan un helper propio
--    y cuentan los 8 picks reales (sin contar a los dos capitanes).
-- 2) El admin puede pedir la verificación "Estoy listo" **antes** de que la
--    sala se llene (o después, como hasta ahora). Antes la RPC exigía la sala
--    completa.
-- 3) Si la verificación ya estaba completa y entra un jugador nuevo, vuelve a
--    quedar pendiente **sin borrar** las confirmaciones de los demás: el nuevo
--    ve el aviso y, cuando confirma, la sala se completa otra vez.
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

-- 1) Helper del orden del draft ----------------------------------------------
-- p_primer = capitán que abre (Radiant), p_otro = su rival (Dire).
-- pick 1 -> primer | 2,3 -> otro | 4,5 -> primer | 6,7 -> otro | 8 -> primer
create or replace function public.siguiente_capitan_de_pick(
  p_primer uuid,
  p_otro uuid,
  p_pick int
)
returns uuid
language sql
immutable
set search_path = public
as $$
  select case
    when p_pick is null or p_pick <= 1 or p_pick >= 8 then p_primer
    when p_pick in (2, 3, 6, 7) then p_otro
    else p_primer
  end;
$$;

grant execute on function public.siguiente_capitan_de_pick(uuid, uuid, int) to authenticated;

-- 2) Pick manual --------------------------------------------------------------
-- Se recrea (drop + create) para no depender del tipo de retorno de la versión
-- que estuviera desplegada.
drop function if exists public.pickear_jugador(uuid, uuid);

create function public.pickear_jugador(p_sala uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
  if s.pick_primer_user_id is null then raise exception 'Falta el primer pick del sorteo'; end if;

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

  -- Solo cuentan los 8 jugadores elegidos: los capitanes ya estaban en su equipo.
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
    v_otro := case
      when s.pick_primer_user_id = s.pick_capitan1 then s.pick_capitan2
      else s.pick_capitan1
    end;
    v_siguiente := public.siguiente_capitan_de_pick(s.pick_primer_user_id, v_otro, v_hechos + 1);
    update public.salas
    set pick_turno_user_id = v_siguiente,
        pick_turno_expira_at = now() + interval '60 seconds'
    where id = p_sala;
  end if;
end;
$$;

revoke all on function public.pickear_jugador(uuid, uuid) from public;
revoke all on function public.pickear_jugador(uuid, uuid) from anon;
grant execute on function public.pickear_jugador(uuid, uuid) to authenticated;

-- 3) Auto-pick (turno vencido o forzado por el admin) --------------------------
drop function if exists public.auto_pickear_si_vencido(uuid, boolean);

create function public.auto_pickear_si_vencido(p_sala uuid, p_forzar boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  -- Prioriza completar los roles que le faltan al equipo del capitán.
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
    v_otro := case
      when s.pick_primer_user_id = s.pick_capitan1 then s.pick_capitan2
      else s.pick_capitan1
    end;
    v_siguiente := public.siguiente_capitan_de_pick(s.pick_primer_user_id, v_otro, v_hechos + 1);
    update public.salas
    set pick_turno_user_id = v_siguiente,
        pick_turno_expira_at = now() + interval '60 seconds'
    where id = p_sala;
  end if;
end;
$$;

revoke all on function public.auto_pickear_si_vencido(uuid, boolean) from public;
revoke all on function public.auto_pickear_si_vencido(uuid, boolean) from anon;
grant execute on function public.auto_pickear_si_vencido(uuid, boolean) to authenticated;

-- 4) Pedir la verificación con la sala incompleta ------------------------------
create or replace function public.admin_pedir_verificacion(p_sala uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cupo int;
  v_estado text;
  v_socios int;
begin
  if not public.es_admin() then
    raise exception 'Solo administradores';
  end if;

  select s.cupo, s.estado into v_cupo, v_estado
  from public.salas s
  where s.id = p_sala
  for update;

  if v_cupo is null then
    raise exception 'La sala no existe';
  end if;

  if v_estado in ('terminada', 'cancelada') then
    raise exception 'La sala ya terminó';
  end if;

  select count(*) into v_socios
  from public.participantes_sala
  where sala_id = p_sala;

  -- Se puede pedir con la sala incompleta: solo hace falta alguien a quien avisar.
  if v_socios = 0 then
    raise exception 'La sala todavía no tiene jugadores';
  end if;

  -- El trigger `bloquear_cambios_en_picks` congela a los participantes durante
  -- la fase de picks. La verificación solo escribe `verificado_at`, así que
  -- se marca la operación para poder pedir la confirmación en cualquier fase.
  perform set_config('app.picks_operacion', 'on', true);

  update public.participantes_sala
  set verificado_at = null
  where sala_id = p_sala;

  update public.salas
  set verificacion_estado = 'pendiente',
      verificacion_iniciada_at = now(),
      verificacion_expira_at = now() + interval '15 minutes'
  where id = p_sala;

  return v_socios;
end;
$$;

revoke all on function public.admin_pedir_verificacion(uuid) from public;
revoke all on function public.admin_pedir_verificacion(uuid) from anon;
grant execute on function public.admin_pedir_verificacion(uuid) to authenticated;

-- 5) La verificación se reabre cuando entra alguien nuevo ----------------------
create or replace function public.iniciar_verificacion_llenada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cupo int;
  v_estado text;
  v_verificacion text;
  v_total int;
begin
  if TG_OP <> 'INSERT' then return new; end if;

  select s.cupo, s.estado, s.verificacion_estado
    into v_cupo, v_estado, v_verificacion
  from public.salas s
  where s.id = new.sala_id;

  if v_cupo is null then return new; end if;
  if v_estado in ('terminada', 'cancelada') then return new; end if;

  -- Ya se estaba pidiendo: no se reinicia (no se pierden las confirmaciones).
  if v_verificacion = 'pendiente' then return new; end if;

  -- Se había completado y entra alguien nuevo: vuelve a pedirse sin borrar a
  -- los que ya confirmaron; el recién llegado ve el aviso y confirma.
  if v_verificacion = 'completa' then
    update public.salas
    set verificacion_estado = 'pendiente',
        verificacion_expira_at = now() + interval '15 minutes'
    where id = new.sala_id;
    return new;
  end if;

  select count(*) into v_total
  from public.participantes_sala
  where sala_id = new.sala_id;

  if v_total < v_cupo then return new; end if;

  update public.salas
  set verificacion_estado = 'pendiente',
      verificacion_iniciada_at = now(),
      verificacion_expira_at = now() + interval '15 minutes'
  where id = new.sala_id;

  return new;
end;
$$;
