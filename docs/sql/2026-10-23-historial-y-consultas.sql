-- Historial completo y agregados propios. No cambia los permisos de lectura.
begin;
create index if not exists apuestas_creador_historial on public.apuestas_sala(creador_id,creado_en desc,id desc);
create index if not exists apuestas_aceptante_historial on public.apuestas_sala(aceptante_id,creado_en desc,id desc) where aceptante_id is not null;
create index if not exists recargas_usuario_historial on public.recargas(user_id,created_at desc);
create index if not exists retiros_usuario_historial on public.retiros(user_id,created_at desc);

create or replace function public.mi_billetera_historial(p_pagina integer default 0,p_tamano integer default 20)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare resultado jsonb;
begin
 if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
 if p_pagina is null or p_pagina<0 or p_tamano is null or p_tamano not between 1 and 100 then raise exception 'Página inválida'; end if;
 with movimientos as (
  select id,tipo,monto,referencia_id,descripcion,created_at,
   sum(monto) over(order by created_at,id rows between unbounded preceding and current row) as saldo_posterior
  from public.movimientos_billetera where user_id=(select auth.uid())
 ), pagina as (
  select * from movimientos order by created_at desc,id desc limit p_tamano offset p_pagina::bigint*p_tamano
 ) select jsonb_build_object('total',(select count(*) from movimientos),
   'movimientos',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id desc) from pagina p),'[]'::jsonb)) into resultado;
 return resultado;
end $$;

create or replace function public.resumen_mis_apuestas()
returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
  'pendientes',count(*) filter(where estado='pendiente'),
  'confirmadas',count(*) filter(where estado='aceptada'),
  'comprometido',550*count(*) filter(where estado='aceptada'),
  'premios',1000*count(*) filter(where estado='liquidada' and ganador_id=(select auth.uid()))
 ) from public.apuestas_sala where creador_id=(select auth.uid()) or aceptante_id=(select auth.uid())
$$;
revoke all on function public.mi_billetera_historial(integer,integer),public.resumen_mis_apuestas() from public,anon;
grant execute on function public.mi_billetera_historial(integer,integer),public.resumen_mis_apuestas() to authenticated;

-- Evaluar una sola vez por consulta las identidades invariantes de RLS.
do $$ declare p record; expresion text; comprobacion text; begin
 for p in select * from pg_policies where schemaname='public'
   and (qual like '%auth.uid()%' or with_check like '%auth.uid()%') loop
  if coalesce(p.qual,'') like '%SELECT auth.uid()%' or coalesce(p.with_check,'') like '%SELECT auth.uid()%' then continue; end if;
  expresion:=replace(p.qual,'auth.uid()','(select auth.uid())');
  comprobacion:=replace(p.with_check,'auth.uid()','(select auth.uid())');
  execute format('alter policy %I on public.%I%s%s',p.policyname,p.tablename,
   case when expresion is null then '' else ' using ('||expresion||')' end,
   case when comprobacion is null then '' else ' with check ('||comprobacion||')' end);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
