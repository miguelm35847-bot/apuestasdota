-- Signo de los movimientos de donación (21/10/2026)
--
-- `movimientos_billetera` tiene un segundo check (`signo_correcto`) que valida
-- que el signo del monto corresponda al tipo de movimiento:
--   · positivos: recarga, premio, reembolso
--   · negativos: entrada_sala, retiro
--   · cualquiera: ajuste_admin (el admin ajusta en ambos sentidos)
-- Como los tipos de donación no estaban en el mapeo, PostgreSQL rechazaba la
-- fila con:
--   new row for relation "movimientos_billetera" violates check constraint
--   "signo_correcto"
--
-- Se reconstruye el check con los mismos tipos más los dos de donación
-- (la donación enviada es negativa para quien dona y la recibida positiva
-- para quien la recibe). Los CHECK no pueden mirar otras filas, así que esta
-- regla solo valida el signo de cada movimiento.
--
-- Es idempotente: se puede volver a aplicar sin romper nada.

alter table public.movimientos_billetera drop constraint if exists signo_correcto;
alter table public.movimientos_billetera add constraint signo_correcto
  check (
    (tipo in ('recarga', 'premio', 'reembolso') and monto > 0)
    or (tipo in ('entrada_sala', 'retiro') and monto < 0)
    or tipo = 'ajuste_admin'
    or (tipo = 'donacion_enviada' and monto < 0)
    or (tipo = 'donacion_recibida' and monto > 0)
  ) not valid;
