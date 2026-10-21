-- Realtime para las notificaciones (21/10/2026)
--
-- La tabla `notificaciones` no estaba en la publicación `supabase_realtime`.
-- Eso no solo impedía que la campana se actualice sola: al suscribirse a una
-- tabla que no está publicada, el servidor acepta el canal pero **no envía
-- ningún evento**, así que también se caían los avisos de sonido de la sala
-- (verificación y fin de partida).
--
-- La RLS sigue aplicando: cada usuario solo recibe sus propias
-- notificaciones (política `notificaciones_lectura_propia`).
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

do $$
begin
  begin
    alter publication supabase_realtime add table public.notificaciones;
  exception when duplicate_object then null;
  end;
end $$;
