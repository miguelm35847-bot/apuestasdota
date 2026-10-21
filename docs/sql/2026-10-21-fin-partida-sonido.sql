-- Aviso de fin de partida (21/10/2026)
--
-- Cuando el admin cierra la partida (a mano o por detección automática) se
-- avisa a todos los jugadores de la sala con la notificación
-- 'partida_finalizada'. Esa notificación dispara el sonido de fin de partida
-- para todos, estén o no dentro de la sala.
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

-- 1) Tipo de notificación ---------------------------------------------------
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
      'partida_finalizada'
    )
  ) not valid;

-- 2) RPC para avisar el fin de partida ---------------------------------------
create or replace function public.notificar_sala_terminada(p_sala uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_avisados int;
begin
  -- Solo el admin o el servidor (service_role) pueden avisar el fin de partida.
  if not (public.es_admin() or auth.role() = 'service_role') then
    raise exception 'Solo administradores';
  end if;

  select nombre into v_nombre
  from public.salas
  where id = p_sala;

  if v_nombre is null then
    raise exception 'La sala no existe';
  end if;

  insert into public.notificaciones (user_id, tipo, mensaje)
  select ps.user_id,
         'partida_finalizada',
         'La partida de la sala "' || v_nombre || '" terminó. Se repartieron los premios.'
  from public.participantes_sala ps
  where ps.sala_id = p_sala;

  get diagnostics v_avisados = row_count;
  return v_avisados;
end;
$$;

revoke all on function public.notificar_sala_terminada(uuid) from public;
revoke all on function public.notificar_sala_terminada(uuid) from anon;
grant execute on function public.notificar_sala_terminada(uuid) to authenticated;
grant execute on function public.notificar_sala_terminada(uuid) to service_role;
