#!/usr/bin/env node
// PostgreSQL desechable, sin conectarse a Supabase ni cargar .env.local.
// PG_BIN puede apuntar al directorio bin de PostgreSQL 16+.
import { spawn } from 'node:child_process';
import { appendFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import net from 'node:net';
import {prepararSchemaReal} from './schema-real.mjs';
import {verificarOptimizacionDB} from './optimizacion-db.mjs';
const real=process.argv.includes('--schema-real');

const bin = process.env.PG_BIN ?? (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '/usr/bin');
const temporal = await mkdtemp(path.join(tmpdir(), 'kodigodota-apuestas-'));
const data = path.join(temporal, 'data');
const exe = (nombre) => path.join(bin, nombre + (process.platform === 'win32' ? '.exe' : ''));
function ejecutar(programa, args, entrada) {
  return new Promise((resolve, reject) => {
    const hijo = spawn(exe(programa), args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    hijo.stdout.on('data', (b) => { out += b; });
    hijo.stderr.on('data', (b) => { err += b; });
    hijo.on('error', reject);
    // En Windows postgres hereda los pipes de pg_ctl aunque el launcher salga.
    hijo.on('exit', (codigo) => {
      if (programa !== 'pg_ctl') return;
      hijo.stdout.destroy(); hijo.stderr.destroy();
      if (codigo === 0) resolve(out.trim()); else reject(new Error(err || out));
    });
    hijo.on('close', (codigo) => codigo === 0 ? resolve(out.trim()) : reject(new Error(err || out || `${programa}: ${codigo}`)));
    hijo.stdin.end(entrada);
  });
}
const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => { const p = server.address().port; server.close(() => resolve(p)); });
});
const sql = (texto) => ejecutar('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', 'postgres'], texto);
const sesion = (id, texto) => sql(`set request.jwt.claim.sub = '${id}'; set role authenticated; ${texto}`);
const falla = async (promesa, patron) => { await assert.rejects(promesa, patron); };
const u = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
let total = 0;
async function caso(nombre, fn) { await fn(); total++; console.log(`[ok] ${nombre}`); }
const balance = async (id) => Number(await sql(`select public._saldo_de('${id}');`));
const sala = async (estado = 'en_juego') => {
  const id = randomUUID();
  await sql(real ? `insert into salas(id,nombre,estado,cuota,cupo,iniciada_at) values ('${id}', 'QA apuestas local', '${estado}',1000,2,clock_timestamp());` : `insert into salas(id,nombre,estado) values ('${id}', 'QA apuestas local', '${estado}');`);
  return id;
};
const oferta = async (id, room, equipo = 1, request = randomUUID()) => {
  await sesion(id, `select crear_apuesta_sala('${room}',${equipo},'${request}');`);
  return request;
};
const aceptar = (id, bet) => sesion(id, `select aceptar_apuesta_sala('${bet}');`);
const cancelar = (id, bet) => sesion(id, `select cancelar_apuesta_sala('${bet}');`);
const estado = (bet) => sql(`select estado from apuestas_sala where id='${bet}';`);
const insertarResultado = (r,equipo) => real
  ? `insert into partidas(sala_id,equipo_ganador,pozo,comision,premio_por_ganador) values ('${r}',${equipo},0,0,0);`
  : `insert into partidas(sala_id,equipo_ganador) values ('${r}',${equipo});`;
