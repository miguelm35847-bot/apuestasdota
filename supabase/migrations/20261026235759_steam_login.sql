-- Identidades y pruebas efímeras de Steam. Solo el servidor verificado puede
-- ejecutar estas RPCs: ninguna es una API de autenticación para el navegador.
begin;
create schema if not exists steam_auth;
revoke all on schema steam_auth from public, anon, authenticated, service_role;

create table steam_auth.intentos (
  id uuid primary key,
  state_hash text not null check (state_hash ~ '^[a-f0-9]{64}$'),
  challenge text not null check (challenge ~ '^[A-Za-z0-9_-]{43}$'),
  proposito text not null check (proposito in ('login', 'vincular')),
  usuario uuid references public.profiles(id) on delete cascade,
  origen text not null,
  siguiente text,
  remoto_hash text not null check (remoto_hash ~ '^[a-f0-9]{64}$'),
  estado text not null default 'iniciado' check (estado in ('iniciado','verificado','listo','usado')),
  nonce_hash text unique,
  entrega_hash text,
  steam_id text check (steam_id ~ '^[0-9]{17}$'),
  creado timestamptz not null default clock_timestamp(),
  vence timestamptz not null default clock_timestamp() + interval '10 minutes',
  check ((proposito = 'login' and usuario is null) or (proposito = 'vincular' and usuario is not null))
);
create index steam_intentos_caducidad on steam_auth.intentos(vence);
create index steam_intentos_frecuencia on steam_auth.intentos(remoto_hash, creado desc);

-- Reserva un UUID antes del alta en Auth. Dos ingresos concurrentes con el
-- mismo Steam convergen al mismo UUID, incluso si uno interrumpe el alta.
create table steam_auth.cuentas (
  steam_id text primary key check (steam_id ~ '^[0-9]{17}$'),
  usuario uuid not null unique,
  perfil uuid unique references public.profiles(id) on delete cascade,
  check (perfil is null or perfil = usuario)
);
alter table steam_auth.intentos enable row level security;
alter table steam_auth.cuentas enable row level security;
revoke all on all tables in schema steam_auth from public, anon, authenticated, service_role;

create function public.steam_auth_iniciar(p_id uuid, p_state_hash text, p_challenge text,
  p_proposito text, p_usuario uuid, p_origen text, p_siguiente text, p_remoto_hash text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_proposito not in ('login','vincular') or p_origen is null or length(p_origen) > 200
     or (p_siguiente is not null and (left(p_siguiente,1) <> '/' or left(p_siguiente,2) = '//' or length(p_siguiente) > 1024)) then
    raise exception 'Intento de Steam inválido';
  end if;
  if p_proposito = 'vincular' and not exists (
    select 1 from public.profiles where id = p_usuario and not baneado
  ) then raise exception 'Cuenta no disponible'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('steam-ip:' || p_remoto_hash, 0));
  if (select count(*) from steam_auth.intentos where remoto_hash = p_remoto_hash
      and creado > clock_timestamp() - interval '10 minutes') >= 10 then
    raise exception 'Demasiados intentos de Steam';
  end if;
  delete from steam_auth.intentos where id in (
    select id from steam_auth.intentos where vence < clock_timestamp() - interval '1 day' limit 200
  );
  insert into steam_auth.intentos(id,state_hash,challenge,proposito,usuario,origen,siguiente,remoto_hash)
    values(p_id,p_state_hash,p_challenge,p_proposito,p_usuario,p_origen,p_siguiente,p_remoto_hash);
end $$;

