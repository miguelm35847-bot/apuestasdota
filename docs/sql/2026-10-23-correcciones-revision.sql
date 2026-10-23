-- Revisión autorizada: ventana de 25 minutos, multa canónica y controles globales.
begin;
alter view public.perfiles_publicos set (security_invoker=true);
alter table public.salas add column if not exists auto_cierre boolean not null default true;
alter table public.salas add column if not exists dota_match_id_esperado bigint;

create or replace function public.validar_ventana_apuesta()
returns trigger language plpgsql security definer set search_path=public as $$
declare s public.salas%rowtype;
begin
 if (tg_op='INSERT' and new.estado='pendiente') or (tg_op='UPDATE' and new.estado='aceptada' and old.estado='pendiente') then
  select * into s from public.salas where id=new.sala_id for update;
  if s.estado<>'en_juego' or s.iniciada_at is null or clock_timestamp() >= s.iniciada_at + interval '25 minutes'
     or exists(select 1 from public.partidas where sala_id=s.id) then
   raise exception 'Apuestas cerradas: solo se admiten durante los primeros 25 minutos de la partida';
  end if;
  if exists(select 1 from public.participantes_sala where sala_id=s.id and user_id in (new.creador_id,new.aceptante_id)) then
   raise exception 'Los jugadores de esta partida no pueden apostar en su propia sala';
  end if;
 end if;
 return new;
end $$;
drop trigger if exists validar_ventana_apuesta_trg on public.apuestas_sala;
create trigger validar_ventana_apuesta_trg before insert or update on public.apuestas_sala for each row execute function public.validar_ventana_apuesta();
revoke all on function public.validar_ventana_apuesta() from public,anon,authenticated;

create or replace function public.admin_configurar_cierre(p_sala uuid,p_auto boolean,p_match bigint default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.es_admin() then raise exception 'Solo administradores'; end if;
 if p_match is not null and p_match<=0 then raise exception 'ID de partida inválido'; end if;
 update public.salas set auto_cierre=p_auto,dota_match_id_esperado=p_match where id=p_sala and estado='en_juego';
 if not found then raise exception 'La sala no está en juego'; end if;
end $$;
revoke all on function public.admin_configurar_cierre(uuid,boolean,bigint) from public,anon;
grant execute on function public.admin_configurar_cierre(uuid,boolean,bigint) to authenticated;

create or replace function public.salir_de_sala(p_sala uuid)
returns void language plpgsql security definer set search_path=public as $$
declare s public.salas%rowtype; u uuid:=auth.uid(); multa integer:=0;
begin
 if u is null then raise exception 'No autenticado'; end if;
 select * into s from public.salas where id=p_sala for update;
 if not found then raise exception 'La sala no existe'; end if;
 if s.estado not in ('abierta','llena') then raise exception 'No puedes salir de esta sala ahora'; end if;
 perform 1 from public.profiles where id=u for update;
 delete from public.participantes_sala where sala_id=p_sala and user_id=u;
 if not found then raise exception 'No estás en esta sala'; end if;
 insert into public.movimientos_billetera(user_id,tipo,monto,referencia_id,descripcion)
 values(u,'reembolso',s.cuota,s.id,'Salida de sala '||s.nombre);
 if s.cupo=10 and s.estado='llena' then
  multa:=least(200,greatest(0,public._saldo_de(u)));
  if multa>0 then
   insert into public.movimientos_billetera(user_id,tipo,monto,referencia_id,descripcion,creado_por)
   values(u,'ajuste_admin',-multa,s.id,'Multa: abandonó una sala 5v5 llena',u);
   insert into public.actividades(tipo,emisor_id,receptor_id,monto,descripcion)
   values('multa',u,u,multa,'Abandonó una sala 5v5 llena');
   insert into public.notificaciones(user_id,tipo,mensaje)
   values(u,'multa','Multa por abandonar una sala 5v5 llena: S/ '||(multa/100.0)::numeric(12,2));
  end if;
 end if;
 if s.estado='llena' then update public.salas set estado='abierta' where id=s.id; end if;
end $$;
create or replace function public.salir_de_sala_con_multa(p_sala uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare s public.salas%rowtype; multa integer:=0;
begin
 select * into s from public.salas where id=p_sala for update;
 if s.cupo=10 and s.estado='llena' then multa:=least(200,greatest(0,public._saldo_de(auth.uid())+s.cuota)); end if;
 perform public.salir_de_sala(p_sala);
 return multa;
end $$;
revoke all on function public.salir_de_sala(uuid),public.salir_de_sala_con_multa(uuid) from public,anon;
grant execute on function public.salir_de_sala(uuid),public.salir_de_sala_con_multa(uuid) to authenticated;

alter function public.bloquear_cambios_movimientos() set search_path=public;
alter function public.capitan_de_pick(uuid,uuid,integer) set search_path=public;
alter function public.marcar_inicio_sala() set search_path=public;
-- Los visitantes no necesitan invocar funciones administrativas o de trigger.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature,p.prorettype='trigger'::regtype as es_trigger from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'EXECUTE') loop
  execute format('revoke execute on function %s from public, anon',f.signature);
  if not f.es_trigger then execute format('grant execute on function %s to authenticated',f.signature); end if;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
