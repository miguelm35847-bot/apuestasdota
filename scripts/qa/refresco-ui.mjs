// SDK y componentes reales; HTTP y Realtime simulados, sin escrituras remotas.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const base = new URL(process.env.QA_BASE ?? 'http://127.0.0.1:3001').origin;
const auth = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
const cdp = process.env.QA_CDP ?? 'http://127.0.0.1:9222';
const paneles = process.argv.includes('--paneles');
const premios = process.argv.includes('--premios');
const shots = process.env.QA_SHOTS ?? (premios ? 'output/qa-premios/capturas' : paneles ? 'output/qa-refactor/capturas' : 'output/qa-refresco/capturas');
const uid = '22000000-0000-4000-8000-000000000001';
const rid = '11000000-0000-4000-8000-000000000001';
const profile = { id: uid, nick: 'Jugador QA', mmr: 3000, roles_preferidos: ['mid'], steam_nombre: null, steam_avatar_url: base + '/dota2.svg' };
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'qa@example.invalid', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const exp = Math.floor(Date.now() / 1000) + 3600;
const payload = Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated', exp })).toString('base64url');
const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.qa`, refresh_token: 'qa-refresh', expires_at: exp, expires_in: 3600, token_type: 'bearer', user };
const key = `sb-${new URL(auth).hostname.split('.')[0]}-auth-token`;
const room = { id: rid, nombre: 'Sala QA de refresco', estado: 'abierta', cupo: 10, cuota: 1000, comision_bp: 0, creado_por: uid, picks_estado: 'inactivo', verificacion_estado: 'inactiva', auto_cierre: false, created_at: new Date().toISOString() };
let fixture = {}, reads = {}, fallos = [], paralelas = 0, maximo = 0, total = 0, seq = 0;
let acciones = [];
const actorId = i => '22000000-0000-4000-8000-' + String(i + 1).padStart(12, '0');
const jugadores = (fase = 'inactivo', cupo = 10) => Array.from({ length: cupo }, (_, i) => ({
  sala_id: rid, user_id: actorId(i), equipo: fase === 'en_curso' && i < 2 ? i + 1 : null,
  preferencia_equipo: 2, es_capitan: fase !== 'inactivo' && i < 2, verificado_at: '2026-10-20T12:00:00Z',
  profiles: { ...profile, nick: i === 0 ? 'Jugador QA' : `Jugador ${i + 1}` },
}));
const historial = [1, 2].map((equipo, i) => ({ sala_id: `11000000-0000-4000-8000-00000000000${i+2}`, equipo,
  salas: { nombre: i === 0 ? 'QA victoria' : 'QA derrota', estado: 'terminada', cuota: 1000, created_at: '2026-10-20T12:00:00Z', partidas: { equipo_ganador: 1, premio_por_ganador: 2000 } } }));
const pending = new Map();
const tab = await (await fetch(`${cdp}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
ws.addEventListener('message', event => {
  const m = JSON.parse(event.data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p?.reject(new Error(JSON.stringify(m.error))); else p?.resolve(m.result); return; }
  if (m.method === 'Fetch.requestPaused') void respond(m.params).catch(e => fallos.push(e.message));
  if (m.method === 'Runtime.exceptionThrown') fallos.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
});
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; }
async function wait(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await sleep(100); } throw new Error('No apareció: ' + expression); }
const count = name => reads[name] ?? 0;
const detalle = () => count('sala') + count('participantes') + count('lobby');
const incrementar = name => { reads[name] = count(name) + 1; };

