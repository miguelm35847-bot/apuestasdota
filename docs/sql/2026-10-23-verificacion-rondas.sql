-- Distingue las solicitudes manuales de las automáticas para no heredar avisos.
begin;
alter table public.salas add column if not exists verificacion_origen text
  check (verificacion_origen in ('manual', 'automatica'));

create or replace function public.admin_pedir_verificacion(p_sala uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare s public.salas%rowtype; n integer;
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;
  select * into s from public.salas where id=p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.estado in ('terminada','cancelada') then raise exception 'La sala ya terminó'; end if;
  select count(*) into n from public.participantes_sala where sala_id=p_sala;
  if n=0 then raise exception 'La sala todavía no tiene jugadores'; end if;
  perform set_config('app.picks_operacion','on',true);
  update public.participantes_sala set verificado_at=null where sala_id=p_sala;
  update public.salas set verificacion_estado='pendiente', verificacion_origen='manual',
    verificacion_iniciada_at=clock_timestamp(), verificacion_expira_at=now()+interval '15 minutes'
    where id=p_sala;
  return n;
end;
$$;

create or replace function public.iniciar_verificacion_llenada()
returns trigger language plpgsql security definer set search_path=public as $$
declare s public.salas%rowtype; n integer; sala uuid;
begin
  sala := case when tg_op='DELETE' then old.sala_id else new.sala_id end;
  select * into s from public.salas where id=sala for update;
  if not found then return null; end if;
  if s.estado not in ('abierta','llena') then return null; end if;
  select count(*) into n from public.participantes_sala where sala_id=sala;
  if tg_op='DELETE' then
    if n=0 or (s.verificacion_origen='automatica' and n<s.cupo) then
      update public.salas set verificacion_estado='inactiva', verificacion_origen=null,
        verificacion_iniciada_at=null, verificacion_expira_at=null where id=sala;
      perform set_config('app.picks_operacion','on',true);
      update public.participantes_sala set verificado_at=null where sala_id=sala;
    end if;
    return null;
  end if;
  -- Una solicitud vigente del admin sigue activa para sus participantes.
  if s.verificacion_estado='pendiente' and s.verificacion_origen='manual'
     and s.verificacion_expira_at>now() then return null; end if;
  -- Una ronda completa nunca se reabre solo porque entra alguien.
  if n<s.cupo then return null; end if;
  if s.verificacion_estado='pendiente' and s.verificacion_expira_at>now() then return null; end if;
  perform set_config('app.picks_operacion','on',true);
  update public.participantes_sala set verificado_at=null where sala_id=sala;
  update public.salas set verificacion_estado='pendiente', verificacion_origen='automatica',
    verificacion_iniciada_at=clock_timestamp(), verificacion_expira_at=now()+interval '15 minutes'
    where id=sala;
  return null;
end;
$$;
drop trigger if exists iniciar_verificacion_llenada on public.participantes_sala;
create trigger iniciar_verificacion_llenada after insert or delete on public.participantes_sala
  for each row execute function public.iniciar_verificacion_llenada();
revoke all on function public.iniciar_verificacion_llenada() from public, anon, authenticated;

-- Retira rondas heredadas sin origen cuando la sala ya no está llena.
-- Las solicitudes manuales creadas por la función nueva no se modifican.
update public.salas s set verificacion_estado='inactiva', verificacion_iniciada_at=null,
  verificacion_expira_at=null
where s.verificacion_origen is null and s.estado in ('abierta','llena')
  and s.verificacion_estado<>'inactiva'
  and (select count(*) from public.participantes_sala p where p.sala_id=s.id)<s.cupo;
update public.salas set verificacion_origen='automatica'
  where verificacion_origen is null and verificacion_estado in ('pendiente','completa');
notify pgrst, 'reload schema';
commit;
