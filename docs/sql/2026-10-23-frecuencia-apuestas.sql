-- Protección ante ráfagas automatizadas; nunca limita el total de apuestas.
begin;
create table if not exists public.frecuencia_apuestas(
 user_id uuid primary key references public.profiles(id),desde timestamptz not null,intentos integer not null
);
alter table public.frecuencia_apuestas enable row level security;
revoke all on public.frecuencia_apuestas from public,anon,authenticated;
create or replace function public.controlar_frecuencia_apuestas()
returns trigger language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if (tg_op='INSERT' and new.estado='pendiente') or (tg_op='UPDATE' and new.estado='aceptada' and old.estado='pendiente') then
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  insert into public.frecuencia_apuestas values(auth.uid(),clock_timestamp(),1)
   on conflict(user_id) do update set
    intentos=case when frecuencia_apuestas.desde>clock_timestamp()-interval '10 seconds' then frecuencia_apuestas.intentos+1 else 1 end,
    desde=case when frecuencia_apuestas.desde>clock_timestamp()-interval '10 seconds' then frecuencia_apuestas.desde else clock_timestamp() end
   returning intentos into n;
  if n>120 then raise exception 'Demasiadas solicitudes seguidas. Espera unos segundos y vuelve a intentar'; end if;
 end if;
 return new;
end $$;
revoke all on function public.controlar_frecuencia_apuestas() from public,anon,authenticated,service_role;
drop trigger if exists controlar_frecuencia_apuestas_trg on public.apuestas_sala;
create trigger controlar_frecuencia_apuestas_trg before insert or update on public.apuestas_sala for each row execute function public.controlar_frecuencia_apuestas();
do $$ declare def text; begin
 select pg_get_functiondef('public.qa_cleanup()'::regprocedure) into def;
 if position('delete from public.frecuencia_apuestas' in def)=0 then
  def:=replace(def,'delete from public.apuestas_sala','delete from public.frecuencia_apuestas where user_id = any(v_ids); delete from public.apuestas_sala');
  execute def;
 end if;
end $$;
commit;
