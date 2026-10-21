-- Tipos de movimiento de donación (21/10/2026)
--
-- La tabla `movimientos_billetera` tiene un check que solo aceptaba los tipos
-- del sistema (recarga, retiro, entrada_sala, reembolso, premio y
-- ajuste_admin). La RPC `donar_saldo` escribía los tipos
-- `donacion_enviada` y `donacion_recibida`, así que PostgreSQL rechazaba la
-- donation con:
--   new row for relation "movimientos_billetera" violates check constraint
--   "movimientos_billetera_tipo_check"
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

alter table public.movimientos_billetera drop constraint if exists movimientos_billetera_tipo_check;
alter table public.movimientos_billetera add constraint movimientos_billetera_tipo_check
  check (
    tipo in (
      'recarga',
      'retiro',
      'entrada_sala',
      'reembolso',
      'premio',
      'ajuste_admin',
      'donacion_enviada',
      'donacion_recibida'
    )
  ) not valid;
