-- Multas por faltas a las reglas (21/10/2026)
-- Permite que el admin notifique una multa desde Admin → Jugadores.
-- La multa económica se registra con `ajuste_admin` (monto negativo) y la
-- descripción empieza con "Multa: ", para que el panel de actividades pueda
-- listarla más adelante sin una tabla adicional.

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
      'multa'
    )
  ) not valid;
