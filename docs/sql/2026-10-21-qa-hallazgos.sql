-- Hallazgos del QA de datos (21/10/2026)
--
-- Aplicar en el SQL Editor de Supabase antes de volver a correr
-- `npm run qa:probes` y `npm run qa:flows`.
--
-- 1) Picks 5v5: el rival que se pasaba a capitan_de_pick dependía del turno
--    actual. A partir del tercer pick el orden dejaba de ser serpiente y
--    terminaba 3/7 o 7/3. Se usa siempre el rival del primer pick.
-- 2) Privacidad: authenticated podía leer profiles.steam_id de cualquier
--    jugador por REST. Se revoca la lectura de la tabla y se conceden solo
--    las columnas públicas; el propio SteamID lo devuelve /api/perfil/steam.

-- 1) Pick manual
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
    -- El rival del primer pick es fijo; no el rival del turno actual.
    v_otro := case
      when s.pick_primer_user_id = s.pick_capitan1 then s.pick_capitan2
      else s.pick_capitan1
    end;
    v_siguiente := public.capitan_de_pick(s.pick_primer_user_id, v_otro, v_hechos + 1);
    update public.salas
    set pick_turno_user_id = v_siguiente,
        pick_turno_expira_at = now() + interval '60 seconds'
    where id = p_sala;
  end if;
end;
$function$;

-- 2) Auto-pick
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
    -- Igual que en pickear_jugador: p_otro es el rival del primer pick.
    v_otro := case
      when s.pick_primer_user_id = s.pick_capitan1 then s.pick_capitan2
      else s.pick_capitan1
    end;
    v_siguiente := public.capitan_de_pick(s.pick_primer_user_id, v_otro, v_hechos + 1);
    update public.salas
    set pick_turno_user_id = v_siguiente,
        pick_turno_expira_at = now() + interval '60 seconds'
    where id = p_sala;
  end if;
end;
$function$;

-- 3) profiles: authenticated conserva las columnas públicas, no steam_id.
revoke select on public.profiles from authenticated;
grant select (id, nick, rol, baneado, created_at, steam_avatar_url, steam_nombre, mmr, roles_preferidos)
  on public.profiles to authenticated;

-- 4) Limpieza del QA. service_role no tiene DELETE/UPDATE en las tablas
--    sensibles, así que la limpieza se hace en una función security definer.
create or replace function public.qa_cleanup()
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_ids uuid[];
  v_salas uuid[];
  v_perfiles int;
  v_salas_n int;
  v_auth int;
begin
  select coalesce(array_agg(id), '{}') into v_ids
  from public.profiles
  where nick like 'qa-%';

  select coalesce(array_agg(id), '{}') into v_salas
  from public.salas
  where nombre like 'QA %' or creado_por = any(v_ids);

  v_salas_n := coalesce(array_length(v_salas, 1), 0);

  delete from public.movimientos_billetera
  where user_id = any(v_ids) or creado_por = any(v_ids);

  delete from public.notificaciones where user_id = any(v_ids);
  delete from public.recargas where user_id = any(v_ids);
  delete from public.retiros where user_id = any(v_ids);
  delete from public.mensajes_chat where user_id = any(v_ids) or sala_id = any(v_salas);
  delete from public.participantes_sala where user_id = any(v_ids) or sala_id = any(v_salas);
  delete from public.lobbies where sala_id = any(v_salas);
  delete from public.partidas where sala_id = any(v_salas);
  delete from public.salas where id = any(v_salas);

  delete from public.profiles where id = any(v_ids);
  get diagnostics v_perfiles = row_count;
  delete from auth.users where id = any(v_ids);
  get diagnostics v_auth = row_count;

  return jsonb_build_object('perfiles', v_perfiles, 'salas', v_salas_n, 'auth', v_auth);
end;
$function$;

revoke all on function public.qa_cleanup() from public;
revoke all on function public.qa_cleanup() from anon;
revoke all on function public.qa_cleanup() from authenticated;
grant execute on function public.qa_cleanup() to service_role;

notify pgrst, 'reload schema';
