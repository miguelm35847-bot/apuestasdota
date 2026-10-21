-- Verificación de sala sin mensajes en la campana (21/10/2026)
--
-- El aviso de "Estoy listo" ya no necesita una notificación: el sonido se
-- dispara con el evento Realtime de la sala y solo para sus jugadores.
-- Esta versión de `admin_pedir_verificacion` deja de crear esas filas, para
-- que la tabla `notificaciones` no se llame de avisos repetidos.
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

create or replace function public.admin_pedir_verificacion(p_sala uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cupo int;
  v_estado text;
  v_socios int;
begin
  if not public.es_admin() then
    raise exception 'Solo administradores';
  end if;

  select s.cupo, s.estado into v_cupo, v_estado
  from public.salas s
  where s.id = p_sala
  for update;

  if v_cupo is null then
    raise exception 'La sala no existe';
  end if;

  if v_estado in ('terminada', 'cancelada') then
    raise exception 'La sala ya terminó';
  end if;

  select count(*) into v_socios
  from public.participantes_sala
  where sala_id = p_sala;

  if v_socios < v_cupo then
    raise exception 'Faltan jugadores: hay % de %', v_socios, v_cupo;
  end if;

  -- El trigger `bloquear_cambios_en_picks` congela a los participantes durante
  -- la fase de picks. La verificación solo escribe `verificado_at`, así que
  -- se marca la operación para poder pedir la confirmación en cualquier fase.
  perform set_config('app.picks_operacion', 'on', true);

  update public.participantes_sala
  set verificado_at = null
  where sala_id = p_sala;

  update public.salas
  set verificacion_estado = 'pendiente',
      verificacion_iniciada_at = now(),
      verificacion_expira_at = now() + interval '15 minutes'
  where id = p_sala;

  -- Aviso limpio: los avisos viejos de verificación se eliminan para que no
  -- se acumulen en la campana de los jugadores.
  delete from public.notificaciones
  where tipo = 'verificacion_sala'
    and user_id in (select ps.user_id from public.participantes_sala ps where ps.sala_id = p_sala);

  return v_socios;
end;
$$;

revoke all on function public.admin_pedir_verificacion(uuid) from public;
revoke all on function public.admin_pedir_verificacion(uuid) from anon;
grant execute on function public.admin_pedir_verificacion(uuid) to authenticated;
