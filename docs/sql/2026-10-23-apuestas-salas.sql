-- Apuestas entre usuarios. Aplicar completo en el SQL Editor de Supabase.
-- Sin cobro al publicar: los dos aportes se cobran juntos al aceptar.
-- Montos fijos en céntimos: 550 + 550 = 1000 de premio + 100 para la casa.
begin;

create table if not exists public.apuestas_sala (
  id uuid primary key,
  sala_id uuid not null references public.salas(id),
  creador_id uuid not null references public.profiles(id),
  equipo_creador integer not null check (equipo_creador in (1, 2)),
  aceptante_id uuid references public.profiles(id),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aceptada', 'cancelada', 'expirada', 'liquidada', 'reembolsada')),
  ganador_id uuid references public.profiles(id),
  comision integer not null default 0,
  creado_en timestamptz not null default now(),
  aceptado_en timestamptz,
  resuelto_en timestamptz,
  check (aceptante_id is null or aceptante_id <> creador_id),
  check ((estado in ('pendiente', 'cancelada', 'expirada') and aceptante_id is null)
      or (estado in ('aceptada', 'liquidada', 'reembolsada') and aceptante_id is not null)),
  check ((estado = 'liquidada' and ganador_id is not null and ganador_id in (creador_id, aceptante_id) and comision = 100)
      or (estado <> 'liquidada' and ganador_id is null and comision = 0))
);
create index if not exists apuestas_sala_listado on public.apuestas_sala(sala_id, creado_en desc);
create unique index if not exists apuestas_una_oferta_pendiente
  on public.apuestas_sala(sala_id, creador_id) where estado = 'pendiente';

alter table public.apuestas_sala enable row level security;
drop policy if exists apuestas_lectura on public.apuestas_sala;
create policy apuestas_lectura on public.apuestas_sala for select to authenticated
  using (estado = 'pendiente' or creador_id = auth.uid() or aceptante_id = auth.uid() or public.es_admin());
revoke all on public.apuestas_sala from anon, authenticated;
grant select on public.apuestas_sala to authenticated;

alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (
  tipo in ('recarga_aprobada', 'recarga_rechazada', 'retiro_pagado', 'retiro_rechazado',
    'partida_iniciada', 'expulsado_sala', 'multa', 'verificacion_sala', 'verificacion_completa',
    'partida_finalizada', 'donacion_recibida', 'apuesta_aceptada', 'apuesta_resultado')
) not valid;

alter table public.movimientos_billetera drop constraint if exists movimientos_billetera_tipo_check;
alter table public.movimientos_billetera add constraint movimientos_billetera_tipo_check check (
  tipo in ('recarga', 'retiro', 'entrada_sala', 'reembolso', 'premio', 'ajuste_admin',
    'donacion_enviada', 'donacion_recibida', 'apuesta_aporte', 'apuesta_premio', 'apuesta_reembolso')
) not valid;
alter table public.movimientos_billetera drop constraint if exists signo_correcto;
alter table public.movimientos_billetera add constraint signo_correcto check (
  (tipo in ('recarga', 'premio', 'reembolso', 'donacion_recibida', 'apuesta_premio', 'apuesta_reembolso') and monto > 0)
  or (tipo in ('entrada_sala', 'retiro', 'donacion_enviada', 'apuesta_aporte') and monto < 0)
  or tipo = 'ajuste_admin'
) not valid;

-- Todas las salidas de la billetera comparten el mismo bloqueo de perfil,
-- incluidas donaciones, retiros y cuotas existentes. Evita gastar un mismo
-- saldo a la vez en una apuesta y en otra operación. Los créditos no se bloquean.
create or replace function public.validar_debito_billetera()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.monto < 0 then
    perform 1 from public.profiles where id = new.user_id for update;
    if public._saldo_de(new.user_id)::bigint + new.monto::bigint < 0 then
      raise exception 'Saldo insuficiente para realizar la operación';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists validar_debito_billetera_trg on public.movimientos_billetera;
create trigger validar_debito_billetera_trg before insert on public.movimientos_billetera
  for each row execute function public.validar_debito_billetera();
revoke all on function public.validar_debito_billetera() from public, anon, authenticated;

