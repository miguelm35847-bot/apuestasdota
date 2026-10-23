-- pg_cron mantiene plazos y vencimientos aunque no haya navegadores abiertos.
create extension if not exists pg_cron;
create or replace function public.procesar_plazos_arena()
returns void language plpgsql security definer set search_path=public as $$
declare s record; administrador uuid;
begin
 -- Bloqueo compartido con aceptar/crear: primero sala y después sus apuestas.
 for s in select id from public.salas where estado='en_juego' and iniciada_at<=clock_timestamp()-interval '25 minutes' order by id for update skip locked loop
  update public.apuestas_sala set estado='expirada',resuelto_en=clock_timestamp() where sala_id=s.id and estado='pendiente';
 end loop;
 for s in select id,creado_por from public.salas where picks_estado='en_curso' and pick_turno_expira_at<=clock_timestamp() order by id for update skip locked loop
  select id into administrador from public.profiles where rol='admin' and not baneado order by (id=s.creado_por) desc limit 1;
  if administrador is not null then
   perform set_config('request.jwt.claim.sub',administrador::text,true);
   perform set_config('request.jwt.claims',json_build_object('sub',administrador,'role','authenticated')::text,true);
   begin perform public.auto_pickear_si_vencido(s.id,false);
   exception when others then raise warning 'No se pudo ejecutar el auto-pick de sala %: %',s.id,sqlerrm;
   end;
  end if;
 end loop;
end $$;
revoke all on function public.procesar_plazos_arena() from public,anon,authenticated,service_role;
select cron.schedule('arena-plazos','5 seconds','select public.procesar_plazos_arena()');
