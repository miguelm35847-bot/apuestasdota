import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

/** Solo usa el PostgreSQL desechable del harness, sin red ni .env.local. */
export async function verificarPremiosSala(sql, usuarios, caso) {
  const admin = usuarios[4];
  const sesion = (id, texto) => sql(`set request.jwt.claim.sub='${id}'; set role authenticated; ${texto}`);
  const saldo = async id => Number(await sql(`select public._saldo_de('${id}');`));
  const falla = (operacion, patron) => assert.rejects(operacion, patron);
  const crear = (cuota, premio, cupo = 10) => sesion(admin,
    `select public.crear_sala_con_premio('QA premios fijos',${cuota},${cupo},${premio});`);
  const editar = (id, cuota, premio, actor = admin) => sesion(actor,
    `select public.admin_actualizar_importes_sala('${id}',${cuota},${premio});`);
  const entrar = (actor, id, cuota, premio) => sesion(actor,
    `select public.unirse_a_sala_con_importes('${id}',${cuota},${premio});`);
  const actores = Array.from({ length: 10 }, () => randomUUID());
  for (const [i, id] of actores.entries()) {
    await sql(`insert into auth.users(id) values('${id}');
      insert into profiles(id,nick,rol,mmr,steam_id) values('${id}','qa-premios-${i}','jugador',4000,'${76561198000100000n + BigInt(i)}');
      insert into movimientos_billetera(user_id,tipo,monto) values('${id}','recarga',100000);`);
  }
  await caso('premios: crear y editar solo como administrador; anon y escritura directa rechazados', async () => {
    const id = await crear(1100, 2000);
    await falla(sesion(actores[0], `select public.crear_sala_con_premio('QA',1100,10,2000);`), /Solo administradores/);
    await falla(editar(id, 600, 1000, actores[0]), /Solo administradores/);
    await falla(sql(`set role anon; select public.crear_sala_con_premio('QA',1100,10,2000);`), /permission denied/i);
    await falla(sql(`set role anon; select public.admin_actualizar_importes_sala('${id}',600,1000);`), /permission denied/i);
    await falla(sql(`set role anon; select public.unirse_a_sala_con_importes('${id}',1100,2000);`), /permission denied/i);
    try { await sesion(actores[0], `update public.salas set premio_por_ganador=9999 where id='${id}';`); }
    catch (error) { assert.match(error.message,/permission denied/i); }
    assert.equal(await sql(`select cuota||'|'||premio_por_ganador from salas where id='${id}';`), '1100|2000');
  });
  await caso('premios: importes vacíos, negativos, fuera de rango y cupos inválidos se rechazan', async () => {
    for (const [cuota, premio, cupo] of [[99,1000,10],[-100,1000,10],['null',1000,10],[600,0,10],[600,-1,10],[600,'null',10],[600,1000,3],[600,1000,'null'],['900719925474100',1000,10],[600,'900719925474100',10]]) {
      await falla(crear(cuota, premio, cupo), /inválid/i);
    }
    await falla(sesion(admin, `select public.crear_sala_con_premio(' ',600,10,1000);`), /nombre/);
    await falla(editar(randomUUID(),600,1000), /no existe/);
  });
  await caso('premios: una sala anterior vacía puede pasar a premio fijo y bono', async () => {
    const id = await sesion(admin, `select crear_sala('QA anterior',1000,10,1500);`);
    assert.equal(await sql(`select premio_por_ganador is null from salas where id='${id}';`), 't');
    await editar(id,600,1500);
    assert.equal(await sql(`select cuota||'|'||premio_por_ganador||'|'||comision_bp from salas where id='${id}';`), '600|1500|0');
    await sesion(admin, `select cancelar_sala('${id}');`);
    await falla(editar(id,600,1000), /sala abierta/);
  });
  await caso('premios: cambios de cuota o premio invalidan la entrada antigua sin cobrar', async () => {
    const id = await crear(1100,2000,2), antes = await saldo(actores[0]);
    await editar(id,600,1000);
    await falla(entrar(actores[0],id,1100,2000), /importes.*cambiaron/);
    await falla(entrar(actores[0],id,600,2000), /importes.*cambiaron/);
    await falla(entrar(actores[0],id,'null',1000), /importes.*cambiaron/);
    assert.equal(await saldo(actores[0]),antes);
    await entrar(actores[0],id,600,1000);
    assert.equal(await saldo(actores[0]),antes-600);
    await falla(editar(id,1100,2000), /jugadores inscritos/);
    await sesion(admin, `select cancelar_sala('${id}');`);
    assert.equal(await saldo(actores[0]),antes);
  });
  await caso('premios: edición y primera entrada concurrentes no cambian lo aceptado ni cobran de más', async () => {
    const id = await crear(1100,2000,2), antes = await saldo(actores[0]);
    const resultado = await Promise.allSettled([editar(id,600,1000), entrar(actores[0],id,1100,2000)]);
    assert.equal(resultado.filter(r=>r.status==='fulfilled').length,1);
    if (resultado[0].status === 'fulfilled') {
      assert.match(resultado[1].reason.message,/importes.*cambiaron/);
      assert.equal(await saldo(actores[0]),antes);
      assert.equal(await sql(`select count(*) from participantes_sala where sala_id='${id}';`),'0');
    } else {
      assert.match(resultado[0].reason.message,/jugadores inscritos/);
      assert.equal(await saldo(actores[0]),antes-1100);
      assert.equal(await sql(`select cuota from salas where id='${id}';`),'1100');
    }
    await sesion(admin, `select cancelar_sala('${id}');`);
  });
  await caso('premios: sala vacía y cierre sin permisos no generan premios', async () => {
    const id = await crear(600,1000,2);
    await sql(`update salas set estado='en_juego' where id='${id}';`);
    await falla(sesion(actores[0],`select cerrar_partida('${id}',null,1::smallint);`),/Solo administradores/);
    await falla(sesion(admin,`select cerrar_partida('${id}',null,1::smallint);`),/Faltan jugadores/);
    assert.equal(await sql(`select count(*) from movimientos_billetera where referencia_id='${id}';`),'0');
    await falla(editar(id,600,1500),/sala abierta/);
    await sesion(admin, `select cancelar_sala('${id}');`);
  });
  const repartos = [
    [2,1100,2000,200], [10,600,1000,1000],
    [2,600,1200,0], [10,600,1200,0],
    [2,600,1500,-300], [10,600,1500,-1500], [10,1001,2003,-5],
  ];
  for (const [i, [cupo,cuota,premio,casa]] of repartos.entries()) {
    await caso(`premios: ${cupo===2?'1v1':'5v5'} cuota ${cuota}, premio ${premio}, casa ${casa} céntimos`, async () => {
      const id = await crear(cuota,premio,cupo);
      const iniciales = await Promise.all(actores.slice(0,cupo).map(saldo));
      for (const actor of actores.slice(0,cupo)) await entrar(actor,id,cuota,premio);
      for (const [n,actor] of actores.slice(0,cupo).entries()) {
        await sql(`update participantes_sala set equipo=${n<cupo/2?1:2} where sala_id='${id}' and user_id='${actor}';`);
      }
      await falla(editar(id,cuota,premio+1),/sala abierta|jugadores inscritos/);
      await sql(`update salas set estado='en_juego' where id='${id}';`);
      const gananciaAntes = Number(await sesion(admin,'select ganancias_casa();'));
      const cierres = await Promise.allSettled([0,1].map(()=>sesion(admin,`select cerrar_partida('${id}',${93000000+i},1::smallint);`)));
      assert.equal(cierres.filter(c=>c.status==='fulfilled').length,1);
      for (const [n,actor] of actores.slice(0,cupo).entries()) assert.equal(await saldo(actor),iniciales[n]-cuota+(n<cupo/2?premio:0));
      assert.equal(await sql(`select pozo||'|'||comision||'|'||premio_por_ganador from partidas where sala_id='${id}';`),`${cuota*cupo}|${casa}|${premio}`);
      assert.equal(Number(await sesion(admin,'select ganancias_casa();'))-gananciaAntes,casa);
      assert.equal(await sql(`select count(*) from movimientos_billetera where referencia_id='${id}' and tipo='premio';`),String(cupo/2));
    });
  }
  await caso('premios: salas anteriores conservan comisión y redondeo al cerrar', async () => {
    const id = await sesion(admin,`select crear_sala('QA premio anterior',101,10,1500);`);
    for (const actor of actores) await entrar(actor,id,101,171);
    for (const [i,actor] of actores.entries()) await sql(`update participantes_sala set equipo=${i<5?1:2} where sala_id='${id}' and user_id='${actor}';`);
    await sql(`update salas set estado='en_juego' where id='${id}';`);
    await sesion(admin,`select cerrar_partida('${id}',93000100,1::smallint);`);
    assert.equal(await sql(`select pozo||'|'||comision||'|'||premio_por_ganador from partidas where sala_id='${id}';`),'1010|155|171');
  });
}
