-- Aplicar DESPUÉS de 2026-10-23-apuestas-salas.sql.
-- Sin límite de ofertas por usuario/sala. Los cruces confirmados son públicos.
begin;

drop index if exists public.apuestas_una_oferta_pendiente;

create or replace function public.crear_apuesta_sala(p_sala uuid, p_equipo integer, p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_estado text;
  v_anterior public.apuestas_sala%rowtype;
begin
  if v_user is null then raise exception 'Debes iniciar sesión'; end if;
  if p_id is null or p_sala is null or p_equipo is null or p_equipo not in (1, 2) then
    raise exception 'Selecciona Radiant o Dire';
  end if;
  select estado into v_estado from public.salas where id = p_sala for update;
  if not found then raise exception 'La sala no existe'; end if;
  select * into v_anterior from public.apuestas_sala where id = p_id;
  if found then
    if v_anterior.creador_id = v_user and v_anterior.sala_id = p_sala and v_anterior.equipo_creador = p_equipo then
      return p_id;
    end if;
    raise exception 'Identificador de apuesta inválido';
  end if;
  if v_estado <> 'en_juego' or exists (select 1 from public.partidas where sala_id = p_sala) then
    raise exception 'Las apuestas solo están disponibles durante la partida';
  end if;
  perform 1 from public.profiles where id = v_user and not coalesce(baneado, false) for update;
  if not found then raise exception 'Tu cuenta no puede apostar'; end if;
  if public._saldo_de(v_user) < 550 then raise exception 'Necesitas S/ 5.50 de saldo'; end if;
  insert into public.apuestas_sala(id, sala_id, creador_id, equipo_creador)
    values (p_id, p_sala, v_user, p_equipo);
  return p_id;
end;
$$;
revoke all on function public.crear_apuesta_sala(uuid, integer, uuid) from public, anon;
grant execute on function public.crear_apuesta_sala(uuid, integer, uuid) to authenticated;

drop policy if exists apuestas_lectura on public.apuestas_sala;
drop policy if exists apuestas_cruces_publicos on public.apuestas_sala;
create policy apuestas_cruces_publicos on public.apuestas_sala for select to anon, authenticated
  using (estado in ('aceptada', 'liquidada', 'reembolsada'));
create policy apuestas_lectura on public.apuestas_sala for select to authenticated using (
  estado = 'pendiente' or creador_id = auth.uid() or aceptante_id = auth.uid() or public.es_admin()
);

-- La comisión sigue siendo contabilidad interna, accesible al admin por RPC.
-- La lectura pública solo permite los campos necesarios para los cruces.
revoke select on public.apuestas_sala from anon, authenticated;
grant select (id, sala_id, creador_id, equipo_creador, aceptante_id, estado,
  ganador_id, creado_en, aceptado_en, resuelto_en)
  on public.apuestas_sala to anon, authenticated;

notify pgrst, 'reload schema';
commit;