create function public.steam_auth_tomar(p_id uuid, p_state_hash text, p_origen text, p_nonce_hash text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_nonce_hash is null or p_nonce_hash !~ '^[a-f0-9]{64}$' then raise exception 'Prueba inválida'; end if;
  update steam_auth.intentos set estado = 'verificado', nonce_hash = p_nonce_hash
    where id = p_id and state_hash = p_state_hash and origen = p_origen
      and estado = 'iniciado' and vence > clock_timestamp();
  if not found then raise exception 'El intento de Steam venció o ya fue utilizado'; end if;
end $$;

create function public.steam_auth_preparar(p_id uuid, p_state_hash text, p_steam text, p_entrega_hash text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_entrega_hash is null or p_entrega_hash !~ '^[a-f0-9]{64}$' or p_steam is null or p_steam !~ '^[0-9]{17}$' then
    raise exception 'Prueba inválida';
  end if;
  update steam_auth.intentos set estado = 'listo', steam_id = p_steam,
      entrega_hash = p_entrega_hash, vence = least(vence,clock_timestamp() + interval '2 minutes')
    where id = p_id and state_hash = p_state_hash and estado = 'verificado' and vence > clock_timestamp();
  if not found then raise exception 'El intento de Steam venció o ya fue utilizado'; end if;
end $$;

create function public.steam_auth_consumir(p_id uuid, p_entrega_hash text, p_challenge text, p_usuario uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare i steam_auth.intentos%rowtype;
begin
  select * into i from steam_auth.intentos where id = p_id and entrega_hash = p_entrega_hash
    and challenge = p_challenge and estado = 'listo' and vence > clock_timestamp() for update;
  if not found then raise exception 'El intento de Steam venció o no es válido'; end if;
  if i.proposito = 'vincular' and (p_usuario is distinct from i.usuario or not exists (
    select 1 from public.profiles where id = i.usuario and not baneado
  )) then raise exception 'La sesión cambió o la cuenta no está disponible'; end if;
  update steam_auth.intentos set estado = 'usado', steam_id = null, entrega_hash = null where id = i.id;
  return jsonb_build_object('proposito',i.proposito,'usuario',i.usuario,'steam',i.steam_id,'siguiente',i.siguiente);
end $$;

create function public.steam_cuenta_reservar(p_steam text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if p_steam is null or p_steam !~ '^[0-9]{17}$' then raise exception 'Identidad inválida'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('steam:' || p_steam,0));
  select id into u from public.profiles where steam_id = p_steam;
  if found then return u; end if;
  insert into steam_auth.cuentas(steam_id,usuario) values(p_steam,gen_random_uuid()) on conflict(steam_id) do nothing;
  return (select usuario from steam_auth.cuentas where steam_id = p_steam);
end $$;

create function public.steam_cuenta_vincular(p_steam text, p_usuario uuid, p_avatar text, p_nombre text)
returns void language plpgsql security definer set search_path = '' as $$
declare anterior text; actual text; propietario uuid; reserva uuid; k bigint;
begin
  if p_steam is null or p_steam !~ '^[0-9]{17}$' then raise exception 'Identidad inválida'; end if;
  select steam_id into anterior from public.profiles where id = p_usuario;
  for k in select distinct valor from (values
    (pg_catalog.hashtextextended('steam:' || p_steam,0)),
    (pg_catalog.hashtextextended('steam:' || coalesce(anterior,p_steam),0))
  ) as claves(valor) order by valor loop perform pg_catalog.pg_advisory_xact_lock(k); end loop;
  select steam_id into actual from public.profiles where id = p_usuario and not baneado for update;
  if not found then raise exception 'Cuenta no disponible'; end if;
  if actual is distinct from anterior then raise exception 'La vinculación cambió. Vuelve a intentarlo'; end if;
  select id into propietario from public.profiles where steam_id = p_steam;
  select usuario into reserva from steam_auth.cuentas where steam_id = p_steam;
  if (propietario is not null and propietario <> p_usuario) or (reserva is not null and reserva <> p_usuario) then
    raise exception 'Este Steam ya pertenece a otra cuenta';
  end if;
  delete from steam_auth.cuentas where usuario = p_usuario and steam_id <> p_steam;
  update public.profiles set steam_id = p_steam,
      steam_avatar_url = case when actual = p_steam then coalesce(p_avatar,steam_avatar_url) else p_avatar end,
      steam_nombre = case when actual = p_steam then coalesce(p_nombre,steam_nombre) else p_nombre end
    where id = p_usuario;
  insert into steam_auth.cuentas(steam_id,usuario,perfil) values(p_steam,p_usuario,p_usuario)
    on conflict(steam_id) do update set perfil = excluded.perfil;
end $$;

revoke all on function public.steam_auth_iniciar(uuid,text,text,text,uuid,text,text,text),
  public.steam_auth_tomar(uuid,text,text,text), public.steam_auth_preparar(uuid,text,text,text),
  public.steam_auth_consumir(uuid,text,text,uuid), public.steam_cuenta_reservar(text),
  public.steam_cuenta_vincular(text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.steam_auth_iniciar(uuid,text,text,text,uuid,text,text,text),
  public.steam_auth_tomar(uuid,text,text,text), public.steam_auth_preparar(uuid,text,text,text),
  public.steam_auth_consumir(uuid,text,text,uuid), public.steam_cuenta_reservar(text),
  public.steam_cuenta_vincular(text,uuid,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