create or replace function public.crear_apuesta_sala(p_sala uuid, p_equipo integer, p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_estado text;
  v_anterior public.apuestas_sala%rowtype;
begin
  if v_user is null then raise exception 'Debes iniciar sesión'; end if;
  if p_id is null or p_sala is null or p_equipo is null or p_equipo not in (1, 2) then
    raise exception 'Selecciona Radiant o Dire';
  end if;
  select estado into v_estado from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  select * into v_anterior from public.apuestas_sala where id = p_id;
  if found then
    if v_anterior.creador_id = v_user and v_anterior.sala_id = p_sala and v_anterior.equipo_creador = p_equipo then
      return p_id; -- reintento de la misma petición, sin duplicar ofertas
    end if;
    raise exception 'Identificador de apuesta inválido';
  end if;
  if v_estado <> 'en_juego' or exists (select 1 from public.partidas where sala_id = p_sala) then
    raise exception 'Las apuestas solo están disponibles durante la partida';
  end if;
  perform 1 from public.profiles where id = v_user and not coalesce(baneado, false) for update;
  if not found then raise exception 'Tu cuenta no puede apostar'; end if;
  if public._saldo_de(v_user) < 550 then raise exception 'Necesitas S/ 5.50 de saldo'; end if;
  if exists (select 1 from public.apuestas_sala where sala_id = p_sala and creador_id = v_user and estado = 'pendiente') then
    raise exception 'Ya tienes una oferta pendiente en esta sala';
  end if;
  insert into public.apuestas_sala(id, sala_id, creador_id, equipo_creador)
    values (p_id, p_sala, v_user, p_equipo);
  return p_id;
end;
$$;

create or replace function public.aceptar_apuesta_sala(p_apuesta uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_sala uuid;
  v_estado text;
  a public.apuestas_sala%rowtype;
begin
  if v_user is null then raise exception 'Debes iniciar sesión'; end if;
  select sala_id into v_sala from public.apuestas_sala where id = p_apuesta;
  if not found then raise exception 'La apuesta no existe'; end if;
  -- Mismo orden en creación, aceptación, cancelación y cierre: sala → apuesta → perfiles.
  select estado into v_estado from public.salas where id = v_sala for update;
  select * into a from public.apuestas_sala where id = p_apuesta for update;
  if a.aceptante_id = v_user and a.estado in ('aceptada', 'liquidada', 'reembolsada') then return; end if;
  if a.creador_id = v_user then raise exception 'No puedes aceptar tu propia apuesta'; end if;
  if v_estado <> 'en_juego' or exists (select 1 from public.partidas where sala_id = v_sala) then
    raise exception 'La partida ya no admite apuestas';
  end if;
  if a.estado <> 'pendiente' then raise exception 'Esta oferta ya no está disponible'; end if;
  -- Orden estable para aceptar simultáneamente apuestas cruzadas en distintas salas.
  perform id from public.profiles where id in (a.creador_id, v_user) order by id for update;
  if not exists (select 1 from public.profiles where id = v_user and not coalesce(baneado, false))
     or exists (select 1 from public.profiles where id = a.creador_id and baneado) then
    raise exception 'Una de las cuentas no puede apostar';
  end if;
  if public._saldo_de(v_user) < 550 then raise exception 'Necesitas S/ 5.50 de saldo'; end if;
  if public._saldo_de(a.creador_id) < 550 then raise exception 'El creador ya no tiene saldo suficiente'; end if;
  insert into public.movimientos_billetera(user_id, tipo, monto, referencia_id, descripcion, creado_por) values
    (a.creador_id, 'apuesta_aporte', -550, a.id, 'Apuesta: ' || case when a.equipo_creador = 1 then 'Radiant' else 'Dire' end, v_user),
    (v_user, 'apuesta_aporte', -550, a.id, 'Apuesta: ' || case when a.equipo_creador = 1 then 'Dire' else 'Radiant' end, v_user);
  update public.apuestas_sala set aceptante_id = v_user, estado = 'aceptada', aceptado_en = now() where id = a.id;
  insert into public.notificaciones(user_id, tipo, mensaje)
    select id, 'apuesta_aceptada', 'Apuesta confirmada en "' || (select nombre from public.salas where id = v_sala) || '": aportaste S/ 5.50 a ' ||
      case when (id = a.creador_id and a.equipo_creador = 1) or (id = v_user and a.equipo_creador = 2) then 'Radiant' else 'Dire' end || '. Premio total: S/ 10.00.'
    from public.profiles where id in (a.creador_id, v_user);
end;
$$;

create or replace function public.cancelar_apuesta_sala(p_apuesta uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_sala uuid;
  a public.apuestas_sala%rowtype;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select sala_id into v_sala from public.apuestas_sala where id = p_apuesta;
  if not found then raise exception 'La apuesta no existe'; end if;
  perform 1 from public.salas where id = v_sala for update;
  select * into a from public.apuestas_sala where id = p_apuesta for update;
  if a.creador_id <> auth.uid() then raise exception 'Solo puedes cancelar tus propias ofertas'; end if;
  if a.estado = 'cancelada' then return; end if;
  if a.estado <> 'pendiente' then raise exception 'Solo puedes cancelar ofertas sin aceptar'; end if;
  update public.apuestas_sala set estado = 'cancelada', resuelto_en = now() where id = a.id;
end;
$$;

-- Función interna: solo los triggers del resultado/cancelación pueden resolver.
create or replace function public.resolver_apuestas_sala(p_sala uuid, p_equipo integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.apuestas_sala%rowtype;
  v_ganador uuid;
begin
  if p_equipo is not null and p_equipo not in (1, 2) then raise exception 'Resultado inválido'; end if;
  perform 1 from public.salas where id = p_sala for update;
  for a in select * from public.apuestas_sala
    where sala_id = p_sala and estado in ('pendiente', 'aceptada') order by id for update
  loop
    if a.estado = 'pendiente' then
      update public.apuestas_sala set estado = 'expirada', resuelto_en = now() where id = a.id;
    elsif p_equipo is null then
      insert into public.movimientos_billetera(user_id, tipo, monto, referencia_id, descripcion, creado_por) values
        (a.creador_id, 'apuesta_reembolso', 550, a.id, 'Apuesta reembolsada: sala cancelada', auth.uid()),
        (a.aceptante_id, 'apuesta_reembolso', 550, a.id, 'Apuesta reembolsada: sala cancelada', auth.uid());
      update public.apuestas_sala set estado = 'reembolsada', resuelto_en = now() where id = a.id;
    else
      v_ganador := case when a.equipo_creador = p_equipo then a.creador_id else a.aceptante_id end;
      insert into public.movimientos_billetera(user_id, tipo, monto, referencia_id, descripcion, creado_por)
        values (v_ganador, 'apuesta_premio', 1000, a.id, 'Premio de apuesta: ' || case when p_equipo = 1 then 'Radiant' else 'Dire' end, auth.uid());
      update public.apuestas_sala set estado = 'liquidada', ganador_id = v_ganador, comision = 100, resuelto_en = now() where id = a.id;
    end if;
    if a.estado = 'aceptada' then
      insert into public.notificaciones(user_id, tipo, mensaje)
        select id, 'apuesta_resultado', 'Apuesta en "' || (select nombre from public.salas where id = p_sala) || '": ' ||
          case when p_equipo is null then 'sala cancelada, recibiste S/ 5.50 de reembolso.'
            when id = v_ganador then 'ganaste, recibiste S/ 10.00.' else 'perdiste tu aporte de S/ 5.50.' end
        from public.profiles where id in (a.creador_id, a.aceptante_id);
    end if;
  end loop;
end;
$$;
revoke all on function public.resolver_apuestas_sala(uuid, integer) from public, anon, authenticated, service_role;

create or replace function public.apuestas_resultado_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.resolver_apuestas_sala(new.sala_id, new.equipo_ganador);
  return new;
end;
$$;
drop trigger if exists apuestas_resultado on public.partidas;
create trigger apuestas_resultado after insert on public.partidas
  for each row execute function public.apuestas_resultado_trg();

create or replace function public.apuestas_estado_sala_trg()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_equipo integer;
begin
  if new.estado = 'cancelada' and old.estado is distinct from 'cancelada' then
    perform public.resolver_apuestas_sala(new.id, null);
  elsif new.estado = 'terminada' and old.estado is distinct from 'terminada' then
    select equipo_ganador into v_equipo from public.partidas where sala_id = new.id;
    if found then
      perform public.resolver_apuestas_sala(new.id, v_equipo);
    else
      -- Algunos cierres actualizan la sala antes de insertar el resultado.
      -- Las aceptadas se pagan con el trigger de partidas, en esa transacción.
      update public.apuestas_sala set estado = 'expirada', resuelto_en = now()
        where sala_id = new.id and estado = 'pendiente';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists apuestas_estado_sala on public.salas;
create trigger apuestas_estado_sala after update of estado on public.salas
  for each row execute function public.apuestas_estado_sala_trg();

-- Un resultado pagado no puede cambiar sin un proceso explícito de reversión.
create or replace function public.proteger_resultado_apostado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.apuestas_sala where sala_id = old.sala_id and estado = 'liquidada') then
    if tg_op = 'DELETE' then raise exception 'No se puede borrar un resultado con apuestas pagadas'; end if;
    if new.equipo_ganador is distinct from old.equipo_ganador or new.sala_id is distinct from old.sala_id then
      raise exception 'No se puede cambiar un resultado con apuestas pagadas';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists proteger_resultado_apostado_trg on public.partidas;
create trigger proteger_resultado_apostado_trg before update or delete on public.partidas
  for each row execute function public.proteger_resultado_apostado();

create or replace function public.ganancias_apuestas_casa()
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;
  return (select coalesce(sum(comision), 0) from public.apuestas_sala where estado = 'liquidada');
end;
$$;

revoke all on function public.crear_apuesta_sala(uuid, integer, uuid) from public, anon;
revoke all on function public.aceptar_apuesta_sala(uuid) from public, anon;
revoke all on function public.cancelar_apuesta_sala(uuid) from public, anon;
revoke all on function public.ganancias_apuestas_casa() from public, anon;
revoke all on function public.apuestas_resultado_trg() from public, anon, authenticated;
revoke all on function public.apuestas_estado_sala_trg() from public, anon, authenticated;
revoke all on function public.proteger_resultado_apostado() from public, anon, authenticated;
grant execute on function public.crear_apuesta_sala(uuid, integer, uuid) to authenticated;
grant execute on function public.aceptar_apuesta_sala(uuid) to authenticated;
grant execute on function public.cancelar_apuesta_sala(uuid) to authenticated;
grant execute on function public.ganancias_apuestas_casa() to authenticated;

-- Conserva qa:cleanup: elimina primero las apuestas de los actores/salas QA,
-- antes de borrar resultados protegidos y perfiles referenciados.
create or replace function public.qa_cleanup()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
  v_salas uuid[];
  v_perfiles int;
  v_salas_n int;
  v_auth int;
begin
  select coalesce(array_agg(id), '{}') into v_ids from public.profiles where nick like 'qa-%';
  select coalesce(array_agg(id), '{}') into v_salas from public.salas
    where nombre like 'QA %' or creado_por = any(v_ids);
  v_salas_n := coalesce(array_length(v_salas, 1), 0);

  delete from public.apuestas_sala where sala_id = any(v_salas)
    or creador_id = any(v_ids) or aceptante_id = any(v_ids);
  alter table public.movimientos_billetera disable trigger user;
  delete from public.movimientos_billetera where user_id = any(v_ids) or creado_por = any(v_ids);
  alter table public.movimientos_billetera enable trigger user;
  delete from public.notificaciones where user_id = any(v_ids);
  delete from public.recargas where user_id = any(v_ids);
  delete from public.retiros where user_id = any(v_ids);
  delete from public.mensajes_chat where user_id = any(v_ids) or sala_id = any(v_salas);
  update public.salas set picks_estado = 'inactivo'
    where id = any(v_salas) and picks_estado = 'en_curso';
  alter table public.participantes_sala disable trigger user;
  delete from public.participantes_sala where user_id = any(v_ids) or sala_id = any(v_salas);
  alter table public.participantes_sala enable trigger user;
  delete from public.lobbies where sala_id = any(v_salas);
  delete from public.partidas where sala_id = any(v_salas);
  delete from public.salas where id = any(v_salas);
  delete from public.profiles where id = any(v_ids);
  get diagnostics v_perfiles = row_count;
  delete from auth.users where id = any(v_ids);
  get diagnostics v_auth = row_count;
  return jsonb_build_object('perfiles', v_perfiles, 'salas', v_salas_n, 'auth', v_auth);
end;
$$;
revoke all on function public.qa_cleanup() from public, anon, authenticated;
grant execute on function public.qa_cleanup() to service_role;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'apuestas_sala') then
    alter publication supabase_realtime add table public.apuestas_sala;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
