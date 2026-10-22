-- Elección de la moneda en 5v5: Radiant o LastPick (21/10/2026)
--
-- Flujo acordado:
--   1. La sala se llena y el servidor pide solo la verificación "Estoy listo".
--   2. Cuando los 10 confirman, al admin le suena un aviso (sonido "listos").
--   3. El admin elige a los dos capitanes y guarda: `iniciar_picks` (ya
--      existente) lanza la moneda con el avatar de los dos capitanes.
--   4. El ganador de la moneda elige con esta RPC:
--        · 'radiant'  → se queda Radiant y **pickea primero**.
--        · 'lastpick' → se queda Dire y el rival (Radiant) pickea primero;
--                       el ganador cierra el draft (last pick).
--   5. El resto de la fase sigue igual: orden serpiente A-B-B-A
--      (`capitan_de_pick`), 60 s por turno, auto-pick si vence, y los
--      jugadores elegidos van al equipo del capitán que los elige.
--
-- No reescribe `elegir_moneda`/`elegir_lado`: es una RPC nueva y acotada que
-- solo asigna lados, fija quién pickea primero y arranca el draft.
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

create or replace function public.elegir_radiant_o_lastpick(p_sala uuid, p_opcion text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.salas%rowtype;
  v_uid uuid := auth.uid();
  v_cap1 uuid;
  v_cap2 uuid;
  v_rival uuid;
  v_radiant uuid;
  v_dire uuid;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión';
  end if;

  if p_opcion is null or p_opcion not in ('radiant', 'lastpick') then
    raise exception 'Opción inválida: usa radiant o lastpick';
  end if;

  select * into s from public.salas where id = p_sala for update;
  if not found then
    raise exception 'La sala no existe';
  end if;

  if s.cupo <> 10 then
    raise exception 'Esta decisión es solo para salas 5v5';
  end if;

  if s.picks_estado <> 'eleccion' then
    raise exception 'La moneda no está esperando una decisión';
  end if;

  if s.pick_decision_user_id is distinct from v_uid then
    raise exception 'Solo el ganador de la moneda puede decidir';
  end if;

  v_cap1 := s.pick_capitan1;
  v_cap2 := s.pick_capitan2;

  if v_cap1 is null or v_cap2 is null then
    raise exception 'Faltan los capitanes';
  end if;

  v_rival := case when v_cap1 = v_uid then v_cap2 else v_cap1 end;

  if p_opcion = 'radiant' then
    -- El ganador toma Radiant y abre el draft.
    v_radiant := v_uid;
    v_dire := v_rival;
  else
    -- Last pick: el ganador toma Dire; el rival se queda Radiant y abre.
    v_radiant := v_rival;
    v_dire := v_uid;
  end if;

  -- La fase de picks congela `participantes_sala`; esto abre la excepción.
  perform set_config('app.picks_operacion', 'on', true);

  update public.participantes_sala
  set equipo = 1
  where sala_id = p_sala and user_id = v_radiant;

  update public.participantes_sala
  set equipo = 2
  where sala_id = p_sala and user_id = v_dire;

  update public.salas
  set picks_estado = 'en_curso',
      pick_decision_user_id = null,
      pick_decision_tipo = null,
      -- Quien abre el draft es siempre el capitán de Radiant.
      pick_primer_user_id = v_radiant,
      pick_turno_user_id = v_radiant,
      pick_turno_expira_at = now() + interval '60 seconds'
  where id = p_sala;
end;
$$;

revoke all on function public.elegir_radiant_o_lastpick(uuid, text) from public;
revoke all on function public.elegir_radiant_o_lastpick(uuid, text) from anon;
grant execute on function public.elegir_radiant_o_lastpick(uuid, text) to authenticated;
