-- Verificación automática al llenarse la sala + moneda 1v1 después del "listo" (21/10/2026)
--
-- 1) Cuando la sala se llena, el servidor pide solo la verificación
--    "Estoy listo" (sin que el admin tenga que pedirla). El admin puede volver
--    a pedirla con la RPC `admin_pedir_verificacion`.
-- 2) En 1v1 la moneda ya no se lanza al llenarse la sala: espera a que los dos
--    confirmen "Estoy listo" y entonces sortea el lado.
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

-- 1) Sorteo 1v1 reutilizable -----------------------------------------------
create or replace function public.sortear_1v1(p_sala uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.salas%rowtype;
  v_total int;
  v_ids uuid[];
  v_ganador uuid;
begin
  select * into s from public.salas where id = p_sala for update;
  if not found then return; end if;
  if s.cupo <> 2 then return; end if;
  if s.estado not in ('abierta', 'llena') then return; end if;
  if s.picks_estado <> 'inactivo' then return; end if;

  -- Si los equipos ya están asignados no se vuelve a sortear.
  if exists (
    select 1 from public.participantes_sala
    where sala_id = p_sala and equipo is not null
  ) then
    return;
  end if;

  -- La moneda espera a que ambos confirmen "Estoy listo".
  if s.verificacion_estado = 'pendiente' then return; end if;

  select count(*), array_agg(user_id order by created_at)
    into v_total, v_ids
  from public.participantes_sala
  where sala_id = p_sala;

  if v_total <> 2 then return; end if;

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
  where id = p_sala;
end;
$$;

revoke all on function public.sortear_1v1(uuid) from public;
revoke all on function public.sortear_1v1(uuid) from anon;
revoke all on function public.sortear_1v1(uuid) from authenticated;

-- 2) Trigger de participantes: entra o sale un jugador -----------------------
create or replace function public.iniciar_sorteo_1v1()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_sala_id uuid;
  s public.salas%rowtype;
  v_total int;
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

  select count(*) into v_total
  from public.participantes_sala
  where sala_id = v_sala_id;

  if v_total = 2 then
    -- No sorts while the verification is pending: the coin waits for "I'm ready".
    perform public.sortear_1v1(v_sala_id);
  elsif v_total < 2 then
    -- Si alguien sale antes de decidir, se limpia el sorteo para el próximo que entre
    if s.picks_estado <> 'inactivo' and s.estado <> 'en_juego' then
      perform set_config('app.picks_operacion', 'on', true);

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
$$;

drop trigger if exists sorteo_1v1_sync on public.participantes_sala;
create trigger sorteo_1v1_sync
  after insert or delete on public.participantes_sala
  for each row execute function public.iniciar_sorteo_1v1();

-- 3) Cuando la verificación se completa, la moneda 1v1 se lanza --------------
create or replace function public.sorteo_1v1_al_completar()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if new.verificacion_estado is distinct from 'completa' then return new; end if;
  if old.verificacion_estado is not distinct from 'completa' then return new; end if;

  perform public.sortear_1v1(new.id);
  return new;
end;
$$;

drop trigger if exists sorteo_1v1_al_completar on public.salas;
create trigger sorteo_1v1_al_completar
  after update on public.salas
  for each row execute function public.sorteo_1v1_al_completar();

-- 4) Verificación automática cuando la sala se llena -------------------------
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
  -- Si ya hay una verificación en curso (o se completó), no se reinicia sola.
  if v_verificacion <> 'inactiva' then return new; end if;

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

-- El nombre del trigger importa: Postgres ejecuta los triggers AFTER en orden
-- alfabético, así que este corre antes que `sorteo_1v1_sync` y la moneda 1v1
-- alcanza a ver la verificación pendiente.
drop trigger if exists iniciar_verificacion_llenada on public.participantes_sala;
create trigger iniciar_verificacion_llenada
  after insert on public.participantes_sala
  for each row execute function public.iniciar_verificacion_llenada();

-- 5) El admin puede volver a pedir la verificación --------------------------
-- (sin crear avisos en la campanita: el sonido y el aviso central llegan por
--  Realtime y el jugador confirma desde el modal o desde su sala).
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

  if v_socios < v_cupo then
    raise exception 'Faltan jugadores: hay % de %', v_socios, v_cupo;
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
