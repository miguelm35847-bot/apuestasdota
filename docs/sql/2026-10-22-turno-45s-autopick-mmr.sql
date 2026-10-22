-- Turno de picks de 45 s, auto-pick por mayor MMR y capitanes marcados (22/10/2026)
--
-- 1) El turno del draft dura 45 s (antes 60). `iniciar_picks`, `elegir_moneda`,
--    `elegir_lado` y `elegir_radiant_o_lastpick` fijan 60 s desde dentro de
--    funciones que no están en el repo, así que un trigger acota
--    `pick_turno_expira_at` a 45 s venga de donde venga.
-- 2) El auto-pick elige siempre al jugador disponible con **más MMR** (antes
--    priorizaba los roles que le faltaban al equipo y luego el MMR).
-- 3) Los dos capitanes quedan con `es_capitan = true` en `participantes_sala`.
--    Hasta ahora la columna se quedaba en `false`, así que la UI contaba a los
--    capitanes como picks ("Pick 3/8" al empezar) y no mostraba la ⭐.
-- 4) El draft cuenta solo los jugadores elegidos: se excluyen los dos capitanes
--    de la sala por id, sin depender de `es_capitan`. Con el conteo anterior
--    (que incluía a los capitanes) el draft se cerraba en el pick 6 (5/3).
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

-- 1) Turno de 45 s -----------------------------------------------------------
create or replace function public.limitar_turno_pick()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.pick_turno_expira_at is not null
     and new.pick_turno_expira_at > now() + interval '45 seconds' then
    new.pick_turno_expira_at := now() + interval '45 seconds';
  end if;
  return new;
end;
$$;

drop trigger if exists limitar_turno_pick on public.salas;
create trigger limitar_turno_pick
  before insert or update of pick_turno_expira_at on public.salas
  for each row execute function public.limitar_turno_pick();

-- 2) Capitanes marcados en participantes_sala ---------------------------------
create or replace function public.sincronizar_capitanes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- El trigger de la fase de picks congela los cambios de participantes: esta
  -- sincronización es interna y debe poder escribir.
  perform set_config('app.picks_operacion', 'on', true);

  update public.participantes_sala ps
  set es_capitan = coalesce(
        ps.user_id = new.pick_capitan1 or ps.user_id = new.pick_capitan2,
        false
      )
  where ps.sala_id = new.id
    and ps.es_capitan is distinct from coalesce(
          ps.user_id = new.pick_capitan1 or ps.user_id = new.pick_capitan2,
          false
        );

  return new;
end;
$$;

drop trigger if exists sincronizar_capitanes on public.salas;
create trigger sincronizar_capitanes
  after insert or update of pick_capitan1, pick_capitan2 on public.salas
  for each row execute function public.sincronizar_capitanes();

-- Salas que ya tienen capitanes guardados (draft en curso o en elección).
select set_config('app.picks_operacion', 'on', true);

update public.participantes_sala ps
set es_capitan = coalesce(
      ps.user_id = s.pick_capitan1 or ps.user_id = s.pick_capitan2,
      false
    )
from public.salas s
where s.id = ps.sala_id
  and ps.es_capitan is distinct from coalesce(
        ps.user_id = s.pick_capitan1 or ps.user_id = s.pick_capitan2,
        false
      );

-- 3) Pick manual (45 s y conteo real de 8 picks) ------------------------------
-- Se recrea (drop + create) para no depender del tipo de retorno desplegado.
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

  -- Solo cuentan los jugadores elegidos: los dos capitanes ya estaban en su equipo.
  select count(*) into v_hechos
  from public.participantes_sala
  where sala_id = p_sala
    and equipo is not null
    and user_id is distinct from s.pick_capitan1
    and user_id is distinct from s.pick_capitan2;

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
        pick_turno_expira_at = now() + interval '45 seconds'
    where id = p_sala;
  end if;
end;
$$;

revoke all on function public.pickear_jugador(uuid, uuid) from public;
revoke all on function public.pickear_jugador(uuid, uuid) from anon;
grant execute on function public.pickear_jugador(uuid, uuid) to authenticated;

-- 4) Auto-pick por mayor MMR (turno vencido o forzado por el admin) -----------
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

  -- Elige al disponible con más MMR (desempate: el que entró antes).
  select ps.user_id into v_target
  from public.participantes_sala ps
  left join public.profiles pr on pr.id = ps.user_id
  where ps.sala_id = p_sala
    and ps.equipo is null
    and ps.user_id is distinct from s.pick_capitan1
    and ps.user_id is distinct from s.pick_capitan2
  order by coalesce(pr.mmr, 0) desc, ps.created_at asc
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
  where sala_id = p_sala
    and equipo is not null
    and user_id is distinct from s.pick_capitan1
    and user_id is distinct from s.pick_capitan2;

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
        pick_turno_expira_at = now() + interval '45 seconds'
    where id = p_sala;
  end if;
end;
$$;

revoke all on function public.auto_pickear_si_vencido(uuid, boolean) from public;
revoke all on function public.auto_pickear_si_vencido(uuid, boolean) from anon;
grant execute on function public.auto_pickear_si_vencido(uuid, boolean) to authenticated;
