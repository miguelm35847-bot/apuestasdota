#!/usr/bin/env node
// Recorridos visuales de landing con HTTP y Realtime aislados. No escribe en Supabase.
// Uso: node --env-file-if-exists=.env.local scripts/qa/landing-ui.mjs
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const base = new URL(process.env.QA_BASE ?? 'http://127.0.0.1:3001').origin;
const cdp = process.env.QA_CDP ?? 'http://127.0.0.1:9222';
const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
const sessionKey = `sb-${new URL(supabase).hostname.split('.')[0]}-auth-token`;
const directorio = `qa-artifacts/landing/ui-${Date.now()}`;
const uid = '22000000-0000-4000-8000-000000000001';
const privateSteam = '76561199999999999'; // Centinela ficticio: jamás debe aparecer en DOM.
const roomId = (i) => `11000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const actorId = (i) => `33000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const avatar = `${base}/dota2.svg`;
const now = Date.now();
const rooms = [
  { cupo: 10, estado: 'en_juego', count: 10, nombre: 'QA Copa de la comunidad — Radiant contra Dire, edición de octubre', destacada: true },
  { cupo: 2, estado: 'abierta', count: 1, nombre: 'QA Duelo 1v1 con cupo disponible' },
  { cupo: 10, estado: 'abierta', count: 7, nombre: 'QA Arena 5v5 para todos los roles' },
  { cupo: 2, estado: 'llena', count: 2, nombre: 'QA Duelo 1v1 lleno' },
  { cupo: 10, estado: 'llena', count: 10, nombre: 'QA Equipo completo 5v5 listo para comenzar' },
  { cupo: 2, estado: 'en_juego', count: 2, nombre: 'QA Duelo 1v1 en juego' },
].map((r, i) => ({
  ...r, id: roomId(i + 1), cuota: 550, comision_bp: 500,
  modalidad: r.cupo === 2 ? '1v1' : '5v5',
  iniciada_at: r.estado === 'en_juego' ? new Date(now - 8 * 60000).toISOString() : null,
  created_at: new Date(now - i * 1000).toISOString(), participantes_sala: [{ count: r.count }],
}));
const fixtureParts = rooms.flatMap((r, ri) => Array.from({ length: r.count }, (_, i) => ({
  sala_id: r.id, user_id: actorId(ri * 20 + i + 1),
  equipo: r.estado === 'en_juego' ? (i < r.cupo / 2 ? 1 : 2) : null,
  profiles: {
    nick: `Jugador ${i + 1} con nombre largo de la comunidad`, mmr: 4500,
    steam_avatar_url: avatar, steam_nombre: null, roles_preferidos: ['mid'],
    steam_id: privateSteam,
  },
})));
const bets = rooms.filter((r) => r.estado === 'en_juego').map((r, i) => ({
  id: `44000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  sala_id: r.id, creador_id: actorId(901), aceptante_id: actorId(902), equipo_creador: 1,
  estado: 'aceptada', ganador_id: null, creado_en: new Date(now).toISOString(),
  creador: { nick: 'Espectador Radiant con nick largo', steam_avatar_url: avatar },
  aceptante: { nick: 'Espectador Dire con nick largo', steam_avatar_url: avatar },
}));
const usuario = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'qa-landing@example.test', app_metadata: {}, user_metadata: {}, created_at: new Date(now).toISOString() };
const expires = Math.floor(now / 1000) + 3600;
const payload = Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated', exp: expires })).toString('base64url');
const sesion = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.qa`, refresh_token: 'qa-landing', expires_in: 3600, expires_at: expires, token_type: 'bearer', user: usuario };
const defaults = { autenticado: true, steam: true, mmr: 4500, admin: false, historial: false, salaActual: false, perfilAusente: false, errorPerfil: false, errorSalas: false, errorSteam: false, vacio: false };
let escenario = { ...defaults };
let lecturas = new Set();
let total = 0;
let seq = 0;
const pendientes = new Map();
const errores = [];
const escrituras = [];
const tab = await (await fetch(`${cdp}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  pendientes.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
ws.addEventListener('message', (evento) => {
  const msg = JSON.parse(evento.data);
  if (msg.id) {
    const p = pendientes.get(msg.id);
    if (!p) return;
    pendientes.delete(msg.id);
    if (msg.error) p.reject(new Error(JSON.stringify(msg.error))); else p.resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') errores.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errores.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  if (msg.method === 'Fetch.requestPaused') void atender(msg.params).catch((error) => errores.push(error.message));
});
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });

async function atender({ requestId, request }) {
  const url = new URL(request.url);
  if(url.origin==='https://player.kick.com'){
    await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'content-type',value:'text/html; charset=utf-8'}],body:Buffer.from('<!doctype html><html lang="es"><body style="background:#090b0d;color:#53fc18">KICK · reproductor de prueba</body></html>').toString('base64')});return;
  }
  const endpoint = url.pathname.split('/').pop();
  const headers = [
    { name: 'content-type', value: 'application/json' },
    { name: 'access-control-allow-origin', value: base },
    { name: 'access-control-allow-headers', value: '*' },
    { name: 'access-control-allow-methods', value: 'GET,HEAD,POST,OPTIONS' },
    { name: 'access-control-expose-headers', value: 'content-range' },
  ];
  let data = [], status = 200, count = 0;
  if (request.method !== 'OPTIONS') {
    if (!['GET', 'HEAD'].includes(request.method) && !['mi_saldo', 'es_admin', 'confirmar_verificacion', 'unirse_a_sala'].includes(endpoint)) {
      escrituras.push(`${request.method} ${url.pathname}`);
      status = 403; data = { message: 'El harness bloqueó una escritura inesperada' };
    } else if (url.pathname === '/api/perfil/steam') {
      lecturas.add('steam');
      status = escenario.errorSteam ? 503 : 200;
      data = escenario.errorSteam ? { error: 'Consulta no disponible' } : { vinculado: escenario.steam };
    } else if (endpoint === 'confirmar_verificacion') { escenario.confirmado=true; data=1; }
    else if (endpoint === 'unirse_a_sala') { data=null; }
    else if (endpoint === 'user') data = usuario;
    else if (endpoint === 'profiles') {
      if (url.searchParams.get('select') === 'mmr') lecturas.add('perfil');
      if (escenario.errorPerfil) { status = 503; data = { message: 'Perfil temporalmente no disponible' }; }
      else data = escenario.perfilAusente ? null : { nick: 'Jugador de prueba', steam_avatar_url: avatar, steam_nombre: null, steam_id: privateSteam, mmr: escenario.mmr, rol: escenario.admin ? 'admin' : 'jugador' };
    } else if (endpoint === 'es_admin') { lecturas.add('admin'); data = escenario.admin; }
    else if (endpoint === 'mi_saldo') data = 10000;
    else if (endpoint === 'salas') {
      if (url.searchParams.get('verificacion_estado') === 'eq.pendiente') data=escenario.verificacion ? [{...rooms[0],verificacion_iniciada_at:escenario.ronda??new Date(now).toISOString(), verificacion_expira_at:new Date(Date.now()+600000).toISOString()}] : [];
      else if (url.searchParams.has('id')) data=rooms.find(r=>`eq.${r.id}`===url.searchParams.get('id'))??rooms[1];
      else if (url.searchParams.get('estado') === 'eq.terminada') data = [];
      else if (escenario.errorSalas) { status = 503; data = { message: 'Salas temporalmente no disponibles' }; }
      else data = escenario.vacio ? [] : escenario.salasSinJugadores
        ? rooms.map((r,i) => ({...r, nombre: ['QA prueba', 'QA s1234', 'QA Sala Principal — Sin Comisión'][i] ?? r.nombre, destacada: i === 2, estado: 'abierta', count: 0, participantes_sala: [{count: 0}], iniciada_at: null}))
        : escenario.esperando ? rooms.map(r => ({...r, estado: r.count === r.cupo ? 'llena' : 'abierta', iniciada_at: null})) : rooms;
      lecturas.add('salas');
    } else if (endpoint === 'participantes_sala') {
      if (url.searchParams.get('salas.estado') === 'eq.terminada') {
        lecturas.add('historial');
        data = escenario.historial ? [{ sala_id: roomId(90), salas: { estado: 'terminada' } }] : [];
      } else if (url.searchParams.has('user_id')) data = escenario.verificacion ? [{sala_id:rooms[0].id,user_id:uid,verificado_at:escenario.confirmado?new Date().toISOString():null}] : [];
      else {
        data = escenario.vacio || escenario.salasSinJugadores ? [] : fixtureParts.map((p, i) => escenario.salaActual && i === 0 ? { ...p, user_id: uid } : p);
        lecturas.add('roster');
      }
    } else if (endpoint === 'apuestas_sala') {
      data = bets.filter((b) => `eq.${b.sala_id}` === url.searchParams.get('sala_id'));
      count = data.length;
    }
  }
  headers.push({ name: 'content-range', value: `0-${Math.max(0, count - 1)}/${count}` });
  await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: headers, body: request.method === 'OPTIONS' ? '' : Buffer.from(JSON.stringify(data)).toString('base64') });
}

async function evaluar(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}
async function esperar(expression) {
  for (let i = 0; i < 100; i++) { if (await evaluar(`Boolean(${expression})`)) return; await sleep(100); }
  throw new Error(`No apareció: ${expression}`);
}
async function abrir(opciones = {}) {
  escenario = { ...defaults, ...opciones };
  lecturas = new Set();
  await send('Page.navigate', { url: `${base}/?qaLanding=${total}${escenario.autenticado ? '' : '&anon=1'}` });
  await esperar(`document.querySelector('#salas-lista') && !document.querySelector('#salas-lista').innerText.includes('Cargando salas...')`);
  if (escenario.autenticado) {
    for (let i = 0; i < 100 && !['perfil', 'historial', 'admin', 'steam'].every((v) => lecturas.has(v)); i++) await sleep(100);
    assert.ok(['perfil', 'historial', 'admin', 'steam'].every((v) => lecturas.has(v)), 'Se resolvieron las fuentes del próximo paso');
  }
  if (!escenario.vacio && !escenario.errorSalas) await esperar(`document.querySelectorAll('#salas-lista a[aria-label^="Ver perfil de"]').length === ${escenario.salasSinJugadores ? 0 : fixtureParts.length}`);
  await sleep(250);
}
const paso = async () => evaluar(`document.querySelector('[data-siguiente-paso]')?.dataset.siguientePaso ?? null`);
const cardExpression = (nombre) => `[...document.querySelectorAll('#salas-lista h3')].find(e=>e.textContent.trim()===${JSON.stringify(nombre)})?.closest('.arena-card')`;

async function verificarPresentacion() {
  const medidas = await evaluar(`(()=>{
    const relojes=[...document.querySelectorAll('[aria-label^="Tiempo de partida:"]')];
    const choques=relojes.map(reloj=>{const a=reloj.getBoundingClientRect(),b=reloj.previousElementSibling.getBoundingClientRect();return Math.min(a.right,b.right)-Math.max(a.left,b.left)>0.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>0.5;});
    const fuente=document.querySelector('#salas-lista');
    return {overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,choques,relojes:relojes.length,privado:document.documentElement.outerHTML.includes(${JSON.stringify(privateSteam)}),actividad:!!document.querySelector('a[href="/mi-actividad"]'),fuente:getComputedStyle(fuente).fontFamily};
  })()`);
  assert.equal(medidas.overflow, 0, 'Sin desbordamiento horizontal');
  assert.ok(medidas.choques.every((choca) => !choca), 'Texto de demostración y reloj separados');
  assert.equal(medidas.privado, false, 'El steam_id ficticio no se renderiza en atributos ni texto');
  assert.equal(medidas.actividad, false, 'No reaparece Mi actividad');
  assert.match(medidas.fuente, /Manrope/i, 'La landing conserva Manrope');
}
async function captura(nombre, w, h, selector = null) {
  if (selector) await evaluar(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'start',behavior:'instant'})`);
  else await evaluar('scrollTo({top:0,behavior:"instant"})');
  await sleep(150);
  await verificarPresentacion();
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${directorio}/${nombre}-${w}x${h}.png`, Buffer.from(shot.data, 'base64'));
}
async function caso(nombre, fn) { await fn(); total++; console.log(`[ok] ${nombre}`); }

try {
  await mkdir(directorio, { recursive: true });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: `${supabase}/*`, requestStage: 'Request' }, { urlPattern: `${base}/api/*`, requestStage: 'Request' },{urlPattern:'https://player.kick.com/*',requestStage:'Request'}] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    if(location.origin===${JSON.stringify(base)}){
      localStorage.clear();
      if(!new URLSearchParams(location.search).has('anon'))localStorage.setItem(${JSON.stringify(sessionKey)},${JSON.stringify(JSON.stringify(sesion))});
      window.WebSocket=class extends EventTarget{static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;readyState=0;send(){}close(){this.readyState=3;}};
    }
  ` });
  for (const [w, h] of [[1366, 768], [390, 844], [360, 800]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
    await caso(`salas públicas completas y sin sesión ${w}x${h}`, async () => {
      await abrir({ autenticado: false });
      assert.equal(await paso(), null);
      for (const r of rooms) {
        const card = cardExpression(r.nombre);
        assert.ok(await evaluar(`${card}?.innerText.includes(${JSON.stringify(`${r.count}/${r.cupo} jugadores`)})`), `${r.nombre}: jugadores visibles`);
        assert.deepEqual(await evaluar(`[...${card}.querySelectorAll('dl dd')].map(e=>e.textContent.trim())`), ['S/ 5.50', 'S/ 10.45']);
        if (r.estado === 'en_juego') {
          assert.ok(await evaluar(`!!${card}.querySelector('a[href="/salas/${r.id}/partida"]')`), 'Acceso público a datos');
          await esperar(`${card}.querySelector('[data-apuesta-cruce]')?.querySelectorAll('img').length===2`);
          assert.ok(await evaluar(`${card}.querySelector('[data-apuesta-cruce]').innerText.includes('Espectador Radiant')&&${card}.querySelector('[data-apuesta-cruce]').innerText.includes('Espectador Dire')`));
        }
      }
      const importes = await evaluar(`(()=>{const lista=${cardExpression(rooms[0].nombre)};const hero=[...document.querySelectorAll('h2')].find(e=>e.textContent.trim()===${JSON.stringify(rooms[0].nombre)})?.parentElement.parentElement;return {lista:[...lista.querySelectorAll('dl dd')].map(e=>e.innerText),hero:hero?[...hero.querySelectorAll('dl dd')].map(e=>e.innerText):[]};})()`);
      assert.deepEqual(importes.hero, importes.lista, 'Destacada y tarjeta muestran los mismos importes');
      assert.equal(await evaluar(`document.querySelector('#salas-lista').innerText.includes('Colores de los jugadores')`), false);
      await captura('landing', w, h);
      await captura('salas', w, h, '#salas-lista');
      const dimensiones=await evaluar(`[...document.querySelectorAll('[data-sala-tarjeta]')].map(e=>{const r=e.getBoundingClientRect(),f=e.lastElementChild.getBoundingClientRect();return {ancho:r.width,alto:r.height,accionesVisibles:f.bottom<=r.bottom&&f.top>=r.top};})`);
      assert.ok(dimensiones.every(d=>Math.abs(d.alto-dimensiones[0].alto)<1&&Math.abs(d.ancho-dimensiones[0].ancho)<1&&d.accionesVisibles),JSON.stringify(dimensiones));
    });
    await caso(`primer paso con Steam pendiente ${w}x${h}`, async () => {
      await abrir({ steam: false });
      await esperar(`document.querySelector('[data-siguiente-paso="steam"]')`);
      assert.equal(await evaluar(`document.querySelector('[data-siguiente-paso] a').getAttribute('href')`), '/perfil#steam');
      await captura('siguiente-paso', w, h, '[data-siguiente-paso]');
    });
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  const usuariosPC = [{autenticado:false}, {admin:true}, {steam:false}];
  const vistasPC = [
    ...[1080, 945].flatMap(alto => usuariosPC.map(opciones => ({alto, opciones}))),
    ...[{historial:true}, {admin:true}].map(opciones => ({alto:945, opciones:{...opciones, salasSinJugadores:true}})),
  ];
  for (const {alto, opciones} of vistasPC) {
    await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: alto, deviceScaleFactor: 1, mobile: false });
    await caso(`dos primeras salas completas sin scroll 1920x${alto}${opciones.salasSinJugadores ? ', destacada vacía' : ''}`, async () => {
      await abrir({...opciones, esperando:true});
      await evaluar('scrollTo(0,0)');
      const rects=await evaluar(`[...document.querySelectorAll('[data-sala-tarjeta]')].slice(0,2).map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom}})`);
      await captura('dos-salas-'+(opciones.salasSinJugadores?'vacias-':'')+(opciones.admin?'admin':opciones.steam===false?'nuevo':opciones.autenticado===false?'publico':'jugador'),1920,alto);
      assert.equal(rects.length,2);
      assert.ok(rects.every(r=>r.top>=0&&r.bottom<=alto), JSON.stringify(rects));
      assert.ok(rects.every(r=>r.bottom>=alto-24&&r.bottom<=alto-8), 'Queda un pequeño margen bajo la primera fila');
      assert.ok(await evaluar(`document.querySelectorAll('[data-sala-tarjeta]')[2].getBoundingClientRect().top>=${alto}`), 'No asoma la fila siguiente');
      const dimensiones=await evaluar(`[...document.querySelectorAll('[data-sala-tarjeta]')].map(e=>{const r=e.getBoundingClientRect(),f=e.querySelector('.sala-acciones').getBoundingClientRect();return {ancho:r.width,alto:r.height,accionesVisibles:f.bottom<=r.bottom&&f.top>=r.top};})`);
      assert.ok(dimensiones.every(d=>Math.abs(d.alto-dimensiones[0].alto)<1&&Math.abs(d.ancho-dimensiones[0].ancho)<1&&d.accionesVisibles),JSON.stringify(dimensiones));
      assert.ok(await evaluar(`[...document.querySelectorAll('[data-sala-tarjeta]')].slice(0,2).every(e=>{const cuerpo=e.querySelector('.sala-contenido').getBoundingClientRect(),jugadores=e.querySelector('.sala-jugadores').getBoundingClientRect();return jugadores.bottom<=cuerpo.bottom+1;})`), 'Importes y jugadores completos sin scroll interno');
      const anchos=await evaluar(`[...document.querySelector('main > .grid').children].filter(e=>e.tagName==='ASIDE').map(e=>e.getBoundingClientRect().width)`);
      assert.ok(anchos.every(a=>a>=320), JSON.stringify(anchos));
      assert.equal(await evaluar(`getComputedStyle(document.querySelector('.salas-rejilla')).rowGap`),'16px','Separación normal entre filas');
      const punto=await evaluar(`(()=>{const r=document.querySelector('[data-sala-tarjeta] .sala-contenido').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+20};})()`);
      await send('Input.dispatchMouseEvent',{type:'mouseWheel',...punto,deltaX:0,deltaY:350});
      await esperar(`window.scrollY>0 || document.querySelector('[data-sala-tarjeta] .sala-contenido').scrollTop>0`);
      if (await evaluar('window.scrollY===0')) {
        // Si los detalles son largos, la primera rueda los desplaza; al llegar al final sigue la página.
        await evaluar(`(()=>{const c=document.querySelector('[data-sala-tarjeta] .sala-contenido');c.scrollTop=c.scrollHeight;})()`);
        await send('Input.dispatchMouseEvent',{type:'mouseWheel',...punto,deltaX:0,deltaY:350});
      }
      await esperar(`window.scrollY>0`);
    });
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await caso('Steam vinculado y MMR pendiente conducen al perfil competitivo', async () => {
    await abrir({ mmr: null });
    await esperar(`document.querySelector('[data-siguiente-paso="perfil"]')`);
    assert.equal(await evaluar(`document.querySelector('[data-siguiente-paso] a').getAttribute('href')`), '/perfil#perfil-dota');
  });
  await caso('MMR cero válido conduce a elegir sala y permite llegar al listado', async () => {
    await abrir({ mmr: 0 });
    await esperar(`document.querySelector('[data-siguiente-paso="buscar"]')`);
    await evaluar(`document.querySelector('[data-siguiente-paso] a').click()`);
    await esperar(`location.hash==='#salas-lista'`);
    assert.equal(await evaluar(`document.querySelector('#salas-lista').getBoundingClientRect().top<innerHeight`), true);
  });
  await caso('un jugador dentro recibe acceso a su sala actual', async () => {
    await abrir({ salaActual: true });
    await esperar(`document.querySelector('[data-siguiente-paso="sala"]')`);
    assert.equal(await evaluar(`document.querySelector('[data-siguiente-paso] a').getAttribute('href')`), `/salas/${rooms[0].id}`);
  });
  await caso('un jugador con partidas terminadas ya no recibe onboarding', async () => {
    await abrir({ historial: true });
    assert.equal(await paso(), null);
  });
  await caso('el administrador no recibe onboarding y conserva sus controles', async () => {
    await abrir({ admin: true });
    assert.equal(await paso(), null);
    assert.ok(await evaluar(`document.querySelector('#salas-lista').innerText.includes('Crear sala')`));
    assert.equal(await evaluar(`document.querySelectorAll('#salas-lista a[href^="/admin/salas/"]').length`), rooms.length);
  });
  for (const [nombre, opciones] of [
    ['error de perfil', { errorPerfil: true }],
    ['perfil ausente', { perfilAusente: true }],
    ['error del estado de Steam', { errorSteam: true }],
    ['error de salas', { errorSalas: true }],
  ]) {
    await caso(`${nombre}: no inventa progreso y ofrece reintentar`, async () => {
      await abrir(opciones);
      await esperar(`document.querySelector('[data-siguiente-paso="error"]')`);
      assert.equal(await evaluar(`document.querySelector('[data-siguiente-paso] a')===null`), true);
      escenario = { ...defaults };
      await evaluar(`document.querySelector('[data-siguiente-paso] button').click()`);
      await esperar(`document.querySelector('[data-siguiente-paso="buscar"]')`);
      await verificarPresentacion();
    });
  }
  await caso('sin salas: estado vacío y siguiente paso sin inventar cupos', async () => {
    await abrir({ vacio: true });
    await esperar(`document.querySelector('[data-siguiente-paso="esperar"]')`);
    assert.ok(await evaluar(`document.querySelector('#salas-lista').innerText.includes('No hay salas activas por ahora')`));
    assert.equal(await evaluar(`document.querySelector('[data-siguiente-paso] a').getAttribute('href')`), '/como-jugar');
    await captura('sin-salas', 1366, 768, '[data-siguiente-paso]');
  });
  await caso('aviso por ronda: confirmar no reaparece y una nueva solicitud sí avisa', async()=>{
    await abrir({verificacion:true});
    await esperar(`document.querySelector('#aviso-verificacion')`);
    await evaluar(`[...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent.trim()==='Estoy listo').click()`);
    await esperar(`!document.querySelector('#aviso-verificacion')`);
    await send('Page.navigate',{url:`${base}/?qaLanding=confirmado`});
    await sleep(350);
    await evaluar(`window.dispatchEvent(new Event('verificacion:refresh'))`);
    await sleep(400);
    assert.equal(await evaluar(`!!document.querySelector('#aviso-verificacion')`),false);
    escenario.confirmado=false; escenario.ronda=new Date(now+5000).toISOString();
    await evaluar(`window.dispatchEvent(new Event('verificacion:refresh'))`);
    await esperar(`document.querySelector('#aviso-verificacion')`);
    await evaluar(`document.querySelector('[role="dialog"] a').click()`);
    await send('Page.navigate',{url:`${base}/?qaLanding=sin-aviso`});
    escenario.verificacion=false;
  });
  await caso('unión exitosa y regreso al landing limpian el estado Uniéndose', async()=>{
    await abrir();
    await evaluar(`${cardExpression(rooms[1].nombre)}.querySelector('button').click()`);
    await esperar(`location.pathname==='/salas/${rooms[1].id}'`);
    await evaluar('history.back()');
    await esperar(`location.pathname==='/' && !!document.querySelector('#salas-lista')`);
    await esperar(`${cardExpression(rooms[1].nombre)}?.querySelector('button')?.textContent.trim()==='Unirse'`);
    assert.equal(await evaluar(`${cardExpression(rooms[1].nombre)}.querySelector('button').disabled`),false);
  });
  assert.deepEqual(escrituras, [], 'No se intentaron escrituras ni llamadas reales de dinero');
  assert.deepEqual(errores, [], `Errores de consola: ${errores.join('\n')}`);
  console.log(`\n${total}/${total} casos landing OK; ${directorio}; fixtures aislados sin escrituras reales.`);
} finally {
  ws.close();
  await fetch(`${cdp}/json/close/${tab.id}`);
}
