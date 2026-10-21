-- Preferencia de lado del jugador (21/10/2026)
--
-- Durante la fase de picks (cuando los capitanes eligen jugadores) cada
-- jugador puede decir si prefiere Radiant o Dire. Es SOLO INFORMATIVO: no
-- cambia el reparto ni el sorteo, solo sirve para que los capitanes lo vean.
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

-- 1) Columna de preferencia ---------------------------------------------------
alter table public.participantes_sala
  add column if not exists preferencia_equipo smallint;

alter table public.participantes_sala
  drop constraint if exists participantes_sala_preferencia_equipo_check;
alter table public.participantes_sala
  add constraint participantes_sala_preferencia_equipo_check
  check (preferencia_equipo is null or preferencia_equipo in (1, 2)) not valid;

-- 2) RPC para elegir (o quitar) la preferencia ---------------------------------
create or replace function public.elegir_preferencia_equipo(
  p_sala uuid,
  p_equipo integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  if p_equipo is not null and p_equipo not in (1, 2) then
    raise exception 'Lado inválido';
  end if;

  if not exists (
    select 1 from public.participantes_sala
    where sala_id = p_sala and user_id = auth.uid()
  ) then
    raise exception 'No perteneces a esta sala';
  end if;

  -- Solo existe durante la fase en la que los capitanes eligen jugadores.
  if not exists (
    select 1 from public.salas
    where id = p_sala and picks_estado in ('eleccion', 'en_curso')
  ) then
    raise exception 'Solo se puede elegir lado durante la fase de picks';
  end if;

  -- El trigger `bloquear_cambios_en_picks` congela a los participantes durante
  -- los picks: marcamos la operación para poder escribir la preferencia.
  perform set_config('app.picks_operacion', 'on', true);

  update public.participantes_sala
  set preferencia_equipo = p_equipo
  where sala_id = p_sala and user_id = auth.uid();
end;
$$;

revoke all on function public.elegir_preferencia_equipo(uuid, integer) from public;
revoke all on function public.elegir_preferencia_equipo(uuid, integer) from anon;
grant execute on function public.elegir_preferencia_equipo(uuid, integer) to authenticated;
