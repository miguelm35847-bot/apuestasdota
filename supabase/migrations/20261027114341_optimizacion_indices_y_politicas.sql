-- Tablas pequeñas verificadas antes de aplicar. Abortar si hay escrituras largas
-- que impidan adquirir los bloqueos, en lugar de dejarlas esperando.
set local lock_timeout = '2s';
set local statement_timeout = '30s';

-- Postgres no crea índices automáticamente en el lado referenciante de una FK.
-- Se conservan los índices existentes de historial y de usos ocasionales.
create index if not exists actividades_emisor_idx on public.actividades(emisor_id);
create index if not exists actividades_receptor_idx on public.actividades(receptor_id);
create index if not exists apuestas_ganador_idx on public.apuestas_sala(ganador_id);
create index if not exists donaciones_donante_idx on public.donaciones(donante_id);
create index if not exists donaciones_receptor_idx on public.donaciones(receptor_id);
create index if not exists mensajes_chat_usuario_idx on public.mensajes_chat(user_id);
create index if not exists movimientos_creador_idx on public.movimientos_billetera(creado_por);
-- El orden inverso de la PK permite buscar las salas de un usuario y cubrir
-- sala_id, que consultan la campana y el aviso de verificación.
create index if not exists participantes_usuario_idx on public.participantes_sala(user_id, sala_id);
create index if not exists partidas_cerrada_por_idx on public.partidas(cerrada_por);
create index if not exists recargas_revisor_idx on public.recargas(revisado_por);
create index if not exists retiros_procesador_idx on public.retiros(procesado_por);
create index if not exists salas_creador_idx on public.salas(creado_por);

-- Estas cuatro lecturas authenticated ya están cubiertas por una política
-- PERMISSIVE pública con USING (true). Los grants por columna siguen vigentes.
do $$
declare
  tabla text;
  publica text;
begin
  for tabla, publica in values
    ('profiles', 'profiles_lectura_publica'),
    ('salas', 'salas_lectura_publica'),
    ('participantes_sala', 'participantes_lectura_publica'),
    ('partidas', 'partidas_lectura_publica')
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tabla and policyname = publica
        and permissive = 'PERMISSIVE' and cmd = 'SELECT'
        and roles = array['public']::name[] and qual = 'true'
    ) then
      raise exception 'Falta la política pública esperada en %; no se retiran políticas.', tabla;
    end if;
  end loop;
end;
$$;

drop policy if exists "perfil propio o admin" on public.profiles;
drop policy if exists "salas visibles" on public.salas;
drop policy if exists "participantes visibles" on public.participantes_sala;
drop policy if exists "partidas visibles" on public.partidas;

-- Anon conserva únicamente los cruces confirmados. Authenticated conserva la
-- unión de ambas políticas: públicos, pendientes, propios o administración.
alter policy apuestas_cruces_publicos on public.apuestas_sala to anon;
alter policy apuestas_lectura on public.apuestas_sala to authenticated using (
  estado in ('pendiente', 'aceptada', 'liquidada', 'reembolsada')
  or creador_id = (select auth.uid())
  or aceptante_id = (select auth.uid())
  or (select public.es_admin())
);

-- Mismo autor obligatorio tanto en el chat general como en el de sala.
-- Solo el participante de esa sala o un administrador puede escribir allí.
drop policy if exists mensajes_chat_insert_general on public.mensajes_chat;
drop policy if exists mensajes_chat_insert_sala on public.mensajes_chat;
drop policy if exists mensajes_chat_insert on public.mensajes_chat;
create policy mensajes_chat_insert on public.mensajes_chat for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    sala_id is null
    or (
      sala_id is not null
      and (
        (select public.es_admin())
        or exists (
          select 1 from public.participantes_sala p
          where p.sala_id = mensajes_chat.sala_id and p.user_id = (select auth.uid())
        )
      )
    )
  )
);

-- No se fusiona la lectura pública del general con la lectura autenticada de
-- salas: sus audiencias son distintas. Se conserva esa superposición explícita.
alter policy mensajes_chat_lectura_sala on public.mensajes_chat using (
  sala_id is not null
  and (
    (select public.es_admin())
    or exists (
      select 1 from public.participantes_sala p
      where p.sala_id = mensajes_chat.sala_id and p.user_id = (select auth.uid())
    )
  )
);