let iniciado = false;
try {
  await ejecutar('initdb', ['-D', data, '-U', 'postgres', '-A', 'trust', '--encoding=UTF8', '--no-locale']);
  // Todas las conexiones del harness usan TCP local. En Linux el socket Unix
  // predeterminado puede apuntar a un directorio reservado al usuario postgres.
  await appendFile(path.join(data, 'postgresql.conf'), "\nunix_socket_directories = ''\n");
  const registro = path.join(temporal, 'postgres.log');
  try {
    await ejecutar('pg_ctl', ['-D', data, '-l', registro, '-o', `-h 127.0.0.1 -p ${port} -c wal_level=logical`, '-w', 'start']);
  } catch (error) {
    const log = await readFile(registro, 'utf8').catch(() => 'Registro no disponible.');
    throw new Error(`No se pudo iniciar PostgreSQL de QA.\n${log}`, { cause: error });
  }
  iniciado = true;
  if(real) await prepararSchemaReal(sql,u);
  else await sql(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create table profiles(id uuid primary key, nick text, steam_avatar_url text, baneado boolean default false, rol text default 'jugador');
    create table salas(id uuid primary key, nombre text, estado text not null, creado_por uuid, picks_estado text default 'inactivo');
    create table partidas(id uuid primary key default gen_random_uuid(), sala_id uuid unique references salas(id), equipo_ganador integer not null check(equipo_ganador in(1,2)), duracion_segundos integer);
    create table movimientos_billetera(id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id), tipo text, monto integer, referencia_id uuid, descripcion text, creado_por uuid);
    create table notificaciones(id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id), tipo text, mensaje text);
    create table auth.users(id uuid primary key);
    create table recargas(user_id uuid); create table retiros(user_id uuid);
    create table mensajes_chat(user_id uuid,sala_id uuid);
    create table participantes_sala(user_id uuid,sala_id uuid);
    create table lobbies(sala_id uuid);
    create function public.es_admin() returns boolean language sql stable security definer as $$ select coalesce((select rol='admin' from profiles where id=auth.uid()),false) $$;
    revoke all on function public.es_admin() from public,anon;
    grant execute on function public.es_admin() to authenticated;
    create function public._saldo_de(p_user uuid) returns integer language sql volatile security definer as $$ select coalesce(sum(monto),0)::integer from movimientos_billetera where user_id=p_user $$;
    grant select(id,nick,steam_avatar_url) on profiles to anon,authenticated;
    create publication supabase_realtime;
    insert into profiles(id,nick,rol) values ${u.map((id,i) => `('${id}', 'qa-local-${i}', '${i===4 ? 'admin' : 'jugador'}')`).join(',')};
    insert into movimientos_billetera(user_id,tipo,monto) select id,'recarga',10000 from profiles;
  `);
  const migracion = await readFile('docs/sql/2026-10-23-apuestas-salas.sql', 'utf8');
  const ampliacion = await readFile('docs/sql/2026-10-23-apuestas-publicas-sin-limite.sql', 'utf8');
  if(!real) await sql(migracion);
  await sql(ampliacion);
  if(real){
    await sql(await readFile('docs/sql/2026-10-23-historial-y-consultas.sql','utf8'));
    await sql(await readFile('docs/sql/2026-10-23-frecuencia-apuestas.sql','utf8'));
    await sql(await readFile('docs/sql/2026-10-23-verificacion-rondas.sql','utf8'));
    await sql(await readFile('docs/sql/2026-10-23-verificacion-rondas.sql','utf8'));
    await verificarOptimizacionDB(sql,u,caso);
    await caso('verificación: entrada parcial, solicitud manual, ronda completa y sala vacía', async()=>{
      const r=randomUUID();
      const actores=Array.from({length:10},()=>randomUUID());
      await sql(`insert into salas(id,nombre,cupo,cuota,estado,modalidad) values('${r}','QA verificación',10,1000,'abierta','5v5');`);
      for(const id of actores) await sql(`insert into auth.users(id) values('${id}'); insert into profiles(id,nick,mmr) values('${id}','qa-ver-${id.slice(0,8)}',4500);`);
      const entrar=id=>sql(`insert into participantes_sala(sala_id,user_id) values('${r}','${id}');`);
      const verificar=()=>sql(`select verificacion_estado from salas where id='${r}';`);
      await entrar(actores[0]);
      assert.equal(await verificar(),'inactiva');
      await falla(sesion(actores[0],`select admin_pedir_verificacion('${r}');`),/Solo administradores/);
      await sesion(u[4],`select admin_pedir_verificacion('${r}');`);
      assert.equal(await verificar(),'pendiente');
      await sesion(actores[0],`select confirmar_verificacion('${r}');`);
      assert.equal(await verificar(),'completa');
      await entrar(actores[1]);
      assert.equal(await verificar(),'completa','No reabre una solicitud completada al entrar en sala incompleta');
      await sql(`delete from participantes_sala where sala_id='${r}';`);
      assert.equal(await verificar(),'inactiva');
      for(const id of actores) await entrar(id);
      assert.equal(await verificar(),'pendiente');
      assert.equal(await sql(`select verificacion_origen from salas where id='${r}';`),'automatica');
      await sql(`delete from participantes_sala where sala_id='${r}' and user_id='${actores[0]}';`);
      assert.equal(await verificar(),'inactiva','Si deja de estar llena se retira la ronda automática');
      await entrar(actores[0]);
      assert.equal(await verificar(),'pendiente');
      await sql(`delete from participantes_sala where sala_id='${r}';`);
      await entrar(actores[0]);
      await sesion(u[4],`select admin_pedir_verificacion('${r}');`);
      await entrar(actores[1]);
      assert.equal(await verificar(),'pendiente','La solicitud manual vigente sí admite a nuevos participantes');
      await sql(`delete from participantes_sala where sala_id='${r}' and user_id='${actores[1]}';`);
      assert.equal(await verificar(),'pendiente','Salir no cancela una solicitud manual con jugadores restantes');
      await sql(`delete from participantes_sala where sala_id='${r}';`);
      assert.equal(await verificar(),'inactiva');
    });
  }
  await caso('migración idempotente, incluida publicación Realtime', async () => {
    await sql(ampliacion);
    assert.equal(await sql("select count(*) from pg_publication_tables where tablename='apuestas_sala';"), '1');
  });
  const room = await sala();
  let bet;
  await caso('oferta pendiente no cobra; reintento no duplica', async () => {
    const antes = await balance(u[0]);
    bet = await oferta(u[0],room);
    await oferta(u[0],room,1,bet);
    assert.equal(await balance(u[0]),antes);
    assert.equal(await estado(bet),'pendiente');
    assert.equal(await sql(`select count(*) from apuestas_sala where id='${bet}';`),'1');
    const otra = await oferta(u[0],room);
    assert.notEqual(otra,bet);
    await cancelar(u[0],otra);
  });
  await caso('sin límite de ofertas simultáneas, incluso más de una página', async () => {
    const antes=await balance(u[0]);
    await sesion(u[0],`select crear_apuesta_sala('${room}',1,gen_random_uuid()) from generate_series(1,65);`);
    assert.equal(await sql(`select count(*) from apuestas_sala where creador_id='${u[0]}' and sala_id='${room}' and estado='pendiente';`),'66');
    assert.equal(await balance(u[0]),antes);
    await sesion(u[0],`select cancelar_apuesta_sala(id) from apuestas_sala where creador_id='${u[0]}' and sala_id='${room}' and estado='pendiente' and id<>'${bet}';`);
  });
  await caso('permisos: anon, escrituras directas, autoaceptación y cancelación ajena', async () => {
    await falla(sql(`set role anon; select crear_apuesta_sala('${room}',1,'${randomUUID()}');`), /permission denied|permiso denegado/i);
    await falla(sql('set role anon; select * from apuestas_sala;'), /permission denied|permiso denegado/i);
    await falla(sesion(u[1], `update apuestas_sala set estado='liquidada' where id='${bet}';`), /permission denied|permiso denegado/i);
    await falla(sesion(u[1], `select resolver_apuestas_sala('${room}',1);`), /permission denied|permiso denegado/i);
    await falla(aceptar(u[0],bet), /propia apuesta/);
    await falla(cancelar(u[1],bet), /propias ofertas/);
    await falla(sql(`select crear_apuesta_sala('${room}',1,'${randomUUID()}');`), /iniciar sesi/);
  });
  await caso('errores: lado inválido, sala inexistente y sala fuera de juego', async () => {
    await falla(oferta(u[1],room,3), /Selecciona/);
    await falla(oferta(u[1],randomUUID()), /no existe/);
    await falla(oferta(u[1],await sala('abierta')), /durante la partida/);
  });
  await caso('aceptación simultánea: solo un rival y dos aportes; reintento sin recobro', async () => {
    const resultados = await Promise.allSettled([aceptar(u[1],bet), aceptar(u[2],bet)]);
    assert.equal(resultados.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(await sql(`select count(*) from movimientos_billetera where referencia_id='${bet}' and tipo='apuesta_aporte';`),'2');
    const rival = await sql(`select aceptante_id from apuestas_sala where id='${bet}';`);
    const antes = await balance(rival);
    await aceptar(rival,bet);
    assert.equal(await balance(rival),antes);
    await falla(cancelar(u[0],bet), /sin aceptar/);
    assert.equal(await estado(bet),'aceptada');
  });
  await caso('RLS: los cruces confirmados son públicos, con nick y avatar, sin comisión', async () => {
    assert.equal(await sesion(u[3],`select count(*) from apuestas_sala where id='${bet}';`),'1');
    assert.equal(await sesion(u[0],`select count(*) from apuestas_sala where id='${bet}';`),'1');
    assert.equal(await sesion(u[4],`select count(*) from apuestas_sala where id='${bet}';`),'1');
    assert.equal(await sql(`set role anon; select count(id) from apuestas_sala where id='${bet}';`),'1');
    assert.ok((await sql(`set role anon; select c.nick || ' vs ' || r.nick from apuestas_sala a join profiles c on c.id=a.creador_id join profiles r on r.id=a.aceptante_id where a.id='${bet}';`)).includes(' vs '));
    await falla(sql('set role anon; select comision from apuestas_sala;'), /permission denied|permiso denegado/i);
    await falla(sesion(u[0],'select comision from apuestas_sala;'), /permission denied|permiso denegado/i);
    const privada=await oferta(u[3],room);
    assert.equal(await sql(`set role anon; select count(id) from apuestas_sala where id='${privada}';`),'0');
    await cancelar(u[3],privada);
  });
  await caso('cierre: paga S/ 10.00 una vez, cobra S/ 1.00 de comisión y expira ofertas', async () => {
    const pendiente = await oferta(u[3],room,2);
    const antes = await balance(u[0]);
    await sql(`begin; update salas set estado='terminada' where id='${room}'; ${insertarResultado(room,1)} commit;`);
    assert.equal(await balance(u[0]),antes+1000);
    assert.equal(await estado(bet),'liquidada');
    assert.equal(await estado(pendiente),'expirada');
    assert.equal(await sql(`select sum(monto) from movimientos_billetera where referencia_id='${bet}';`),'-100');
    await sql(`update partidas set duracion_segundos=100 where sala_id='${room}';`);
    assert.equal(await balance(u[0]),antes+1000);
    assert.equal(await sesion(u[4], 'select ganancias_apuestas_casa();'),'100');
    await falla(sesion(u[0], 'select ganancias_apuestas_casa();'), /administradores/);
    await falla(sql(`update partidas set equipo_ganador=2 where sala_id='${room}';`), /resultado con apuestas/);
    await falla(sql(`delete from partidas where sala_id='${room}';`), /resultado con apuestas/);
    await falla(oferta(u[1],room), /durante la partida/);
  });
  await caso('cancelación: reembolsa ambos aportes una sola vez y expira pendientes', async () => {
    const r = await sala(); const b = await oferta(u[0],r); const abierta = await oferta(u[2],r,2);
    const antes = await balance(u[0]); const antesRival = await balance(u[1]);
    await aceptar(u[1],b);
    await sql(`update salas set estado='cancelada' where id='${r}';`);
    assert.equal(await balance(u[0]),antes); assert.equal(await balance(u[1]),antesRival);
    assert.equal(await estado(b),'reembolsada'); assert.equal(await estado(abierta),'expirada');
    await sql(`update salas set estado='cancelada' where id='${r}';`);
    assert.equal(await balance(u[0]),antes);
    assert.equal(await sql(`select sum(monto) from movimientos_billetera where referencia_id='${b}';`),'0');
  });
  await caso('victoria de Dire paga al aceptante, también si el resultado se inserta primero', async () => {
    const r = await sala(); const b = await oferta(u[0],r,1);
    await aceptar(u[1],b); const antes = await balance(u[1]);
    await sql(`begin; ${insertarResultado(r,2)} update salas set estado='terminada' where id='${r}'; commit;`);
    assert.equal(await balance(u[1]),antes+1000);
    assert.equal(await sql(`select ganador_id from apuestas_sala where id='${b}';`),u[1]);
    assert.equal(await sql(`select count(*) from movimientos_billetera where referencia_id='${b}' and tipo='apuesta_premio';`),'1');
  });
  await caso('cancelar una oferta pendiente no mueve dinero y admite reintentos', async () => {
    const r = await sala(); const b = await oferta(u[0],r); const antes = await balance(u[0]);
    await cancelar(u[0],b); await cancelar(u[0],b);
    assert.equal(await estado(b),'cancelada'); assert.equal(await balance(u[0]),antes);
    await falla(aceptar(u[1],b), /disponible/);
  });
  await caso('saldo insuficiente del creador al aceptar no cobra al rival', async () => {
    const r = await sala(); const b = await oferta(u[2],r);
    await sql(`insert into movimientos_billetera(user_id,tipo,monto) values ('${u[2]}','retiro',${549-await balance(u[2])});`);
    const antes = await balance(u[1]);
    await falla(aceptar(u[1],b), /creador.*saldo/);
    assert.equal(await balance(u[1]),antes); assert.equal(await estado(b),'pendiente');
    await falla(oferta(u[2],await sala()), /Necesitas S\/ 5.50/);
    const otra = await oferta(u[0],r);
    await falla(aceptar(u[2],otra), /Necesitas S\/ 5.50/);
  });
  await caso('cuenta baneada no puede crear ni aceptar', async () => {
    await sql(`update profiles set baneado=true where id='${u[3]}';`);
    const r = await sala(); const b = await oferta(u[0],r);
    await falla(oferta(u[3],r), /cuenta no puede/);
    await falla(aceptar(u[3],b), /cuentas no puede/);
    await sql(`update profiles set baneado=false where id='${u[3]}';`);
  });
  await caso('dos débitos simultáneos de distintas operaciones no dejan saldo negativo', async () => {
    const antes = await balance(u[3]);
    const debitar = () => sql(`insert into movimientos_billetera(user_id,tipo,monto) values ('${u[3]}','retiro',-${antes});`);
    const resultados = await Promise.allSettled([debitar(),debitar()]);
    assert.equal(resultados.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(await balance(u[3]),0);
    await sql(`insert into movimientos_billetera(user_id,tipo,monto) values ('${u[3]}','recarga',10000);`);
  });
  await caso('cierre simultáneo con aceptación deja un resultado financiero consistente', async () => {
    const r = await sala(); const b = await oferta(u[0],r,2);
    const resultados = await Promise.allSettled([
      aceptar(u[3],b),
      sql(`begin; select id from salas where id='${r}' for update; select pg_sleep(0.15); ${insertarResultado(r,2)} update salas set estado='terminada' where id='${r}'; commit;`),
    ]);
    assert.equal(resultados[1].status,'fulfilled');
    const actual = await estado(b);
    assert.ok(['liquidada','expirada'].includes(actual));
    assert.equal(await sql(`select coalesce(sum(monto),0) from movimientos_billetera where referencia_id='${b}';`), actual==='liquidada' ? '-100' : '0');
    console.log(`     Resultado de la carrera: ${actual}`);
  });
  await caso('caso vacío: cerrar una sala sin apuestas no altera la billetera', async () => {
    const r = await sala(); const antes = await balance(u[0]);
    await sql(`${insertarResultado(r,2)} update salas set estado='terminada' where id='${r}';`);
    assert.equal(await balance(u[0]),antes);
  });
  await caso('ofertas en distintas salas no pueden gastar dos veces el saldo del creador', async () => {
    const r1=await sala(), r2=await sala();
    const b1=await oferta(u[3],r1), b2=await oferta(u[3],r2);
    const actual=await balance(u[3]);
    await sql(`insert into movimientos_billetera(user_id,tipo,monto) values ('${u[3]}','retiro',${550-actual});`);
    const resultados=await Promise.allSettled([aceptar(u[0],b1),aceptar(u[1],b2)]);
    assert.equal(resultados.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(await balance(u[3]),0);
    await sql(`update salas set estado='cancelada' where id in ('${r1}','${r2}');`);
    assert.equal(await balance(u[3]),550);
  });
  if(real){
    await caso('ventana real: rechaza oferta y aceptación a los 25 minutos sin cobros',async()=>{
      const r=await sala(),b=await oferta(u[0],r),antes=await balance(u[0]),rival=await balance(u[1]);
      await sql(`update salas set iniciada_at=clock_timestamp()-interval '25 minutes' where id='${r}';`);
      await falla(aceptar(u[1],b),/Apuestas cerradas/);
      await falla(oferta(u[1],r),/Apuestas cerradas/);
      assert.equal(await balance(u[0]),antes);assert.equal(await balance(u[1]),rival);
    });
    await caso('donación y retiro reales: reintentos idempotentes, datos y permisos',async()=>{
      const b=await balance(u[0]),peticion=randomUUID(),retiro=randomUUID();
      for(let n=0;n<2;n++)await sesion(u[0],`select donar_saldo_seguro('${u[1]}',100,'local','${peticion}');`);
      assert.equal(await balance(u[0]),b-100);
      await falla(sesion(u[0],`select donar_saldo_seguro('${u[1]}',200,'local','${peticion}');`),/incompatible/);
      for(let n=0;n<2;n++)await sesion(u[0],`select solicitar_retiro_seguro(500,'999999999','${retiro}');`);
      assert.equal(await balance(u[0]),b-600);
      await falla(sql(`set role anon;select solicitar_retiro_seguro(500,'999999999','${randomUUID()}');`),/permission denied/i);
    });
    await caso('cuotas, multa canónica y wrapper, partida y apuesta con funciones reales',async()=>{
      const actores=[u[0],u[1],...Array.from({length:8},()=>randomUUID())];
      for(let i=0;i<actores.length;i++){
        const id=actores[i];
        if(i>=2)await sql(`insert into auth.users(id)values('${id}');insert into profiles(id,nick,mmr)values('${id}','qa-extra-${i}',4500);insert into movimientos_billetera(user_id,tipo,monto)values('${id}','recarga',10000);`);
        await sql(`update profiles set steam_id='${76561198000000000n+BigInt(i)}' where id='${id}';`);
      }
      const r=randomUUID();
      await sql(`insert into salas(id,nombre,cuota,cupo,comision_bp,estado,creado_por)values('${r}','QA flujo completo',1000,10,1000,'abierta','${u[4]}');`);
      for(const id of actores)await sesion(id,`select unirse_a_sala('${r}');`);
      assert.equal(await sql(`select estado from salas where id='${r}';`),'llena');
      const antes=await balance(u[0]);await sesion(u[0],`select salir_de_sala('${r}');`);
      assert.equal(await balance(u[0]),antes+800);
      assert.equal(await sesion(u[1],`select salir_de_sala_con_multa('${r}');`),'0');
      await sesion(u[0],`select unirse_a_sala('${r}');`);await sesion(u[1],`select unirse_a_sala('${r}');`);
      const rival=await balance(u[1]);assert.equal(await sesion(u[1],`select salir_de_sala_con_multa('${r}');`),'200');
      assert.equal(await balance(u[1]),rival+800);await sesion(u[1],`select unirse_a_sala('${r}');`);
      for(let i=0;i<actores.length;i++)await sql(`update participantes_sala set equipo=${i<5?1:2} where sala_id='${r}' and user_id='${actores[i]}';`);
      await sql(`update salas set estado='en_juego' where id='${r}';insert into movimientos_billetera(user_id,tipo,monto)values('${u[3]}','recarga',2000);`);
      await falla(oferta(u[0],r),/jugadores de esta partida/);
      await falla(sesion(u[0],`select admin_configurar_cierre('${r}',false,null);`),/administradores/);
      const b=await oferta(u[3],r);await aceptar(u[4],b);
      const jugador=await balance(u[0]),apostador=await balance(u[3]);
      await sesion(u[4],`select cerrar_partida('${r}',90000001,1::smallint);`);
      assert.equal(await balance(u[0]),jugador+1800);assert.equal(await balance(u[3]),apostador+1000);
      assert.equal(await estado(b),'liquidada');
      await falla(sesion(u[4],`select cerrar_partida('${r}',90000001,1::smallint);`),/en juego/);
    });
    await caso('protección de ráfagas sin límite acumulado de ofertas',async()=>{
      const id=randomUUID(),r=await sala();
      await sql(`insert into auth.users(id)values('${id}');insert into profiles(id,nick)values('${id}','qa-ritmo');insert into movimientos_billetera(user_id,tipo,monto)values('${id}','recarga',10000);`);
      await sesion(id,`select crear_apuesta_sala('${r}',1,gen_random_uuid()) from generate_series(1,120);`);
      await falla(oferta(id,r),/Demasiadas solicitudes/);
      assert.equal(await sql(`select count(*) from apuestas_sala where creador_id='${id}';`),'120');
      await sql(`update frecuencia_apuestas set desde=clock_timestamp()-interval '11 seconds' where user_id='${id}';`);
      await oferta(id,r);assert.equal(await sql(`select count(*) from apuestas_sala where creador_id='${id}';`),'121');
      assert.equal(await balance(id),10000);
    });
    await caso('historial completo: saldo posterior, paginación y privacidad propios',async()=>{
      const historial=JSON.parse(await sesion(u[0],`select mi_billetera_historial(0,2);`));
      assert.equal(historial.movimientos.length,2);
      assert.equal(Number(historial.movimientos[0].saldo_posterior),await balance(u[0]));
      assert.ok(historial.total>2);
      const otra=JSON.parse(await sesion(u[0],`select mi_billetera_historial(1,2);`));
      assert.notEqual(otra.movimientos[0].id,historial.movimientos[0].id);
      await falla(sesion(u[0],`select mi_billetera_historial(-1,2);`),/inválida/);
      await falla(sql(`set role anon;select mi_billetera_historial(0,2);`),/permission denied/i);
      assert.equal(await sesion(u[0],`select count(*) from movimientos_billetera where user_id='${u[1]}';`),'0');
      assert.equal(await sql("select reloptions::text from pg_class where oid='public.perfiles_publicos'::regclass;"),'{security_invoker=true}');
    });
  }
  await caso('qa_cleanup elimina las apuestas QA antes de los resultados protegidos', async () => {
    await falla(sesion(u[0],'select qa_cleanup();'), /permission denied|permiso denegado/i);
    await sql('set role service_role; select qa_cleanup();');
    assert.equal(await sql('select count(*) from apuestas_sala;'),'0');
    assert.equal(await sql('select count(*) from profiles;'),'0');
  });
  console.log(`\n${total}/${total} casos OK en PostgreSQL local. Supabase no fue modificado.`);
} finally {
  if (iniciado) await ejecutar('pg_ctl', ['-D', data, '-m', 'immediate', '-w', 'stop']);
  const relativo = path.relative(tmpdir(), temporal);
  if (!relativo.startsWith('..') && !path.isAbsolute(relativo) && path.basename(temporal).startsWith('kodigodota-apuestas-')) {
    await rm(temporal, { recursive: true, force: true });
  }
}