async function respond({ requestId, request }) {
  const url = new URL(request.url), endpoint = url.pathname.split('/').pop();
  const headers = [{ name: 'content-type', value: 'application/json' }, { name: 'access-control-allow-origin', value: base }, { name: 'access-control-allow-headers', value: '*' }, { name: 'access-control-allow-methods', value: 'GET,POST,HEAD,OPTIONS' }, { name: 'access-control-expose-headers', value: 'content-range' }, { name: 'content-range', value: '0-0/0' }];
  let data = [], status = 200, detallada = false;
  const sala = { ...room, ...fixture.sala };
  const perfil = { ...profile, mmr: fixture.sinMmr ? null : fixture.mmr ?? profile.mmr, roles_preferidos: fixture.roles ?? profile.roles_preferidos };
  if (request.method === 'OPTIONS') status = 204;
  else if (url.pathname.includes('/rpc/')) {
    const permitidas = ['guardar_perfil_competitivo','guardar_roles_preferidos','iniciar_picks','elegir_radiant_o_lastpick','elegir_lado','pickear_jugador','admin_configurar_cierre'];
    const importes = ['crear_sala_con_premio','admin_actualizar_importes_sala','unirse_a_sala_con_importes'];
    assert.ok(['es_admin', 'mi_saldo'].includes(endpoint) || paneles && permitidas.includes(endpoint) || premios && importes.includes(endpoint), 'RPC inesperada: ' + endpoint);
    if (endpoint === 'mi_saldo') { incrementar('saldo'); data = 10000; }
    else if (endpoint === 'es_admin') data = fixture.admin;
    else {
      const body = JSON.parse(request.postData ?? '{}'); acciones.push({ endpoint, body }); data = null;
      if (endpoint === 'guardar_perfil_competitivo') {
        if (fixture.errorGuardar) { status = 400; data = { code: 'P0001', message: 'Rechazo QA' }; }
        else { fixture.sinMmr = false; fixture.mmr = body.p_mmr; fixture.roles = body.p_roles; }
      }
      if (endpoint === 'guardar_roles_preferidos') fixture.roles = body.p_roles;
      if (endpoint === 'admin_configurar_cierre') fixture.sala = { ...fixture.sala, auto_cierre: body.p_auto };
      if (importes.includes(endpoint)) {
        if (fixture.errorImportes) {
          status = 400; data = { code:'P0001', message:fixture.errorImportes };
          if (endpoint === 'unirse_a_sala_con_importes') fixture.sala = { ...fixture.sala, cuota:600, premio_por_ganador:1500 };
        } else if (endpoint === 'unirse_a_sala_con_importes') fixture.vacio = false;
        else {
          fixture.sala = { ...fixture.sala, cuota:body.p_cuota, premio_por_ganador:body.p_premio_por_ganador,
            ...(endpoint === 'crear_sala_con_premio' ? { nombre:body.p_nombre,cupo:body.p_cupo } : {}) };
          if (endpoint === 'crear_sala_con_premio') data = rid;
        }
      }
    }
  } else {
    assert.ok(['GET','HEAD'].includes(request.method), 'Sin escrituras: ' + url.pathname);
    if (endpoint === 'user') data = user;
    else if (endpoint === 'profiles') data = new Headers(request.headers).get('accept')?.includes('vnd.pgrst.object') ? perfil : [perfil];
    else if (endpoint === 'salas') {
      if (url.searchParams.get('id') === 'eq.' + rid) { incrementar('sala'); detallada = true; data = sala; }
      else data = [{ ...sala, participantes_sala: [{ count: fixture.vacio ? 0 : 1 }] }];
    } else if (endpoint === 'participantes_sala') {
      const select = url.searchParams.get('select') ?? '';
      if (url.searchParams.get('sala_id') === 'eq.' + rid && select.includes('verificado_at')) {
        incrementar('participantes'); detallada = true;
        assert.ok(select.includes('preferencia_equipo'), 'Preferencia incluida en la consulta principal');
        if (fixture.error) { status = 403; data = { code: '42501', message: 'Permiso denegado de prueba' }; }
        else data = fixture.vacio ? [] : fixture.partes ?? [{ sala_id: rid, user_id: uid, equipo: null, preferencia_equipo: 2, es_capitan: false, verificado_at: null, profiles: perfil }];
      } else if (select.includes('partidas')) {
        incrementar('historial'); data = fixture.vacio ? [] : historial;
        if (select.includes('!inner')) assert.equal(url.searchParams.get('salas.estado'), 'eq.terminada');
        if (fixture.errorHistorial) { status = 403; data = { message:'Historial rechazado QA' }; }
      } else {
        assert.notEqual(select, 'user_id,preferencia_equipo', 'No hay consulta separada de preferencias');
        data = [];
      }
    } else if (endpoint === 'lobbies') { incrementar('lobby'); detallada = true; data = fixture.lobby ? [{ sala_id: rid, nombre: 'QA Lobby', clave: 'qa-clave' }] : []; }
    else if (endpoint === 'recargas') data = fixture.vacio ? [] : [{ id:'recarga-qa', monto:5000, numero_operacion:'QA-123', estado:'aprobada', created_at:'2026-10-20T12:00:00Z' }];
    else if (endpoint === 'retiros') data = fixture.vacio ? [] : [{ id:'retiro-qa', monto:1000, destino:'Destino QA', estado:'pendiente', created_at:'2026-10-20T12:00:00Z' }];
    else if (endpoint === 'movimientos_billetera') data = fixture.vacio ? [] : [{ id:'mov-qa',tipo:'ajuste_admin',monto:-200,descripcion:'Multa QA',created_at:'2026-10-20T12:00:00Z' }];
    else if (endpoint === 'actividades') { incrementar('actividad'); data = []; }
    else if (url.pathname === '/api/perfil/steam') data = url.searchParams.has('estado') ? { vinculado: false } : { steamId: null };
    else if (url.pathname === '/api/dota/match') data = { match_id:1234567890,radiant_win:true,duration:1800,radiant_score:30,dire_score:20 };
    else if (url.pathname.includes('/api/dota/jugador/')) { incrementar('resumenDota'); status = 404; data = {}; }
    else if (url.pathname.endsWith('/links')) data = { steamUrl: null, dotabuffUrl: null };
  }
  if (detallada) { paralelas++; maximo = Math.max(maximo, paralelas); await sleep(60); }
  headers.find(h=>h.name==='content-range').value = `0-0/${Array.isArray(data)?data.length:1}`;
  try { await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: headers, body: status === 204 || request.method === 'HEAD' ? '' : Buffer.from(JSON.stringify(data)).toString('base64') }); }
  catch (error) {
    // Una navegación puede cancelar la solicitud mientras se simula su latencia.
    if (!error.message.includes('Invalid InterceptionId')) throw error;
  }
  finally { if (detallada) paralelas--; }
}

