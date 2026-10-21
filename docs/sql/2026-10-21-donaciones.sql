-- Donaciones entre usuarios + panel público de actividades (21/10/2026)
--
-- 1) `actividades`: feed público (donaciones y multas) que lee el landing.
-- 2) `donaciones`: auditoría de cada donación (solo la ven donante y receptor).
-- 3) RPC `donar_saldo`: transfiere saldo entre dos usuarios de forma atómica.
-- 4) RPC `admin_aplicar_multa`: multa que además queda en el panel de actividades.
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

-- 1) Feed público de actividades ---------------------------------------------
create table if not exists public.actividades (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('donacion', 'multa')),
  emisor_id uuid references public.profiles(id) on delete set null,
  receptor_id uuid references public.profiles(id) on delete set null,
  monto integer not null check (monto > 0),
  descripcion text,
  creado_en timestamptz not null default now()
);

create index if not exists actividades_creado_idx
  on public.actividades (creado_en desc);

alter table public.actividades enable row level security;

drop policy if exists actividades_lectura_publica on public.actividades;
create policy actividades_lectura_publica
  on public.actividades for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.actividades from anon, authenticated;
grant select on public.actividades to anon, authenticated;

-- 2) Donaciones (auditoría) ---------------------------------------------------
create table if not exists public.donaciones (
  id uuid primary key default gen_random_uuid(),
  donante_id uuid not null references public.profiles(id) on delete cascade,
  receptor_id uuid not null references public.profiles(id) on delete cascade,
  monto integer not null check (monto > 0),
  mensaje text check (char_length(mensaje) <= 200),
  creado_en timestamptz not null default now(),
  constraint donaciones_distintos check (donante_id <> receptor_id)
);

create index if not exists donaciones_creado_idx
  on public.donaciones (creado_en desc);

alter table public.donaciones enable row level security;

drop policy if exists donaciones_lectura_propia on public.donaciones;
create policy donaciones_lectura_propia
  on public.donaciones for select
  to authenticated
  using (donante_id = auth.uid() or receptor_id = auth.uid());

revoke all on public.donaciones from anon;
revoke insert, update, delete on public.donaciones from anon, authenticated;
grant select on public.donaciones to authenticated;

-- 3) Tipo de notificación -----------------------------------------------------
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
      'partida_finalizada',
      'donacion_recibida'
    )
  ) not valid;

-- 4) Donar saldo --------------------------------------------------------------
create or replace function public.donar_saldo(
  p_receptor uuid,
  p_monto integer,
  p_mensaje text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_donante uuid := auth.uid();
  v_saldo integer;
  v_donacion uuid;
  v_mensaje text;
begin
  if v_donante is null then
    raise exception 'Debes iniciar sesión';
  end if;

  if p_receptor is null or p_monto is null then
    raise exception 'Datos incompletos';
  end if;

  if p_monto <= 0 then
    raise exception 'El monto debe ser mayor a S/ 0.00';
  end if;

  if p_receptor = v_donante then
    raise exception 'No puedes donarte saldo a ti mismo';
  end if;

  if not exists (select 1 from public.profiles where id = p_receptor) then
    raise exception 'El usuario no existe';
  end if;

  if exists (select 1 from public.profiles where id = p_receptor and baneado) then
    raise exception 'No puedes donar a una cuenta baneada';
  end if;

  if exists (select 1 from public.profiles where id = v_donante and baneado) then
    raise exception 'Tu cuenta está baneada';
  end if;

  v_mensaje := nullif(btrim(coalesce(p_mensaje, '')), '');

  -- Bloquea la fila del donante: dos donaciones simultáneas del mismo usuario
  -- no pueden gastar dos veces el mismo saldo.
  perform 1 from public.profiles where id = v_donante for update;

  v_saldo := public._saldo_de(v_donante);

  if v_saldo < p_monto then
    raise exception 'Saldo insuficiente: tienes % y quieres donar %',
      format('S/ %s', to_char(v_saldo / 100.0, 'FM990.00')),
      format('S/ %s', to_char(p_monto / 100.0, 'FM990.00'));
  end if;

  insert into public.donaciones (donante_id, receptor_id, monto, mensaje)
  values (v_donante, p_receptor, p_monto, v_mensaje)
  returning id into v_donacion;

  insert into public.movimientos_billetera
    (user_id, tipo, monto, referencia_id, descripcion, creado_por)
  values
    (v_donante, 'donacion_enviada', -p_monto, v_donacion, 'Donación enviada', v_donante);

  insert into public.movimientos_billetera
    (user_id, tipo, monto, referencia_id, descripcion, creado_por)
  values
    (p_receptor, 'donacion_recibida', p_monto, v_donacion, 'Donación recibida', v_donante);

  insert into public.actividades (tipo, emisor_id, receptor_id, monto, descripcion)
  values ('donacion', v_donante, p_receptor, p_monto, v_mensaje);

  insert into public.notificaciones (user_id, tipo, mensaje)
  values (
    p_receptor,
    'donacion_recibida',
    'Recibiste una donación de ' || format('S/ %s', to_char(p_monto / 100.0, 'FM990.00')) || '.'
  );

  return public._saldo_de(v_donante);
end;
$$;

revoke all on function public.donar_saldo(uuid, integer, text) from public;
revoke all on function public.donar_saldo(uuid, integer, text) from anon;
grant execute on function public.donar_saldo(uuid, integer, text) to authenticated;

-- 5) Multa con registro en el panel ------------------------------------------
create or replace function public.admin_aplicar_multa(
  p_user uuid,
  p_monto integer,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_motivo text;
begin
  if not public.es_admin() then
    raise exception 'Solo administradores';
  end if;

  if p_user is null or p_monto is null then
    raise exception 'Datos incompletos';
  end if;

  if p_monto <= 0 then
    raise exception 'El monto debe ser mayor a S/ 0.00';
  end if;

  if p_user = auth.uid() then
    raise exception 'No puedes multar tu propia cuenta';
  end if;

  v_motivo := btrim(coalesce(p_motivo, ''));

  if v_motivo = '' then
    raise exception 'Escribe el motivo de la multa';
  end if;

  -- El movimiento del saldo lo hace `ajuste_admin` (mismo control de saldo,
  -- tipo de movimiento y auditoría que usa el resto del sistema).
  perform public.ajuste_admin(p_user, -p_monto, 'Multa: ' || v_motivo);

  insert into public.actividades (tipo, emisor_id, receptor_id, monto, descripcion)
  values ('multa', auth.uid(), p_user, p_monto, v_motivo);

  insert into public.notificaciones (user_id, tipo, mensaje)
  values (
    p_user,
    'multa',
    'Se aplicó una multa de ' || format('S/ %s', to_char(p_monto / 100.0, 'FM990.00')) ||
      '. Motivo: ' || v_motivo
  );
end;
$$;

revoke all on function public.admin_aplicar_multa(uuid, integer, text) from public;
revoke all on function public.admin_aplicar_multa(uuid, integer, text) from anon;
grant execute on function public.admin_aplicar_multa(uuid, integer, text) to authenticated;

-- 6) Realtime del feed ---------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.actividades;
  exception when duplicate_object then null;
  end;
end $$;
