#!/usr/bin/env node
/**
 * Fase 1: flujos reales con actores API.
 *
 *   npm run qa:flows            # 1v1 y 5v5
 *   npm run qa:flows -- 1v1
 *   npm run qa:flows -- 5v5
 *
 * Antes hay que ejecutar `npm run qa:seed`. Cada escenario crea una sala
 * "QA ..." y la cancela/elimina al terminar, incluso si una comprobación falla.
 */

import {
  ADMIN_EMAIL,
  PLAYER_EMAIL,
  actualizarPerfil,
  assert,
  cancelarSala,
  crearSala,
  definirLobby,
  fallo,
  limpiarSala,
  lobbyDe,
  login,
  notificacionesDe,
  participantesDe,
  paso,
  rest,
  rpc,
  rpcSeguro,
  salaPorId,
  saldoActor,
  unir,
} from './lib.mjs';

const objetivo = process.argv[2] ?? 'todo';
if (objetivo === '--help' || objetivo === '-h') {
  console.log('Uso: node scripts/qa/flows.mjs [1v1|5v5|todo]');
  process.exit(0);
}
if (!['1v1', '5v5', 'todo'].includes(objetivo)) {
  console.error(`Escenario desconocido: ${objetivo}`);
  process.exit(2);
}

if (!process.env.QA_PASSWORD) {
  console.error('Falta QA_PASSWORD. Ejecuta primero `npm run qa:seed`.');
  process.exit(2);
}

let fallos = 0;

