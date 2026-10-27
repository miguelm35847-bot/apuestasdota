// SDK y componentes reales; HTTP y Realtime simulados, sin escrituras remotas.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const base = new URL(process.env.QA_BASE ?? 'http://127.0.0.1:3001').origin;
const auth = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
const cdp = process.env.QA_CDP ?? 'http://127.0.0.1:9222';
const shots = 'output/qa-refresco/capturas';
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
  if (request.method === 'OPTIONS') status = 204;
  else if (url.pathname.includes('/rpc/')) {
    assert.ok(['es_admin', 'mi_saldo'].includes(endpoint), 'RPC inesperada: ' + endpoint);
    if (endpoint === 'mi_saldo') { incrementar('saldo'); data = 10000; } else data = fixture.admin;
  } else {
    assert.equal(request.method, 'GET', 'Sin escrituras: ' + url.pathname);
    if (endpoint === 'user') data = user;
    else if (endpoint === 'profiles') data = new Headers(request.headers).get('accept')?.includes('vnd.pgrst.object') ? profile : [profile];
    else if (endpoint === 'salas') {
      if (url.searchParams.get('id') === 'eq.' + rid) { incrementar('sala'); detallada = true; data = room; }
      else data = [{ ...room, participantes_sala: [{ count: fixture.vacio ? 0 : 1 }] }];
    } else if (endpoint === 'participantes_sala') {
      const select = url.searchParams.get('select') ?? '';
      if (url.searchParams.get('sala_id') === 'eq.' + rid && select.includes('verificado_at')) {
        incrementar('participantes'); detallada = true;
        assert.ok(select.includes('preferencia_equipo'), 'Preferencia incluida en la consulta principal');
        if (fixture.error) { status = 403; data = { code: '42501', message: 'Permiso denegado de prueba' }; }
        else data = fixture.vacio ? [] : [{ sala_id: rid, user_id: uid, equipo: null, preferencia_equipo: 2, es_capitan: false, verificado_at: null, profiles: profile }];
      } else {
        assert.notEqual(select, 'user_id,preferencia_equipo', 'No hay consulta separada de preferencias');
        data = [];
      }
    } else if (endpoint === 'lobbies') { incrementar('lobby'); detallada = true; data = fixture.lobby ? [{ sala_id: rid, nombre: 'QA Lobby', clave: 'qa-clave' }] : []; }
    else if (endpoint === 'actividades') { incrementar('actividad'); data = []; }
    else if (url.pathname === '/api/perfil/steam') data = { vinculado: false };
    else if (url.pathname.includes('/api/dota/jugador/')) { status = 404; data = {}; }
    else if (url.pathname.endsWith('/links')) data = { steamUrl: null, dotabuffUrl: null };
  }
  if (detallada) { paralelas++; maximo = Math.max(maximo, paralelas); await sleep(60); }
  try { await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: headers, body: status === 204 ? '' : Buffer.from(JSON.stringify(data)).toString('base64') }); }
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
  reads = {}; maximo = 0; fallos = [];
  await send('Page.navigate', { url: base + route });
  await wait(route === '/' ? "document.body.innerText.includes('Actividad reciente')" : options.visitante ? "location.pathname==='/login'" : "document.body.innerText.includes('Sala QA de refresco')");
  await sleep(550);
}
async function settled() { await sleep(450); assert.equal(paralelas, 0); }
async function test(name, fn) { await fn(); assert.deepEqual(fallos, []); total++; console.log('[ok] ' + name); }
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
  console.log(`${total}/${total} recorridos de refresco, permisos y vistas correctos.`);
} finally {
  await fetch(`${cdp}/json/close/${tab.id}`).catch(() => {}); ws.close();
}
