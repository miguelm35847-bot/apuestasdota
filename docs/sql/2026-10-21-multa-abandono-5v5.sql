-- Multa por abandonar una sala 5v5 llena (21/10/2026)
--
-- Regla: si una sala 5v5 está llena (10/10) y un jugador se sale por su
-- cuenta, se le cobra una multa de S/ 2.00 además del reembolso normal de la
-- cuota (es decir, recupera la cuota menos la multa).
--
-- Cómo funciona:
--   · La RPC nueva `salir_de_sala_con_multa` llama primero a la RPC de
--     siempre (`salir_de_sala`: reembolso + salida) sin tocar su lógica y,
--     después, cobra la multa. Todo ocurre en una sola transacción: si algo
--     falla, no se cobra ni se sale.
--   · Solo se multa si la sala es 5v5 (cupo 10) y estaba `llena`; en una sala
--     abierta (o en 1v1) salir sigue siendo gratis.
--   · La multa nunca deja el saldo en negativo: si al jugador le queda menos
--     de S/ 2.00 se le cobra solo lo que tiene.
--   · La multa queda en el panel público de actividades y se le notifica al
--     jugador, igual que las multas del admin.
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

create or replace function public.salir_de_sala_con_multa(p_sala uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_estado text;
  v_cupo integer;
  v_en_sala boolean;
  v_multa integer := 200; -- S/ 2.00
  v_saldo integer;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión';
  end if;

  if p_sala is null then
    raise exception 'Datos incompletos';
  end if;

  select estado, cupo
    into v_estado, v_cupo
  from public.salas
  where id = p_sala;

  if not found then
    raise exception 'La sala no existe';
  end if;

  select exists(
    select 1
    from public.participantes_sala
    where sala_id = p_sala and user_id = v_user
  ) into v_en_sala;

  -- 1) Salida normal: reembolsa la cuota y borra al jugador de la sala.
  perform public.salir_de_sala(p_sala);

  -- 2) Multa solo al abandonar una 5v5 que estaba llena.
  if not v_en_sala or v_cupo <> 10 or v_estado <> 'llena' then
    return 0;
  end if;

  perform 1 from public.profiles where id = v_user for update;

  v_saldo := public._saldo_de(v_user);

  if v_saldo < v_multa then
    v_multa := greatest(v_saldo, 0);
  end if;

  if v_multa <= 0 then
    return 0;
  end if;

  -- `ajuste_admin` admite cualquier signo en `movimientos_billetera`.
  insert into public.movimientos_billetera
    (user_id, tipo, monto, referencia_id, descripcion, creado_por)
  values
    (v_user, 'ajuste_admin', -v_multa, p_sala,
     'Multa: abandonó una sala 5v5 llena', v_user);

  insert into public.actividades (tipo, emisor_id, receptor_id, monto, descripcion)
  values ('multa', v_user, v_user, v_multa, 'Abandonó una sala 5v5 llena');

  insert into public.notificaciones (user_id, tipo, mensaje)
  values (
    v_user,
    'multa',
    'Se aplicó una multa de ' ||
      format('S/ %s', (v_multa / 100.0)::numeric(12, 2)) ||
      ' por abandonar una sala 5v5 llena.'
  );

  return v_multa;
end;
$$;

revoke all on function public.salir_de_sala_con_multa(uuid) from public;
revoke all on function public.salir_de_sala_con_multa(uuid) from anon;
grant execute on function public.salir_de_sala_con_multa(uuid) to authenticated;
