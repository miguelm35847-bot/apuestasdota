-- Cierre programado compatible con Vercel Hobby/Pro. Sin claves en el repositorio.
begin;
create extension if not exists pg_net with schema extensions;
alter table public.salas add column if not exists cierre_revisado_at timestamptz;
do $$ begin
 if not exists(select 1 from vault.secrets where name='arena_worker_token') then
  perform vault.create_secret(gen_random_uuid()::text||gen_random_uuid()::text,'arena_worker_token','Autenticación interna del cierre programado');
 end if;
end $$;

create or replace function public.validar_trabajador_arena(p_token text)
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(p_token=(select decrypted_secret from vault.decrypted_secrets where name='arena_worker_token'),false)
$$;
revoke all on function public.validar_trabajador_arena(text) from public,anon,authenticated;
grant execute on function public.validar_trabajador_arena(text) to service_role;

-- Tomar ocho salas por turno con prioridad para las que llevan más tiempo sin
-- comprobarse. El límite es de trabajo por ejecución, nunca de salas/apuestas.
create or replace function public.tomar_salas_cierre()
returns table(id uuid,cupo integer,iniciada_at timestamptz,dota_match_id_esperado bigint)
language sql security definer set search_path=public as $$
 with candidatas as (
  select s.id from public.salas s where s.estado='en_juego' and s.auto_cierre
   and s.dota_match_id_esperado is not null
   and (s.cierre_revisado_at is null or s.cierre_revisado_at<clock_timestamp()-interval '55 seconds')
  order by s.cierre_revisado_at nulls first,s.id limit 8 for update skip locked
 ) update public.salas s set cierre_revisado_at=clock_timestamp() from candidatas c where s.id=c.id
 returning s.id,s.cupo,s.iniciada_at,s.dota_match_id_esperado
$$;
revoke all on function public.tomar_salas_cierre() from public,anon,authenticated;
grant execute on function public.tomar_salas_cierre() to service_role;

create or replace function public.invocar_cierre_arena()
returns void language plpgsql security definer set search_path=public as $$
declare token text;
begin
 if not exists(select 1 from public.salas where estado='en_juego' and auto_cierre and dota_match_id_esperado is not null) then return; end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='arena_worker_token';
 perform net.http_post(
  url:='https://rxkzqcxjtfxzxhkhezxr.supabase.co/functions/v1/arena-worker',
  headers:=jsonb_build_object('Content-Type','application/json','X-Arena-Token',token),
  body:='{}'::jsonb,timeout_milliseconds:=55000);
end $$;
revoke all on function public.invocar_cierre_arena() from public,anon,authenticated,service_role;
select cron.schedule('arena-cierre','* * * * *','select public.invocar_cierre_arena()');
notify pgrst,'reload schema';
commit;
