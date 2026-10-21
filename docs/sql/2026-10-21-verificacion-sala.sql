-- Verificación de sala "Estoy listo" + sonidos (21/10/2026)
--
-- 1) Columnas de estado de la verificación
-- 2) Nuevos tipos de notificación (verificacion_sala / verificacion_completa)
-- 3) RPCs: admin_pedir_verificacion, confirmar_verificacion, admin_cancelar_verificacion
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

-- 1) Columnas ---------------------------------------------------------------
alter table public.salas add column if not exists verificacion_estado text not null default 'inactiva';
alter table public.salas add column if not exists verificacion_iniciada_at timestamptz;
alter table public.salas add column if not exists verificacion_expira_at timestamptz;
alter table public.participantes_sala add column if not exists verificado_at timestamptz;

alter table public.salas drop constraint if exists salas_verificacion_estado_check;
alter table public.salas add constraint salas_verificacion_estado_check
  check (verificacion_estado in ('inactiva', 'pendiente', 'completa')) not valid;

create index if not exists participantes_sala_verificado_idx
  on public.participantes_sala (sala_id, verificado_at);

-- 2) Tipos de notificación --------------------------------------------------
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check
  check (
    tipo in (
      'recarga_aprobada',
      'recarga_rechazada',
      'retiro_pagado',
      'retiro_rechazado',
      'partida_iniciada',
      'expulsado_sala',
      'multa',
      'verificacion_sala',
      'verificacion_completa',
      'partida_finalizada'
    )
  ) not valid;

-- 3) RPCs -------------------------------------------------------------------
-- El admin pide la verificación: reinicia el check-in y avisa a todos.
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

  insert into public.notificaciones (user_id, tipo, mensaje)
  select ps.user_id,
         'verificacion_sala',
         'El administrador pide confirmar que estás listo. Entra a la sala y pulsa "Estoy listo".'
  from public.participantes_sala ps
  where ps.sala_id = p_sala;

  return v_socios;
end;
$$;

revoke all on function public.admin_pedir_verificacion(uuid) from public;
revoke all on function public.admin_pedir_verificacion(uuid) from anon;
grant execute on function public.admin_pedir_verificacion(uuid) to authenticated;

-- El jugador confirma que está listo. Devuelve cuántos hay listos.
create or replace function public.confirmar_verificacion(p_sala uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_estado text;
  v_expira timestamptz;
  v_creado_por uuid;
  v_nombre text;
  v_socios int;
  v_listos int;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select s.verificacion_estado, s.verificacion_expira_at, s.creado_por, s.nombre
    into v_estado, v_expira, v_creado_por, v_nombre
  from public.salas s
  where s.id = p_sala;

  if v_estado is null then
    raise exception 'La sala no existe';
  end if;

  -- Ya estaba completa: respuesta idempotente.
  if v_estado = 'completa' then
    select count(*) into v_listos
    from public.participantes_sala
    where sala_id = p_sala and verificado_at is not null;
    return v_listos;
  end if;

  if v_estado <> 'pendiente' then
    raise exception 'No hay una verificación pendiente';
  end if;

  if v_expira is not null and v_expira < now() then
    update public.salas
    set verificacion_estado = 'inactiva', verificacion_expira_at = null
    where id = p_sala and verificacion_estado = 'pendiente';
    raise exception 'La verificación expiró. Pide una nueva.';
  end if;

  if not exists (
    select 1 from public.participantes_sala where sala_id = p_sala and user_id = v_uid
  ) then
    raise exception 'No perteneces a esta sala';
  end if;

  -- Permite escribir `verificado_at` aunque la sala esté en fase de picks.
  perform set_config('app.picks_operacion', 'on', true);

  update public.participantes_sala
  set verificado_at = now()
  where sala_id = p_sala and user_id = v_uid and verificado_at is null;

  select count(*) into v_socios
  from public.participantes_sala
  where sala_id = p_sala;

  select count(*) into v_listos
  from public.participantes_sala
  where sala_id = p_sala and verificado_at is not null;

  if v_listos >= v_socios then
    update public.salas
    set verificacion_estado = 'completa', verificacion_expira_at = null
    where id = p_sala and verificacion_estado = 'pendiente';

    if v_creado_por is not null then
      insert into public.notificaciones (user_id, tipo, mensaje)
      values (
        v_creado_por,
        'verificacion_completa',
        'Todos los jugadores de la sala "' || v_nombre || '" confirmaron que están listos.'
      );
    end if;
  end if;

  return v_listos;
end;
$$;

revoke all on function public.confirmar_verificacion(uuid) from public;
revoke all on function public.confirmar_verificacion(uuid) from anon;
grant execute on function public.confirmar_verificacion(uuid) to authenticated;

-- El admin cancela la verificación en curso.
create or replace function public.admin_cancelar_verificacion(p_sala uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo administradores';
  end if;

  -- Permite limpiar las marcas aunque la sala esté en fase de picks.
  perform set_config('app.picks_operacion', 'on', true);

  update public.participantes_sala
  set verificado_at = null
  where sala_id = p_sala;

  update public.salas
  set verificacion_estado = 'inactiva',
      verificacion_iniciada_at = null,
      verificacion_expira_at = null
  where id = p_sala;
end;
$$;

revoke all on function public.admin_cancelar_verificacion(uuid) from public;
revoke all on function public.admin_cancelar_verificacion(uuid) from anon;
grant execute on function public.admin_cancelar_verificacion(uuid) to authenticated;
