// Se ejecuta únicamente dentro del PostgreSQL desechable del harness financiero.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export async function verificarOptimizacionDB(sql, usuarios, caso) {
  const archivos = (await readdir('supabase/migrations')).filter(n => n.endsWith('_optimizacion_indices_y_politicas.sql'));
  assert.equal(archivos.length, 1);
  const migracion = await readFile('supabase/migrations/' + archivos[0], 'utf8');
  const [r1, r2, r3] = [randomUUID(), randomUUID(), randomUUID()];
  const estados = ['pendiente', 'aceptada', 'liquidada', 'reembolsada', 'cancelada', 'expirada'];
  const actores = [
    ['visitante', 'anon', '', 3, 1],
    ['participante', 'authenticated', usuarios[0], 4, 2],
    ['otra sala', 'authenticated', usuarios[1], 4, 2],
    ['creador', 'authenticated', usuarios[2], 6, 1],
    ['aceptante', 'authenticated', usuarios[3], 4, 1],
    ['administrador', 'authenticated', usuarios[4], 6, 3],
    ['anon con sub de admin', 'anon', usuarios[4], 3, 1],
  ];
  const sesion = (rol, id, consulta) => sql(`begin; set local role ${rol}; set local request.jwt.claim.sub='${id}'; ${consulta}; rollback;`);
  const leer = async (rol, id) => JSON.parse(await sesion(rol, id, `select jsonb_build_object(
    'profiles',(select count(id) from profiles),'salas',(select count(*) from salas),
    'participantes',(select count(*) from participantes_sala),'partidas',(select count(*) from partidas),
    'apuestas',(select array_agg(estado order by estado) from apuestas_sala),
    'chat',(select array_agg(mensaje order by mensaje) from mensajes_chat))`));
  const permisos = () => sql(`select jsonb_agg(jsonb_build_object('tabla',c.table_name,'columna',c.column_name,'rol',r.rol,
    'select',has_column_privilege(r.rol,'public.'||c.table_name,c.column_name,'SELECT'),
    'insert',has_column_privilege(r.rol,'public.'||c.table_name,c.column_name,'INSERT'),
    'update',has_column_privilege(r.rol,'public.'||c.table_name,c.column_name,'UPDATE')) order by c.table_name,c.column_name,r.rol)
    from information_schema.columns c cross join (values ('anon'),('authenticated')) r(rol) where c.table_schema='public'`);
  const escribir = async (rol, id, autor, sala) => {
    try { await sesion(rol, id, `insert into mensajes_chat(user_id,sala_id,mensaje) values('${autor}',${sala ? "'" + sala + "'" : 'null'},'QA permisos')`); return true; }
    catch (error) { if (/row-level security|permission denied|permiso|política/i.test(error.message)) return false; throw error; }
  };
  const inserciones = [
    ['authenticated', usuarios[0], usuarios[0], null, true],
    ['authenticated', usuarios[0], usuarios[0], r1, true],
    ['authenticated', usuarios[0], usuarios[0], r2, false],
    ['authenticated', usuarios[2], usuarios[2], r1, false],
    ['authenticated', usuarios[4], usuarios[4], r1, true],
    ['authenticated', usuarios[4], usuarios[0], null, false],
    ['authenticated', usuarios[4], usuarios[0], r1, false],
    ['anon', '', usuarios[0], null, false],
    ['anon', usuarios[4], usuarios[4], r1, false],
  ];
  const datos = () => sql(`select jsonb_build_object('saldo',(select sum(monto) from movimientos_billetera),
    'apuestas',(select jsonb_agg(to_jsonb(a) order by id) from apuestas_sala a),
    'mensajes',(select jsonb_agg(to_jsonb(m) order by id) from mensajes_chat m))`);

  assert.equal(await sql('select count(*) from apuestas_sala'), '0');
  // Datos de prueba locales: se omiten triggers de negocio solo al sembrar y
  // retirar fixtures. Las comprobaciones de acceso usan RLS y triggers reales.
  await sql(`begin; set local session_replication_role=replica;
    insert into salas(id,nombre,cuota,cupo,estado) values
      ('${r1}','QA índices y permisos',1000,2,'en_juego'),
      ('${r2}','QA índices y permisos',1000,2,'en_juego'),
      ('${r3}','QA índices y permisos',1000,2,'terminada');
    insert into participantes_sala(sala_id,user_id) values('${r1}','${usuarios[0]}'),('${r2}','${usuarios[1]}');
    insert into partidas(sala_id,equipo_ganador,pozo,comision,premio_por_ganador) values('${r3}',1,0,0,0);
    insert into mensajes_chat(user_id,sala_id,mensaje) values
      ('${usuarios[0]}',null,'General QA'),('${usuarios[0]}','${r1}','Privado A'),('${usuarios[1]}','${r2}','Privado B');
    insert into apuestas_sala(id,sala_id,creador_id,equipo_creador,estado,aceptante_id,ganador_id,comision) values
      ${estados.map(estado => `('${randomUUID()}','${r1}','${usuarios[2]}',1,'${estado}',${['aceptada','liquidada','reembolsada'].includes(estado) ? "'"+usuarios[3]+"'" : 'null'},${estado==='liquidada'?"'"+usuarios[2]+"'":'null'},${estado==='liquidada'?100:0})`).join(',')};
    with salas_indice as (
      insert into salas(nombre,cuota,cupo,estado) select 'QA índice sintético',1000,2,'cancelada' from generate_series(1,5000) returning id
    ) insert into participantes_sala(sala_id,user_id) select id,'${usuarios[3]}' from salas_indice;
    commit; analyze participantes_sala;`);
  const anteriores = [];
  for (const [nombre, rol, id, apuestas, chat] of actores) {
    const resultado = await leer(rol, id);
    assert.equal(resultado.apuestas.length, apuestas, nombre + ': apuestas iniciales');
    assert.equal(resultado.chat.length, chat, nombre + ': chat inicial');
    anteriores.push(resultado);
  }
  const insertAntes = [];
  for (const [rol,id,autor,sala,esperado] of inserciones) {
    const permitido = await escribir(rol,id,autor,sala); assert.equal(permitido,esperado); insertAntes.push(permitido);
  }
  const aclAntes = await permisos(), datosAntes = await datos();
  const explicar = async () => JSON.parse(await sql(`explain (analyze,buffers,format json) select sala_id from participantes_sala where user_id='${usuarios[0]}'`))[0];
  const planAntes = await explicar();
  await caso('si falta la política pública de respaldo, todo el cambio se revierte', async () => {
    await assert.rejects(sql('begin; drop policy profiles_lectura_publica on profiles;\n' + migracion + '\ncommit;'), /Falta la política pública esperada/);
    assert.equal(await sql("select count(*) from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_lectura_publica'"), '1');
    assert.equal(await sql("select count(*) from pg_indexes where schemaname='public' and indexname='participantes_usuario_idx'"), '0');
    assert.equal(await datos(),datosAntes);
  });
  await sql('begin;\n' + migracion + '\ncommit;');

  for (let i=0;i<actores.length;i++) {
    const [nombre, rol, id] = actores[i];
    await caso('RLS equivalente antes/después: ' + nombre, async () => assert.deepEqual(await leer(rol,id),anteriores[i]));
  }
  await caso('chat: misma matriz de autor, sala, sesión y administración', async () => {
    for (let i=0;i<inserciones.length;i++) {
      const [rol,id,autor,sala] = inserciones[i]; assert.equal(await escribir(rol,id,autor,sala),insertAntes[i]);
    }
  });
  await caso('grants privados, rol y MMR conservados; Steam no se puede leer', async () => {
    assert.equal(await permisos(),aclAntes);
    for (const rol of ['anon','authenticated']) await assert.rejects(sesion(rol,usuarios[0],'select steam_id from profiles'),/permission denied|permiso/i);
  });
  const indice = (nodo, nombre) => nodo?.['Index Name']===nombre || (nodo?.Plans ?? []).some(p=>indice(p,nombre));
  await caso('consulta por usuario usa el nuevo índice con 5.002 participantes sintéticos', async () => {
    const despues = await explicar();
    assert.ok(indice(despues.Plan,'participantes_usuario_idx')); assert.equal(despues.Plan['Actual Rows'],1);
    const bloques = p => (p.Plan['Shared Hit Blocks'] ?? 0) + (p.Plan['Shared Read Blocks'] ?? 0);
    console.log(`     Plan local: ${planAntes.Plan['Node Type']} → ${despues.Plan['Node Type']}; bloques ${bloques(planAntes)} → ${bloques(despues)}`);
  });
  await caso('doce índices válidos; solo permanece la superposición de lectura del chat', async () => {
    assert.equal(await sql(`select count(*) from pg_index i join pg_class c on c.oid=i.indexrelid where i.indisvalid and c.relname in
      ('actividades_emisor_idx','actividades_receptor_idx','apuestas_ganador_idx','donaciones_donante_idx','donaciones_receptor_idx','mensajes_chat_usuario_idx','movimientos_creador_idx','participantes_usuario_idx','partidas_cerrada_por_idx','recargas_revisor_idx','retiros_procesador_idx','salas_creador_idx')`),'12');
    assert.equal(await sql(`select string_agg(tablename||':'||cmd,',' order by tablename,cmd) from (
      select tablename,cmd from pg_policies where schemaname='public' and permissive='PERMISSIVE'
      and (roles @> array['public']::name[] or roles @> array['authenticated']::name[]) group by tablename,cmd having count(*)>1
    ) p`),'mensajes_chat:SELECT');
  });
  await caso('migración idempotente sin alterar saldos, apuestas ni mensajes', async () => {
    await sql('begin;\n' + migracion + '\ncommit;');
    assert.equal(await datos(),datosAntes); assert.equal(await permisos(),aclAntes);
  });
  await sql(`begin; set local session_replication_role=replica;
    delete from apuestas_sala where sala_id='${r1}';
    delete from mensajes_chat where mensaje in ('General QA','Privado A','Privado B');
    delete from participantes_sala where sala_id in(select id from salas where nombre in ('QA índices y permisos','QA índice sintético'));
    delete from partidas where sala_id='${r3}';
    delete from salas where nombre in ('QA índices y permisos','QA índice sintético'); commit;`);
}
