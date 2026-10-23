begin;
create table if not exists public.peticiones_dinero (
 user_id uuid not null references public.profiles(id), id uuid not null,
 operacion text not null, datos jsonb not null, resultado jsonb not null,
 primary key(user_id,id)
);
alter table public.peticiones_dinero enable row level security;
revoke all on public.peticiones_dinero from public,anon,authenticated;

create or replace function public.donar_saldo_seguro(p_receptor uuid,p_monto integer,p_mensaje text,p_peticion uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare anterior public.peticiones_dinero%rowtype; datos jsonb:=jsonb_build_array(p_receptor,p_monto,p_mensaje); saldo integer;
begin
 if auth.uid() is null or p_peticion is null then raise exception 'Debes iniciar sesión'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 select * into anterior from public.peticiones_dinero where user_id=auth.uid() and id=p_peticion;
 if found then
  if anterior.operacion<>'donar' or anterior.datos<>datos then raise exception 'Petición incompatible'; end if;
  return (anterior.resultado #>> '{}')::integer;
 end if;
 saldo:=public.donar_saldo(p_receptor,p_monto,p_mensaje);
 insert into public.peticiones_dinero values(auth.uid(),p_peticion,'donar',datos,to_jsonb(saldo));
 return saldo;
end $$;
create or replace function public.solicitar_retiro_seguro(p_monto bigint,p_destino text,p_peticion uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare anterior public.peticiones_dinero%rowtype; datos jsonb:=jsonb_build_array(p_monto,p_destino); retiro uuid;
begin
 if auth.uid() is null or p_peticion is null then raise exception 'Debes iniciar sesión'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 select * into anterior from public.peticiones_dinero where user_id=auth.uid() and id=p_peticion;
 if found then
  if anterior.operacion<>'retirar' or anterior.datos<>datos then raise exception 'Petición incompatible'; end if;
  return (anterior.resultado #>> '{}')::uuid;
 end if;
 retiro:=public.solicitar_retiro(p_monto,p_destino);
 insert into public.peticiones_dinero values(auth.uid(),p_peticion,'retirar',datos,to_jsonb(retiro));
 return retiro;
end $$;
revoke all on function public.donar_saldo_seguro(uuid,integer,text,uuid),public.solicitar_retiro_seguro(bigint,text,uuid) from public,anon;
grant execute on function public.donar_saldo_seguro(uuid,integer,text,uuid),public.solicitar_retiro_seguro(bigint,text,uuid) to authenticated;

create or replace function public.admin_saldos()
returns table(user_id uuid,saldo bigint) language plpgsql security definer set search_path=public as $$
begin
 if not public.es_admin() then raise exception 'Solo administradores'; end if;
 return query select m.user_id,coalesce(sum(m.monto),0)::bigint from public.movimientos_billetera m group by m.user_id;
end $$;
revoke all on function public.admin_saldos() from public,anon;
grant execute on function public.admin_saldos() to authenticated;

-- Verificación final del control global, bajo el mismo bloqueo que el pago.
do $$ declare def text; begin
 select pg_get_functiondef('public.cerrar_partida_auto(uuid,bigint,integer,integer,integer,integer)'::regprocedure) into def;
 if position('Cierre automático desactivado o partida no asociada' in def)=0 then
  def:=replace(def,'if exists (select 1 from public.partidas where sala_id = p_sala) then',
   'if not s.auto_cierre or s.dota_match_id_esperado is distinct from p_dota_match_id then raise exception ''Cierre automático desactivado o partida no asociada''; end if; if exists (select 1 from public.partidas where sala_id = p_sala) then');
  execute def;
 end if;
end $$;

-- Extensión del cleanup existente para los identificadores de prueba.
do $$ declare def text; begin
 select pg_get_functiondef('public.qa_cleanup()'::regprocedure) into def;
 if position('delete from public.peticiones_dinero' in def)=0 then
  def:=replace(def,'delete from public.apuestas_sala','delete from public.peticiones_dinero where user_id = any(v_ids); delete from public.apuestas_sala');
  execute def;
 end if;
end $$;
notify pgrst,'reload schema';
commit;