const mocks = `
window.__qaHidden=false;window.__qaSockets=[];window.__qaTimers=new Map();window.__qaBlockJoins=false;
Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__qaHidden});
Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>window.__qaHidden?'hidden':'visible'});
window.__qaVisible=visible=>{window.__qaHidden=!visible;document.dispatchEvent(new Event('visibilitychange'));};
const timeoutOriginal=window.setTimeout,clearOriginal=window.clearTimeout;
window.setTimeout=(fn,ms,...args)=>{let id;const invoke=()=>{window.__qaTimers.delete(id);fn(...args);};id=timeoutOriginal(invoke,ms);if([5000,15000,30000].includes(ms))window.__qaTimers.set(id,{ms,invoke});return id;};
window.clearTimeout=id=>{window.__qaTimers.delete(id);clearOriginal(id);};
window.__qaTick=ms=>{for(const [id,t] of [...window.__qaTimers])if(t.ms===ms){window.clearTimeout(id);t.invoke();}};
window.WebSocket=class extends EventTarget{
static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;readyState=0;channels=new Map();
constructor(){super();window.__qaSockets.push(this);timeoutOriginal(()=>{this.readyState=1;this.onopen?.({});this.dispatchEvent(new Event('open'));},0);}
message(value){const data=JSON.stringify(value);this.onmessage?.({data});this.dispatchEvent(new MessageEvent('message',{data}));}
send(raw){const [join,ref,topic,event,payload]=JSON.parse(raw);if(event==='phx_join'){const changes=(payload.config?.postgres_changes??[]).map((f,i)=>({...f,id:i+1}));this.channels.set(topic,{join,ref,changes});if(!window.__qaBlockJoins)timeoutOriginal(()=>this.message([join,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:changes}}]),0);}else if(event==='phx_leave'){this.channels.delete(topic);timeoutOriginal(()=>this.message([join,ref,topic,'phx_reply',{status:'ok',response:{}}]),0);}else if(event==='heartbeat')timeoutOriginal(()=>this.message([join,ref,topic,'phx_reply',{status:'ok',response:{}}]),0);}
close(){this.readyState=3;this.onclose?.({code:1000});this.dispatchEvent(new Event('close'));}
};
window.__qaEmit=(table,type='UPDATE')=>{for(const socket of window.__qaSockets)for(const [topic,ch] of socket.channels){const changes=ch.changes.filter(f=>f.table===table&&(f.event==='*'||f.event===type));if(changes.length)socket.message([ch.join,null,topic,'postgres_changes',{ids:changes.map(f=>f.id),data:{schema:'public',table,type,commit_timestamp:new Date().toISOString(),record:{id:${JSON.stringify(rid)},sala_id:${JSON.stringify(rid)}},old_record:{},columns:[],errors:null}}]);}};
window.__qaDropRoom=()=>{window.__qaBlockJoins=true;for(const socket of window.__qaSockets)for(const [topic,ch] of socket.channels)if(topic.startsWith('realtime:sala-detalle-'))socket.message([ch.join,null,topic,'phx_error',{}]);};
`;
async function fresh(route, options = {}) {
  fixture = { admin: false, vacio: false, error: false, lobby: true, ...options };
  await send('Page.navigate', { url: base + '/login' }); await wait("location.pathname==='/login'&&document.querySelector('form')");
  await evaluate(`localStorage.clear();sessionStorage.clear();${options.visitante ? '' : `localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(session))});`}true`);
  // Dejar terminar respuestas canceladas de la vista anterior antes de medir otra.
  await settled();
  reads = {}; maximo = 0; fallos = []; acciones = [];
  await send('Page.navigate', { url: base + route });
  await wait(route === '/' ? "document.body.innerText.includes('Actividad reciente')" : route.startsWith('/perfil') ? options.visitante ? "document.querySelector('#perfil-dota')" : "document.querySelector('#steam')?.innerText.includes('Jugador QA')" : options.visitante ? "location.pathname==='/login'" : "document.body.innerText.includes('Sala QA de refresco')");
  await sleep(550);
}
async function settled() { await sleep(450); assert.equal(paralelas, 0); }
async function test(name, fn) { await fn(); assert.deepEqual(fallos, []); total++; console.log('[ok] ' + name); }
async function click(texto, exacto = false) {
  await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>${exacto ? `b.textContent.trim()===${JSON.stringify(texto)}` : `b.textContent.includes(${JSON.stringify(texto)})`});if(!button)throw new Error('No existe el botón solicitado');button.click();})()`);
  await sleep(80);
}
async function input(selector, value) {
  await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error('No existe el campo solicitado');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await sleep(80);
}
async function rpc(endpoint) {
  for (let i=0;i<100;i++) { const action=acciones.find(a=>a.endpoint===endpoint); if(action)return action.body; await sleep(50); }
  throw new Error('No se recibió RPC '+endpoint);
}
const fase = (picks, cupo=10) => ({ partes: jugadores(picks,cupo), sala: { cupo,estado:'llena',verificacion_estado:'completa',picks_estado:picks,pick_capitan1:uid,pick_capitan2:actorId(1),pick_ganador_moneda:uid,pick_decision_user_id:uid,pick_decision_tipo:'lado',pick_turno_user_id:uid,pick_turno_expira_at:new Date(Date.now()+45000).toISOString() } });
try {
  await mkdir(shots, { recursive: true }); await send('Page.enable'); await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: auth + '/*', requestStage: 'Request' }, { urlPattern: base + '/api/*', requestStage: 'Request' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: mocks });
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await test('sala: tres lecturas paralelas y preferencia integrada', async () => { await fresh('/salas/' + rid); assert.equal(maximo, 3); assert.equal(count('sala'), count('participantes')); assert.equal(count('sala'), count('lobby')); });
  await test('Realtime sano: sin respaldo a los 5 s y tres lecturas a los 30 s', async () => {
    const antes = detalle(); await evaluate('window.__qaTick(5000)'); await settled(); assert.equal(detalle(), antes);
    await evaluate('window.__qaTick(30000)'); await settled(); assert.equal(detalle() - antes, 3);
  });
  await test('ráfaga de eventos genera un único refresco de sala', async () => {
    const antes = detalle(); await evaluate("for(let i=0;i<8;i++)window.__qaEmit('participantes_sala');window.__qaEmit('lobbies');window.__qaEmit('profiles');"); await settled(); assert.equal(detalle() - antes, 3);
  });
  await test('pestaña oculta pausa sala y saldo; volver recarga ambos', async () => {
    const antes = detalle(), saldo = count('saldo'); await evaluate("window.__qaVisible(false);window.__qaEmit('salas');window.__qaTick(5000);window.__qaTick(15000);window.__qaTick(30000);window.dispatchEvent(new Event('saldo:refresh'));"); await settled(); assert.equal(detalle(), antes); assert.equal(count('saldo'), saldo);
    await evaluate('window.__qaVisible(true)'); await settled(); assert.equal(detalle() - antes, 3); assert.equal(count('saldo') - saldo, 1);
  });
  await test('error de permisos conserva participantes y no provoca expulsión falsa', async () => {
    fixture.error = true; await evaluate("window.__qaEmit('participantes_sala')"); await settled(); assert.equal(await evaluate('location.pathname'), '/salas/' + rid); assert.ok(await evaluate("document.body.innerText.includes('Jugador QA')")); fixture.error = false;
  });
  await test('canal caído conserva respaldo rápido de 5 s', async () => {
    await evaluate('window.__qaDropRoom()'); await sleep(50); const antes = detalle(); await evaluate('window.__qaTick(5000)'); await settled(); assert.equal(detalle() - antes, 3);
  });
  await test('sala vacía sigue disponible sin duplicar lecturas', async () => { await fresh('/salas/' + rid, { vacio: true }); assert.ok(await evaluate("document.body.innerText.includes('Sala QA de refresco')")); assert.equal(maximo, 3); });
  await test('visitante se dirige a login sin leer el detalle privado', async () => { await fresh('/salas/' + rid, { visitante: true }); assert.equal(detalle(), 0); });
  await test('administración comparte carga y recibe cambios del lobby', async () => {
    await fresh('/admin/salas/' + rid, { admin: true }); const antes = detalle(); await evaluate("window.__qaEmit('lobbies')"); await settled(); assert.equal(detalle() - antes, 3); assert.equal(maximo, 3);
  });
  await test('actividad se pausa oculta y agrupa eventos al volver', async () => {
    await fresh('/'); const antes = count('actividad'); await evaluate("window.__qaVisible(false);window.__qaEmit('actividades','INSERT');window.__qaTick(30000)"); await settled(); assert.equal(count('actividad'), antes);
    await evaluate('window.__qaVisible(true)'); await settled(); assert.equal(count('actividad') - antes, 1);
  });
  for (const [width, height] of [[1366, 768], [390, 844], [360, 800]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    for (const [nombre, route, opciones] of [['sala', '/salas/' + rid, {}], ['admin', '/admin/salas/' + rid, { admin: true }], ['inicio', '/', {}]]) {
      await test(`${nombre} sin desborde en ${width}×${height}`, async () => {
        await fresh(route, opciones); assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false);
        const shot = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${shots}/${nombre}-${width}x${height}.png`, Buffer.from(shot.data, 'base64'));
      });
    }
  }
  if (paneles) {
    await send('Emulation.setDeviceMetricsOverride', {width:1366,height:768,deviceScaleFactor:1,mobile:false});
    await test('perfil: abrir historial no provoca consultas continuas', async()=>{
      await fresh('/perfil'); const antes=count('historial'); await sleep(500); assert.equal(count('historial'),antes);
    });
    await test('perfil: historial distingue victoria, derrota e importes',async()=>{
      await wait("document.querySelector('#panel-historial')?.innerText.includes('QA victoria')");
      const texto=await evaluate("document.querySelector('#panel-historial').innerText");
      assert.ok(texto.includes('Ganaste')&&texto.includes('Perdiste')&&texto.includes('+S/ 20.00')&&texto.includes('-S/ 10.00'));
    });
    await test('perfil: pestañas de solicitudes y billetera conservan signos y estados',async()=>{
      await evaluate("document.querySelector('#panel-movimientos-tab').click()"); await wait("document.querySelector('#panel-movimientos')?.innerText.includes('QA-123')");
      let texto=await evaluate("document.querySelector('#panel-movimientos').innerText"); assert.ok(texto.includes('+S/ 50.00')&&texto.includes('-S/ 10.00')&&texto.toLowerCase().includes('aprobada'));
      await evaluate("document.querySelector('#panel-billetera-tab').click()"); await wait("document.querySelector('#panel-billetera')?.innerText.includes('Multa QA')");
      texto=await evaluate("document.querySelector('#panel-billetera').innerText"); assert.ok(texto.includes('-S/ 2.00')&&texto.includes('QA derrota'));
    });
    await test('perfil: MMR registrado queda bloqueado y guarda los roles elegidos',async()=>{
      assert.equal(await evaluate("document.querySelector('input[aria-label=MMR]')===null"),true);
      await click('Carry'); await evaluate("document.querySelector('#perfil-dota form').requestSubmit()");
      assert.deepEqual(await rpc('guardar_roles_preferidos'),{p_roles:['mid','carry']}); await wait("document.body.innerText.includes('Roles guardados correctamente')");
    });
    await test('perfil: alta de MMR se bloquea después de guardar',async()=>{
      await fresh('/perfil',{sinMmr:true}); await input('input[aria-label=MMR]','4500');
      await evaluate("document.querySelector('#perfil-dota form').requestSubmit()"); assert.equal((await rpc('guardar_perfil_competitivo')).p_mmr,4500);
      await wait("document.body.innerText.includes('Perfil guardado correctamente')&&!document.querySelector('input[aria-label=MMR]')");
    });
    await test('perfil: guardar rechazado conserva formulario editable',async()=>{
      await fresh('/perfil',{sinMmr:true,errorGuardar:true}); await input('input[aria-label=MMR]','4500'); await evaluate("document.querySelector('#perfil-dota form').requestSubmit()");
      await wait("document.body.innerText.includes('Rechazo QA')"); assert.ok(await evaluate("document.querySelector('input[aria-label=MMR]')&&!document.querySelector('#perfil-dota button[type=submit]').disabled"));
    });
    await test('perfil: vacío y error de lectura conservan sus estados de panel',async()=>{
      await fresh('/perfil',{vacio:true}); await wait("document.querySelector('#panel-historial')?.innerText.includes('Aún no tienes partidas terminadas')");
      await fresh('/perfil',{errorHistorial:true}); await wait("document.querySelector('#panel-historial')?.innerText.includes('Aún no tienes partidas terminadas')");
    });
    await test('perfil: visitante no consulta datos privados',async()=>{
      await fresh('/perfil',{visitante:true}); assert.equal(count('historial'),0); assert.ok(!(await evaluate('document.body.innerText')).includes('Multa QA'));
    });
    await test('picks 5v5: ganador elige Radiant y conserva la RPC',async()=>{
      await fresh('/salas/'+rid,fase('eleccion')); await click('pickeo primero'); assert.deepEqual(await rpc('elegir_radiant_o_lastpick'),{p_sala:rid,p_opcion:'radiant'});
    });
    await test('picks 1v1: elección de lado conserva su RPC',async()=>{
      await fresh('/salas/'+rid,fase('eleccion',2)); await click('Radiant',true); assert.deepEqual(await rpc('elegir_lado'),{p_sala:rid,p_equipo:1});
    });
    await test('draft: capitán elige un jugador del pool',async()=>{
      await fresh('/salas/'+rid,fase('en_curso')); await click('Pickear',true); assert.deepEqual(await rpc('pickear_jugador'),{p_sala:rid,p_user:actorId(2)});
    });
    await test('draft: actualizar el contador no vuelve a montar las fichas',async()=>{
      const antes=count('resumenDota'); assert.ok(antes>0); await sleep(1200); assert.equal(count('resumenDota'),antes);
    });
    await test('draft: jugador fuera de turno no puede pickear',async()=>{
      const opciones=fase('en_curso'); opciones.sala.pick_turno_user_id=actorId(1); await fresh('/salas/'+rid,opciones);
      assert.equal(await evaluate("document.body.innerText.includes('Jugador 3')&&!([...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Pickear'))"),true); assert.equal(acciones.length,0);
    });
    await test('admin: cancelación requiere confirmación y puede descartarse',async()=>{
      await fresh('/admin/salas/'+rid,{admin:true}); await click('Cancelar sala',true); await wait("document.querySelector('[role=dialog]')");
      await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.trim()==='Cancelar').click()"); await wait("!document.querySelector('[role=dialog]')"); assert.equal(acciones.length,0);
    });
    await test('admin: elección de capitanes mantiene ambos identificadores',async()=>{
      const opciones=fase('inactivo'); opciones.admin=true; await fresh('/admin/salas/'+rid,opciones);
      await evaluate(`(()=>{const selects=[...document.querySelectorAll('select')];selects[0].value=${JSON.stringify(uid)};selects[0].dispatchEvent(new Event('change',{bubbles:true}));selects[1].value=${JSON.stringify(actorId(1))};selects[1].dispatchEvent(new Event('change',{bubbles:true}));})()`); await sleep(100);
      await click('Guardar capitanes'); assert.deepEqual(await rpc('iniciar_picks'),{p_sala:rid,p_capitan1:uid,p_capitan2:actorId(1)});
    });
    await test('admin: Auto y verificación de partida mantienen configuración y diálogo',async()=>{
      await fresh('/admin/salas/'+rid,{admin:true,sala:{estado:'en_juego',auto_cierre:false}});
      await evaluate("document.querySelector('input[type=checkbox]').click()"); assert.deepEqual(await rpc('admin_configurar_cierre'),{p_sala:rid,p_auto:true,p_match:null});
      acciones=[]; await input('input[placeholder="Ej: 7654321098"]','1234567890'); await click('Verificar',true);
      assert.equal((await rpc('admin_configurar_cierre')).p_match,1234567890); await wait("document.body.innerText.includes('Partida verificada')");
      await click('Confirmar y terminar'); await wait("document.querySelector('[role=dialog]')");
      await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.trim()==='Cancelar').click()");
    });
    for (const [width,height] of [[1366,768],[390,844],[360,800]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
      await test(`perfil sin desborde en ${width}×${height}`,async()=>{await fresh('/perfil');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth+1'),false);const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${shots}/perfil-${width}x${height}.png`,Buffer.from(shot.data,'base64'));});
    }
  }
  if (premios) {
    await test('premio fijo visible en portada, tarjetas y lista aunque difiera de la comisión anterior',async()=>{
      const sala = { cuota:600,premio_por_ganador:1500,comision_bp:1500,destacada:true };
      await fresh('/',{sala});
      assert.ok(await evaluate("document.querySelector('[data-sala-tarjeta]')?.innerText.includes('15.00')"));
      await fresh('/salas',{sala});
      assert.ok(await evaluate("document.body.innerText.includes('Premio por ganador: S/ 15.00')"));
      assert.equal(await evaluate("document.body.innerText.includes('Comisión:')"),false);
    });
    await test('crear 5v5 con cuota 11 y premio 20 guarda céntimos y muestra la diferencia de la casa',async()=>{
      await fresh('/salas',{admin:true}); await click('Crear sala',true);
      assert.equal(await evaluate("document.querySelector('#sala-comision')!==null"),false);
      await input('#sala-nombre','QA importes nuevos'); await input('#sala-cuota','11'); await input('#sala-premio','20');
      assert.ok(await evaluate("document.body.innerText.includes('Diferencia para la casa: S/ 10.00')"));
      await evaluate("document.querySelector('#sala-nombre').form.requestSubmit()");
      assert.deepEqual(await rpc('crear_sala_con_premio'),{p_nombre:'QA importes nuevos',p_cuota:1100,p_cupo:10,p_premio_por_ganador:2000});
      await wait("!document.querySelector('#sala-nombre')&&document.body.innerText.includes('QA importes nuevos')");
    });
    await test('crear 1v1 sin comisión y rechazar formulario vacío sin llamar a la RPC',async()=>{
      await fresh('/salas',{admin:true}); await click('Crear sala',true);
      await evaluate("document.querySelector('#sala-nombre').form.requestSubmit()"); await sleep(80);
      assert.equal(acciones.length,0);
      await input('#sala-nombre','QA sin comisión'); await input('#sala-cuota','6'); await input('#sala-premio','12'); await click('1 vs 1',true);
      assert.ok(await evaluate("document.body.innerText.includes('Sin comisión: todo lo recaudado')"));
      await evaluate("document.querySelector('#sala-nombre').form.requestSubmit()");
      assert.deepEqual(await rpc('crear_sala_con_premio'),{p_nombre:'QA sin comisión',p_cuota:600,p_cupo:2,p_premio_por_ganador:1200});
    });
    await test('error de permisos al crear conserva los campos y muestra el rechazo',async()=>{
      await fresh('/salas',{admin:true,errorImportes:'Solo administradores'}); await click('Crear sala',true);
      await input('#sala-nombre','QA permisos'); await input('#sala-cuota','6'); await input('#sala-premio','15');
      await evaluate("document.querySelector('#sala-nombre').form.requestSubmit()");
      await wait("document.querySelector('[role=alert]')?.innerText.includes('Solo administradores')");
      assert.equal(await evaluate("document.querySelector('#sala-premio').value"),'15');
    });
    await test('gestión guarda cuota 6 y premio 10 y mantiene la edición al refrescar otros datos',async()=>{
      await fresh('/admin/salas/'+rid,{admin:true,vacio:true,sala:{cuota:1100,premio_por_ganador:2000}});
      await input('#admin-sala-cuota','6'); await input('#admin-sala-premio','10');
      await evaluate("window.__qaEmit('profiles')"); await settled();
      assert.equal(await evaluate("document.querySelector('#admin-sala-premio').value"),'10');
      await click('Guardar cuota y premio',true);
      assert.deepEqual(await rpc('admin_actualizar_importes_sala'),{p_sala:rid,p_cuota:600,p_premio_por_ganador:1000});
      await wait("document.body.innerText.includes('Cuota y premio de la sala actualizados.')&&document.querySelector('#admin-sala-cuota').value==='6.00'");
    });
    await test('gestión informa un rechazo por inscripción concurrente sin mostrar éxito',async()=>{
      await fresh('/admin/salas/'+rid,{admin:true,vacio:true,errorImportes:'No puedes cambiar la cuota ni el premio con jugadores inscritos'});
      await input('#admin-sala-cuota','6'); await input('#admin-sala-premio','15'); await click('Guardar cuota y premio',true);
      await wait("document.querySelector('[role=alert]')?.innerText.includes('jugadores inscritos')");
      assert.equal(await evaluate("document.body.innerText.includes('Cuota y premio de la sala actualizados.')"),false);
    });
    for (const [nombre,opciones] of [['con inscritos',{}],['en juego',{vacio:true,sala:{estado:'en_juego',auto_cierre:false}}]]) {
      await test('importes bloqueados '+nombre,async()=>{
        await fresh('/admin/salas/'+rid,{admin:true,...opciones});
        assert.equal(await evaluate("document.querySelector('#admin-sala-cuota').disabled&&document.querySelector('#admin-sala-premio').disabled"),true);
        await click('Guardar cuota y premio',true); assert.equal(acciones.filter(a=>a.endpoint==='admin_actualizar_importes_sala').length,0);
      });
    }
    await test('entrada incluye los importes vistos y un cambio los refresca sin confirmar inscripción',async()=>{
      await fresh('/salas/'+rid,{vacio:true,sala:{cuota:1100,premio_por_ganador:2000},errorImportes:'Los importes de la sala cambiaron. Revisa la cuota y el premio antes de volver a unirte'});
      await click('Unirme a la sala',true);
      assert.deepEqual(await rpc('unirse_a_sala_con_importes'),{p_sala:rid,p_cuota_esperada:1100,p_premio_esperado:2000});
      await wait("document.body.innerText.includes('Los importes de la sala cambiaron')&&document.body.innerText.includes('15.00')");
      assert.ok(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Unirme a la sala')"));
    });
    for (const [width,height] of [[1366,768],[390,844],[360,800]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
      for (const tipo of ['crear','gestionar']) {
        await test(`premios ${tipo} sin desborde y bono correcto en ${width}×${height}`,async()=>{
          if (tipo==='crear') { await fresh('/salas',{admin:true}); await click('Crear sala',true); }
          else await fresh('/admin/salas/'+rid,{admin:true,vacio:true});
          const prefijo=tipo==='crear'?'sala':'admin-sala';
          await input('#'+prefijo+'-cuota','6'); await input('#'+prefijo+'-premio','15');
          assert.ok(await evaluate("document.body.innerText.includes('Bono de la casa: S/ 15.00')"));
          assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth+1'),false);
          await evaluate(`document.querySelector('#${prefijo}-cuota').closest('${tipo==='crear'?'form':'section'}').scrollIntoView({block:'center'})`);
          const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${shots}/${tipo}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
        });
      }
    }
  }
  console.log(`${total}/${total} recorridos de refresco, permisos y vistas correctos.`);
} finally {
  await fetch(`${cdp}/json/close/${tab.id}`).catch(() => {}); ws.close();
}
