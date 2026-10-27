begin;
-- Las tablas son internas: ninguna cuenta del navegador obtiene filas.
create policy steam_intentos_sin_acceso_cliente on steam_auth.intentos
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy steam_cuentas_sin_acceso_cliente on steam_auth.cuentas
  as restrictive for all to anon, authenticated using (false) with check (false);
-- Evita recorrer todos los intentos al eliminar un perfil vinculado.
create index steam_intentos_usuario on steam_auth.intentos(usuario);
commit;