function nombreSala(prefijo) {
  return `QA ${prefijo} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function tokenDe(actores, userId) {
  const actor = actores.find((a) => a.user.id === userId);
  assert(actor, `No hay token para el jugador ${userId}`);
  return actor.token;
}

async function saldos(actores) {
  return Promise.all(actores.map((a) => saldoActor(a.token)));
}

async function prepararActores() {
  const admin = await login(ADMIN_EMAIL);
  const jugadores = [];
  for (let n = 1; n <= 10; n++) {
    const sesion = await login(PLAYER_EMAIL(n));
    jugadores.push({ n, token: sesion.access_token, user: sesion.user });
  }
  return { admin, jugadores };
}

async function escenario1v1(adminToken, jugadores) {
  let salaId = null;
  let cancelada = false;
  let inicio1 = 0;
  let inicio2 = 0;

  try {
    const [p1, p2] = jugadores;

    await paso('1v1: saldos iniciales', async () => {
      inicio1 = await saldoActor(p1.token);
      inicio2 = await saldoActor(p2.token);
      assert(inicio1 >= 1000 && inicio2 >= 1000, 'saldo insuficiente; revisa `npm run qa:seed`');
      return `S/ ${(inicio1 / 100).toFixed(2)} y S/ ${(inicio2 / 100).toFixed(2)}`;
    });

    const sala = await crearSala(adminToken, {
      nombre: nombreSala('1v1'),
      cuota: 1000,
      cupo: 2,
      comisionBp: 500,
    });
    salaId = sala.id;

    await paso('1v1: la sala nace abierta y sin picks', async () => {
      assert(sala.estado === 'abierta', `estado ${sala.estado}`);
      assert(sala.modalidad === '1v1', `modalidad ${sala.modalidad}`);
      assert(sala.picks_estado === 'inactivo', `picks ${sala.picks_estado}`);
      return sala.nombre;
    });

    await paso('1v1: entra el primer jugador', async () => {
      await unir(p1.token, salaId);
      const actual = await salaPorId(salaId);
      const partes = await participantesDe(salaId);
      assert(partes.length === 1, `participantes ${partes.length}`);
      assert(actual.estado === 'abierta', `estado ${actual.estado}`);
      return `${partes.length}/2`;
    });

    await paso('1v1: al llenarse se pide la verificación "Estoy listo"', async () => {
      await unir(p2.token, salaId);
      const actual = await salaPorId(salaId);
      const partes = await participantesDe(salaId);
      assert(partes.length === 2, `participantes ${partes.length}`);
      assert(actual.estado === 'llena', `estado ${actual.estado}`);
      assert(actual.picks_estado === 'inactivo', `picks ${actual.picks_estado}`);
      assert(actual.verificacion_estado === 'pendiente', `verificación ${actual.verificacion_estado}`);
      return 'esperando a los dos listos';
    });

    await paso('1v1: cuando los dos confirman se lanza la moneda', async () => {
      await rpc(p1.token, 'confirmar_verificacion', { p_sala: salaId });
      const medio = await salaPorId(salaId);
      assert(medio.picks_estado === 'inactivo', 'la moneda se lanzó con un solo jugador listo');

      await rpc(p2.token, 'confirmar_verificacion', { p_sala: salaId });
      const actual = await salaPorId(salaId);
      const partes = await participantesDe(salaId);
      const ids = [p1.user.id, p2.user.id];
      assert(actual.verificacion_estado === 'completa', `verificación ${actual.verificacion_estado}`);
      assert(actual.picks_estado === 'eleccion', `picks ${actual.picks_estado} (¿falta sortear_1v1?)`);
      assert(actual.pick_decision_tipo === 'lado', `decisión ${actual.pick_decision_tipo}`);
      assert(ids.includes(actual.pick_decision_user_id), 'el ganador del sorteo no está en la sala');
      assert(actual.pick_capitan1 && actual.pick_capitan2, 'faltan capitanes del sorteo');
      assert(partes.every((p) => p.equipo === null), 'los equipos deberían estar sin asignar');
      return `elige ${actual.pick_decision_user_id === p1.user.id ? 'qa-p1' : 'qa-p2'}`;
    });

    await paso('1v1: el ganador elige lado y el otro queda al contrario', async () => {
      const antes = await salaPorId(salaId);
      const ganador = antes.pick_decision_user_id;
      await rpc(tokenDe(jugadores, ganador), 'elegir_lado', { p_sala: salaId, p_equipo: 1 });
      const despues = await salaPorId(salaId);
      const partes = await participantesDe(salaId);
      assert(despues.picks_estado === 'terminado', `picks ${despues.picks_estado}`);
      assert(partes.every((p) => p.equipo === 1 || p.equipo === 2), 'falta asignar un lado');
      assert(new Set(partes.map((p) => p.equipo)).size === 2, 'los dos jugadores quedaron del mismo lado');
      const elegido = partes.find((p) => p.user_id === ganador);
      assert(elegido?.equipo === 1, `el ganador quedó en equipo ${elegido?.equipo}`);
      return `ganador en Radiant, rival en Dire`;
    });

    await paso('1v1: el admin define el lobby y la sala pasa a en_juego', async () => {
      await definirLobby(adminToken, salaId, 'QA Lobby 1v1', 'qa1234');
      const actual = await salaPorId(salaId);
      const lobby = await lobbyDe(salaId, adminToken);
      assert(actual.estado === 'en_juego', `estado ${actual.estado}`);
      assert(lobby?.nombre === 'QA Lobby 1v1', 'no se guardó el nombre del lobby');
      const avisos = await notificacionesDe(p1.user.id, p1.token);
      assert(avisos.length > 0, 'el jugador no recibió notificación');
      return 'en_juego + notificación';
    });

    await paso('1v1: cancelar reembolsa a ambos', async () => {
      await cancelarSala(adminToken, salaId);
      cancelada = true;
      const actual = await salaPorId(salaId);
      assert(actual.estado === 'cancelada', `estado ${actual.estado}`);
      const [fin1, fin2] = await saldos([p1, p2]);
      assert(fin1 === inicio1, `saldo qa-p1 ${fin1} != ${inicio1}`);
      assert(fin2 === inicio2, `saldo qa-p2 ${fin2} != ${inicio2}`);
      return 'saldos restaurados';
    });
  } catch (error) {
    fallos++;
    fallo('escenario 1v1', error);
  } finally {
    if (salaId && !cancelada) {
      try {
        const modo = await limpiarSala(salaId, adminToken);
        console.log(`[info] sala 1v1 ${modo} durante la limpieza`);
      } catch (error) {
        console.error(`[FALLA] limpieza 1v1: ${error.message}`);
      }
    }
  }
}

async function escenario5v5(adminToken, jugadores) {
  let salaId = null;
  let cancelada = false;
  let saldosIniciales = [];

  try {
    await paso('5v5: saldos iniciales', async () => {
      saldosIniciales = await saldos(jugadores);
      assert(saldosIniciales.every((s) => s >= 1000), 'saldo insuficiente; revisa `npm run qa:seed`');
      return `${jugadores.length} jugadores con saldo`;
    });

    const sala = await crearSala(adminToken, {
      nombre: nombreSala('5v5'),
      cuota: 1000,
      cupo: 10,
      comisionBp: 500,
    });
    salaId = sala.id;

    await paso('5v5: entran los 10 jugadores y la sala queda llena', async () => {
      for (const jugador of jugadores) await unir(jugador.token, salaId);
      const actual = await salaPorId(salaId);
      const partes = await participantesDe(salaId);
      assert(partes.length === 10, `participantes ${partes.length}`);
      assert(actual.estado === 'llena', `estado ${actual.estado}`);
      assert(actual.picks_estado === 'inactivo', `picks ${actual.picks_estado}`);
      return '10/10 en espera';
    });

    await paso('5v5: el admin inicia los picks y se sortea la moneda', async () => {
      const [p1, p2] = jugadores;
      const ganador = await rpc(adminToken, 'iniciar_picks', {
        p_sala: salaId,
        p_capitan1: p1.user.id,
        p_capitan2: p2.user.id,
      });
      const actual = await salaPorId(salaId);
      assert(ganador === p1.user.id || ganador === p2.user.id, 'la RPC no devolvió un capitán');
      assert(actual.picks_estado === 'eleccion', `picks ${actual.picks_estado}`);
      assert(actual.pick_decision_tipo === 'moneda', `decisión ${actual.pick_decision_tipo}`);
      assert(actual.pick_decision_user_id === ganador, 'el turno de la moneda no es el ganador');
      assert(actual.pick_ganador_moneda === ganador, 'no se guardó el ganador de la moneda');
      return `gana ${ganador === p1.user.id ? 'qa-p1' : 'qa-p2'}`;
    });

    await paso('5v5: el ganador elige Radiant (pickea primero) y arranca el draft', async () => {
      const antes = await salaPorId(salaId);
      const ganador = antes.pick_decision_user_id;
      const otro = ganador === antes.pick_capitan1 ? antes.pick_capitan2 : antes.pick_capitan1;

      const decision = await rpcSeguro(tokenDe(jugadores, ganador), 'elegir_radiant_o_lastpick', {
        p_sala: salaId,
        p_opcion: 'radiant',
      });

      if (!decision.ok) {
        if (!/could not find the function|schema cache/i.test(decision.error.message)) {
          throw new Error(decision.error.message);
        }
        // Sin el SQL nuevo todavía se puede verificar el resto del draft con
        // el flujo anterior (pickear primero + el rival elige lado).
        console.log(
          '[pendiente] falta aplicar docs/sql/2026-10-21-eleccion-radiant-lastpick.sql',
        );
        await rpc(tokenDe(jugadores, ganador), 'elegir_moneda', {
          p_sala: salaId,
          p_opcion: 'pickear_primero',
        });
        await rpc(tokenDe(jugadores, otro), 'elegir_lado', { p_sala: salaId, p_equipo: 1 });
        const partes = await participantesDe(salaId);
        assert(partes.filter((p) => p.es_capitan).length === 2, 'capitanes duplicados');
        return 'draft en curso (flujo anterior)';
      }

      const despues = await salaPorId(salaId);
      const partes = await participantesDe(salaId);
      const capitan = (id) => partes.find((p) => p.user_id === id);
      assert(despues.picks_estado === 'en_curso', `picks ${despues.picks_estado}`);
      assert(despues.pick_primer_user_id === ganador, 'el primer pick no quedó en el ganador');
      assert(despues.pick_turno_user_id === ganador, 'el turno no arrancó en el ganador');
      assert(capitan(ganador)?.equipo === 1, 'el ganador no quedó en Radiant');
      assert(capitan(otro)?.equipo === 2, 'el rival no quedó en Dire');
      return 'Radiant pickea primero';
    });

    // Orden acordado del draft: R · DD · RR · DD · R
    const ordenEsperado = ['R', 'D', 'D', 'R', 'R', 'D', 'D', 'R'];
    const secuencia = [];

    // SQL del 22/10: el primero trae el helper del orden; el segundo marca a los
    // capitanes (es_capitan) y arregla el conteo de los 8 picks + el turno de 45 s.
    const sonda = await rpcSeguro(adminToken, 'siguiente_capitan_de_pick', {
      p_primer: jugadores[0].user.id,
      p_otro: jugadores[1].user.id,
      p_pick: 2,
    });
    const conOrdenNuevo = sonda.ok;
    const partesInicio = await participantesDe(salaId);
    const conCapitanes = partesInicio.filter((p) => p.es_capitan).length === 2;
    const conDraftNuevo = conOrdenNuevo && conCapitanes;

    const restanteTurno = (sala) => {
      if (!sala.pick_turno_expira_at) return null;
      return (new Date(sala.pick_turno_expira_at).getTime() - Date.now()) / 1000;
    };

    if (!conOrdenNuevo) {
      console.log(
        '[pendiente] falta aplicar ' +
          'docs/sql/2026-10-22-orden-picks-y-verificacion-anticipada.sql: ' +
          'no se valida el orden ni el 5/5 del draft',
      );
    } else if (!conCapitanes) {
      console.log(
        '[pendiente] falta aplicar docs/sql/2026-10-22-turno-45s-autopick-mmr.sql: ' +
          'el draft cuenta a los capitanes dentro de los 8 picks (reparte R-R-R-D-D y ' +
          'cierra en el pick 6) y el turno dura 60 s; no se valida el orden ni el 5/5',
      );
    }

    if (!conDraftNuevo) {
      for (let intento = 0; intento < 12; intento++) {
        const actual = await salaPorId(salaId);
        if (actual.picks_estado !== 'en_curso') break;
        await rpc(adminToken, 'auto_pickear_si_vencido', { p_sala: salaId, p_forzar: true });
      }
    } else {
      await paso('5v5: los 6 primeros picks siguen R-DD-RR-D con turnos de 45 s', async () => {
        const inicio = restanteTurno(await salaPorId(salaId));
        assert(
          inicio !== null && inicio > 30 && inicio <= 46,
          `el primer turno dura ${inicio?.toFixed(1)} s (se esperan 45)`,
        );

        for (let n = 1; n <= 6; n++) {
          const actual = await salaPorId(salaId);
          assert(actual.picks_estado === 'en_curso', `picks ${actual.picks_estado} en el pick ${n}`);
          const turno = actual.pick_turno_user_id;
          const partes = await participantesDe(salaId);
          const capitan = partes.find((p) => p.user_id === turno);
          const objetivo = partes.find((p) => p.equipo === null && !p.es_capitan);
          assert(objetivo, 'no queda nadie por pickear');
          await rpc(tokenDe(jugadores, turno), 'pickear_jugador', {
            p_sala: salaId,
            p_user: objetivo.user_id,
          });
          const luego = await participantesDe(salaId);
          const equipo = luego.find((p) => p.user_id === objetivo.user_id)?.equipo;
          assert(equipo === capitan?.equipo, `el pick ${n} no fue al equipo del capitán`);
          secuencia.push(equipo === 1 ? 'R' : 'D');

          if (n < 6) {
            const restante = restanteTurno(await salaPorId(salaId));
            assert(
              restante !== null && restante > 30 && restante <= 46,
              `el turno tras el pick ${n} dura ${restante?.toFixed(1)} s (se esperan 45)`,
            );
          }
        }
        assert(
          secuencia.join('-') === ordenEsperado.slice(0, 6).join('-'),
          `orden ${secuencia.join('-')}`,
        );
        return `${secuencia.join('-')}, turno 45 s`;
      });

      await paso('5v5: el auto-pick cierra el draft con D y R (5/5) por mayor MMR', async () => {
        const pendientes = (await participantesDe(salaId)).filter((p) => p.equipo === null);
        assert(pendientes.length === 2, `quedan ${pendientes.length} sin equipo`);

        const mmr = async (id) => {
          const res = await rest(`profiles?id=eq.${id}&select=mmr&limit=1`);
          return res.data?.[0]?.mmr ?? null;
        };
        const originales = [];
        for (const p of pendientes) originales.push({ id: p.user_id, mmr: await mmr(p.user_id) });

        // El primero de la lista (orden de entrada) lleva el MMR más alto: es a
        // quien debe elegir el auto-pick.
        await actualizarPerfil(pendientes[0].user_id, { mmr: 9000 });
        await actualizarPerfil(pendientes[1].user_id, { mmr: 1000 });

        try {
          await rpc(adminToken, 'auto_pickear_si_vencido', { p_sala: salaId, p_forzar: true });
          let partes = await participantesDe(salaId);
          assert(partes.filter((p) => p.equipo === 2).length === 5, 'el pick 7 no fue de Dire');
          assert(
            partes.find((p) => p.user_id === pendientes[0].user_id)?.equipo === 2,
            'el auto-pick no eligió al de mayor MMR',
          );

          await rpc(adminToken, 'auto_pickear_si_vencido', { p_sala: salaId, p_forzar: true });
          const actual = await salaPorId(salaId);
          partes = await participantesDe(salaId);
          const radiant = partes.filter((p) => p.equipo === 1).length;
          const dire = partes.filter((p) => p.equipo === 2).length;
          assert(actual.picks_estado === 'terminado', `picks ${actual.picks_estado}`);
          assert(partes.every((p) => p.equipo === 1 || p.equipo === 2), 'quedó gente sin equipo');
          assert(radiant === 5 && dire === 5, `reparto ${radiant}/${dire}`);
          return `${secuencia.join('-')}-D-R, ${radiant}/${dire}, auto-pick por MMR`;
        } finally {
          for (const o of originales) await actualizarPerfil(o.id, { mmr: o.mmr });
        }
      });
    }

    const finDraft = await participantesDe(salaId);
    const radiant = finDraft.filter((p) => p.equipo === 1).length;
    const dire = finDraft.filter((p) => p.equipo === 2).length;

    if (radiant === 5 && dire === 5) {
      console.log('[ok] 5v5: reparto equilibrado 5/5');
    } else {
      if (conDraftNuevo) {
        fallos++;
        console.error(`[FALLA] 5v5: reparto desequilibrado ${radiant}/${dire}`);
      } else {
        console.log(`[pendiente] reparto ${radiant}/${dire} hasta aplicar el SQL del draft`);
      }
      // Se repara la sala para seguir verificando lobby y reembolso.
      await rpc(adminToken, 'cancelar_picks', { p_sala: salaId });
      const partes = await participantesDe(salaId);
      for (let i = 0; i < partes.length; i++) {
        await rpc(adminToken, 'asignar_equipo', {
          p_sala: salaId,
          p_user: partes[i].user_id,
          p_equipo: i < 5 ? 1 : 2,
        });
      }
      const reparadas = await participantesDe(salaId);
      assert(reparadas.filter((p) => p.equipo === 1).length === 5, 'no se pudo reparar Radiant');
      assert(reparadas.filter((p) => p.equipo === 2).length === 5, 'no se pudo reparar Dire');
      console.log('[info] equipos reparados 5/5 para continuar');
    }

    await paso('5v5: el admin define el lobby', async () => {
      await definirLobby(adminToken, salaId, 'QA Lobby 5v5', 'qa5678');
      const actual = await salaPorId(salaId);
      const lobby = await lobbyDe(salaId, adminToken);
      assert(actual.estado === 'en_juego', `estado ${actual.estado}`);
      assert(lobby?.clave === 'qa5678', 'no se guardó la clave del lobby');
      return 'en_juego';
    });

    await paso('5v5: cancelar reembolsa a los 10', async () => {
      await cancelarSala(adminToken, salaId);
      cancelada = true;
      const actual = await salaPorId(salaId);
      assert(actual.estado === 'cancelada', `estado ${actual.estado}`);
      const finales = await saldos(jugadores);
      for (let i = 0; i < jugadores.length; i++) {
        assert(
          finales[i] === saldosIniciales[i],
          `saldo qa-p${i + 1} ${finales[i]} != ${saldosIniciales[i]}`,
        );
      }
      return 'saldos restaurados';
    });
  } catch (error) {
    fallos++;
    fallo('escenario 5v5', error);
  } finally {
    if (salaId && !cancelada) {
      try {
        const modo = await limpiarSala(salaId, adminToken);
        console.log(`[info] sala 5v5 ${modo} durante la limpieza`);
      } catch (error) {
        console.error(`[FALLA] limpieza 5v5: ${error.message}`);
      }
    }
  }
}

let actores;
try {
  actores = await prepararActores();
  console.log(`[ok] sesiones listas: ${actores.admin.user.email} + ${actores.jugadores.length} jugadores\n`);
} catch (error) {
  console.error(`[FALLA] preparar sesiones: ${error.message}`);
  console.error('Ejecuta `npm run qa:seed` y revisa QA_PASSWORD.');
  process.exit(1);
}

if (objetivo === '1v1' || objetivo === 'todo') {
  await escenario1v1(actores.admin.access_token, actores.jugadores);
}
if (objetivo === '5v5' || objetivo === 'todo') {
  if (objetivo === 'todo') console.log('');
  await escenario5v5(actores.admin.access_token, actores.jugadores);
}

process.exit(fallos === 0 ? 0 : 1);
