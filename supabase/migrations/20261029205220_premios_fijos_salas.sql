-- El premio fijo es el abono total de CADA ganador, incluida su entrada.
-- NULL conserva las condiciones de las salas anteriores y su RPC de creación.
alter table public.salas add column if not exists premio_por_ganador bigint;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.salas'::regclass and conname = 'salas_premio_por_ganador_check') then
    alter table public.salas add constraint salas_premio_por_ganador_check
      check (premio_por_ganador is null or premio_por_ganador between 1 and 900719925474099);
  end if;
end $$;

create or replace function public.crear_sala_con_premio(
  p_nombre text, p_cuota bigint, p_cupo integer, p_premio_por_ganador bigint
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.es_admin() then raise exception 'Solo administradores'; end if;
  if p_nombre is null or trim(p_nombre) = '' then raise exception 'Escribe un nombre para la sala'; end if;
  if p_cuota is null or p_cuota not between 100 and 900719925474099 then
    raise exception 'Cuota inválida: el mínimo es S/ 1.00';
  end if;
  if p_premio_por_ganador is null or p_premio_por_ganador not between 1 and 900719925474099 then
    raise exception 'Premio inválido: el mínimo es S/ 0.01';
  end if;
  if p_cupo is null or p_cupo not in (2, 10) then raise exception 'Cupo inválido: usa 2 (1v1) o 10 (5v5)'; end if;

  insert into public.salas(nombre, cuota, cupo, comision_bp, premio_por_ganador, modalidad, creado_por)
  values(trim(p_nombre), p_cuota, p_cupo, 0, p_premio_por_ganador,
    case when p_cupo = 2 then '1v1' else '5v5' end, auth.uid()) returning id into v_id;
  return v_id;
end $$;

create or replace function public.admin_actualizar_importes_sala(
  p_sala uuid, p_cuota bigint, p_premio_por_ganador bigint
)
returns void language plpgsql security definer set search_path = ''
as $$
declare s public.salas%rowtype;
begin
  if auth.uid() is null or not public.es_admin() then raise exception 'Solo administradores'; end if;
  if p_cuota is null or p_cuota not between 100 and 900719925474099 then
    raise exception 'Cuota inválida: el mínimo es S/ 1.00';
  end if;
  if p_premio_por_ganador is null or p_premio_por_ganador not between 1 and 900719925474099 then
    raise exception 'Premio inválido: el mínimo es S/ 0.01';
  end if;
  -- Comparte el bloqueo de la RPC de entrada: editar e inscribirse se serializan.
  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.estado <> 'abierta' then raise exception 'Solo se pueden cambiar los importes de una sala abierta'; end if;
  if exists(select 1 from public.participantes_sala where sala_id = p_sala) then
    raise exception 'No puedes cambiar la cuota ni el premio con jugadores inscritos';
  end if;
  update public.salas set cuota = p_cuota, premio_por_ganador = p_premio_por_ganador, comision_bp = 0 where id = s.id;
end $$;

create or replace function public.unirse_a_sala_con_importes(
  p_sala uuid, p_cuota_esperada bigint, p_premio_esperado bigint
)
returns void language plpgsql security definer set search_path = ''
as $$
declare s public.salas%rowtype; v_premio bigint; u uuid := auth.uid();
begin
  if u is null then raise exception 'No autenticado'; end if;
  -- Mismo orden de bloqueos que unirse_a_sala: perfil, luego sala.
  perform 1 from public.profiles where id = u for no key update;
  if not found then raise exception 'Cuenta no disponible'; end if;
  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  v_premio := coalesce(s.premio_por_ganador,
    (s.cuota * s.cupo - (s.cuota * s.cupo * s.comision_bp) / 10000) / (s.cupo / 2));
  if p_cuota_esperada is distinct from s.cuota or p_premio_esperado is distinct from v_premio then
    raise exception 'Los importes de la sala cambiaron. Revisa la cuota y el premio antes de volver a unirte';
  end if;
  perform public.unirse_a_sala(p_sala);
end $$;

create or replace function public.cerrar_partida(p_sala uuid, p_dota_match_id bigint, p_equipo_ganador smallint)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  s public.salas%rowtype;
  v_total int;
  v_sin_equipo int;
  v_ganadores int;
  v_mitad int;
  v_pozo bigint;
  v_com bigint;
  v_neto bigint;
  v_premio bigint;
  v_sobrante bigint;
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;
  if p_equipo_ganador is null or p_equipo_ganador not in (1, 2) then raise exception 'Equipo ganador inválido'; end if;
  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  if s.estado <> 'en_juego' then raise exception 'La sala debe estar en juego'; end if;

  select count(*), count(*) filter(where equipo is null), count(*) filter(where equipo = p_equipo_ganador)
    into v_total, v_sin_equipo, v_ganadores from public.participantes_sala where sala_id = p_sala;
  v_mitad := s.cupo / 2;
  if v_total <> s.cupo or v_sin_equipo > 0 then raise exception 'Faltan jugadores o hay equipos sin asignar'; end if;
  if v_ganadores <> v_mitad then raise exception 'Los equipos no están balanceados'; end if;

  v_pozo := s.cuota * s.cupo;
  if s.premio_por_ganador is null then
    -- Conserva íntegro el reparto y el redondeo de salas anteriores.
    v_com := (v_pozo * s.comision_bp) / 10000;
    v_neto := v_pozo - v_com;
    v_premio := v_neto / v_mitad;
    v_sobrante := v_neto - v_premio * v_mitad;
    v_com := v_com + v_sobrante;
  else
    v_premio := s.premio_por_ganador;
    -- Una diferencia negativa registra el bono como gasto de la casa.
    -- ganancias_casa() ya suma esta diferencia con signo.
    v_com := v_pozo - v_premio * v_mitad;
  end if;

  insert into public.movimientos_billetera(user_id, tipo, monto, referencia_id, descripcion, creado_por)
  select user_id, 'premio', v_premio, s.id, 'Premio sala ' || s.nombre, auth.uid()
    from public.participantes_sala where sala_id = p_sala and equipo = p_equipo_ganador;
  insert into public.partidas(sala_id, dota_match_id, equipo_ganador, pozo, comision, premio_por_ganador, cerrada_por)
  values(s.id, p_dota_match_id, p_equipo_ganador, v_pozo, v_com, v_premio, auth.uid());
  update public.salas set estado = 'terminada' where id = s.id;
exception when unique_violation then
  raise exception 'Ese ID de partida de Dota ya fue usado en otra sala';
end $$;

revoke all on function public.crear_sala_con_premio(text,bigint,integer,bigint) from public, anon, service_role;
revoke all on function public.admin_actualizar_importes_sala(uuid,bigint,bigint) from public, anon, service_role;
revoke all on function public.unirse_a_sala_con_importes(uuid,bigint,bigint) from public, anon, service_role;
grant execute on function public.crear_sala_con_premio(text,bigint,integer,bigint) to authenticated;
grant execute on function public.admin_actualizar_importes_sala(uuid,bigint,bigint) to authenticated;
grant execute on function public.unirse_a_sala_con_importes(uuid,bigint,bigint) to authenticated;

notify pgrst, 'reload schema';
