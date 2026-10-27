#!/usr/bin/env node
// Todo Supabase, incluido Realtime, está interceptado: no publica mensajes reales.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const base = new URL(process.env.QA_BASE ?? 'http://127.0.0.1:3001').origin;
const auth = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
const cdp = process.env.QA_CDP ?? 'http://127.0.0.1:9222';
const userId = '22000000-0000-4000-8000-000000000001';
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'qa@example.test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const payload = Buffer.from(JSON.stringify({ sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.qa`;
const session = { access_token: token, refresh_token: 'qa-refresh', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user };
const key = `sb-${new URL(auth).hostname.split('.')[0]}-auth-token`;
const shots = `qa-artifacts/chat-sonido/ui-${Date.now()}`;
let rows = [], failures = [], rejectPost = false, rejectRead = false, seq = 0, total = 0, messageId = 0, reads = 0;
const pending = new Map();
const row = (mensaje, sala_id = null) => ({ id: `44000000-0000-4000-8000-${String(++messageId).padStart(12, '0')}`, sala_id, user_id: userId, mensaje, created_at: new Date(Date.now() + messageId * 1000).toISOString(), profiles: { nick: 'Jugador QA', mmr: 3000, roles_preferidos: [] } });
const tab = await (await fetch(`${cdp}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
ws.addEventListener('message', event => {
  const m = JSON.parse(event.data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p?.reject(new Error(JSON.stringify(m.error))); else p?.resolve(m.result); return; }
  if (m.method === 'Fetch.requestPaused') void respond(m.params).catch(error => failures.push(error.message));
  if (m.method === 'Runtime.exceptionThrown') failures.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
});
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; }
async function wait(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await sleep(100); } throw new Error(`No apareció: ${expression}`); }
async function respond({ requestId, request }) {
  const url = new URL(request.url), endpoint = url.pathname.split('/').pop();
  assert.ok(url.origin === auth || url.origin === base);
  const headers = [{ name: 'content-type', value: 'application/json' }, { name: 'access-control-allow-origin', value: base }, { name: 'access-control-allow-headers', value: '*' }, { name: 'access-control-allow-methods', value: 'GET,POST,HEAD,OPTIONS' }, { name: 'access-control-expose-headers', value: 'content-range' }, { name: 'content-range', value: '0-0/0' }];
  let status = 200, data = [];
  if (request.method === 'OPTIONS') status = 204;
  else if (endpoint === 'mensajes_chat') {
    assert.equal(url.searchParams.get('sala_id'), request.method === 'POST' ? null : 'is.null');
    if (request.method === 'POST') {
      const body = JSON.parse(request.postData); assert.equal(body.user_id, userId); assert.equal(body.sala_id, null);
      if (rejectPost) { status = 403; data = { code: '42501', message: 'No tienes permiso para enviar' }; }
      else { const m = row(body.mensaje); rows.unshift(m); data = m; await evaluate(`window.__qaChatEmit(${JSON.stringify(m)})`); }
    } else {
      reads++;
      if (rejectRead) { status = 503; data = { message: 'Chat temporalmente no disponible' }; }
      else data = rows;
    }
  } else if (endpoint === 'user') data = user;
  else if (endpoint === 'profiles') data = { nick: 'Jugador QA', mmr: 3000, baneado: false, roles_preferidos: [] };
  else if (endpoint === 'es_admin') data = false;
  else if (endpoint === 'mi_saldo') data = 10000;
  else if (url.pathname === '/api/perfil/steam') data = { vinculado: false };
  else if (!['GET', 'HEAD'].includes(request.method) && request.method !== 'OPTIONS') throw new Error(`Escritura inesperada: ${url.pathname}`);
  await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: headers, body: status === 204 ? '' : Buffer.from(JSON.stringify(data)).toString('base64') });
}

// Protocolo Phoenix real del cliente instalado, con servidor simulado y audio medido.
const mocks = `
window.__qaNotas=[];window.__qaChats=[];window.__qaPolled=[];
window.AudioContext=class {state='suspended';currentTime=10;destination={};resume(){this.state='running';return Promise.resolve();}createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},start(t){window.__qaNotas.push(t);},stop(){}};}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}};
const intervalOriginal=window.setInterval;
window.setInterval=(fn,ms,...args)=>{if(ms===30000)window.__qaPolled.push(fn);return intervalOriginal(fn,ms,...args);};
window.WebSocket=class extends EventTarget {
static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;readyState=0;channels=new Map();
constructor(){super();window.__qaChats.push(this);setTimeout(()=>{this.readyState=1;this.onopen?.({});this.dispatchEvent(new Event('open'));},0);}
message(value){const data=JSON.stringify(value);this.onmessage?.({data});this.dispatchEvent(new MessageEvent('message',{data}));}
send(raw){const [join,ref,topic,event,payload]=JSON.parse(raw);if(event==='phx_join'){const changes=(payload.config?.postgres_changes??[]).map((f,i)=>({...f,id:i+1}));this.channels.set(topic,{join,changes});setTimeout(()=>this.message([join,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:changes}}]),0);}else if(event==='phx_leave'){this.channels.delete(topic);setTimeout(()=>this.message([join,ref,topic,'phx_reply',{status:'ok',response:{}}]),0);}else if(event==='heartbeat')setTimeout(()=>this.message([join,ref,topic,'phx_reply',{status:'ok',response:{}}]),0);}
close(){this.readyState=3;this.onclose?.({code:1000});this.dispatchEvent(new Event('close'));}
};
window.__qaChatEmit=record=>{for(const socket of window.__qaChats){const ch=socket.channels.get('realtime:chat-general');if(!ch||socket.readyState!==1)continue;socket.message([ch.join,null,'realtime:chat-general','postgres_changes',{ids:ch.changes.map(f=>f.id),data:{schema:'public',table:'mensajes_chat',type:'INSERT',commit_timestamp:record.created_at,record,old_record:{},columns:[],errors:null}}]);}};
window.__qaChatPoll=()=>{for(const fn of window.__qaPolled)fn();};
`;
async function fresh(loggedIn = false, empty = false) {
  rows = empty ? [] : [row('Mensaje del historial')]; rejectPost = false; rejectRead = false; failures = [];
  await send('Page.navigate', { url: base + '/login' }); await wait("document.querySelector('form')");
  await evaluate(`localStorage.clear();sessionStorage.clear();${loggedIn ? `localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(session))});` : ''}true`);
  await send('Page.navigate', { url: base + '/' });
  await wait("[...document.querySelectorAll('h3')].some(e=>e.textContent==='Chat general')&&window.__qaChats.some(s=>s.channels.has('realtime:chat-general'))");
  await wait(empty ? "document.body.innerText.includes('Aún no hay mensajes.')" : "document.body.innerText.includes('Mensaje del historial')");
  await sleep(200);
}
async function gesture() { await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 5, y: 5, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 5, y: 5, button: 'left', clickCount: 1 }); await sleep(30); }
async function emit(m, add = true) { if (add) rows.unshift(m); await evaluate(`window.__qaChatEmit(${JSON.stringify(m)})`); await sleep(200); }
async function poll() { const before = reads; await evaluate('window.__qaChatPoll()'); for (let i = 0; i < 100 && reads === before; i++) await sleep(50); assert.ok(reads > before); await sleep(150); }
const count = () => evaluate('window.__qaNotas.length');
async function test(name, fn) { await fn(); assert.deepEqual(failures, []); total++; console.log(`[ok] ${name}`); }
async function submit(value) {
  await evaluate("document.querySelector('input[placeholder=\"Escribe un mensaje...\"]').focus();document.querySelector('input[placeholder=\"Escribe un mensaje...\"]').select()");
  await send('Input.insertText', { text: value }); await evaluate("document.querySelector('input[placeholder=\"Escribe un mensaje...\"]').form.requestSubmit()"); await sleep(250);
}
try {
  await mkdir(shots, { recursive: true }); await send('Page.enable'); await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: 'https://*.supabase.co/*', requestStage: 'Request' }, { urlPattern: base + '/api/*', requestStage: 'Request' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: mocks });
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await test('visitante: historial y mensajes anteriores al primer gesto silenciosos', async () => {
    await fresh(); assert.equal(await count(), 0); await emit(row('Antes del clic')); assert.equal(await count(), 0); await gesture(); assert.equal(await count(), 0);
    assert.equal(await evaluate("document.querySelector('input[placeholder=\"Escribe un mensaje...\"]')===null"), true);
  });
  await test('Realtime: un aviso por mensaje, sin repetir al consultar', async () => {
    const m = row('Mensaje nuevo'); await emit(m); assert.equal(await count(), 1); await emit(m, false); await poll(); assert.equal(await count(), 1);
  });
  await test('mensajes privados no suenan ni actualizan el chat general', async () => {
    const before = reads; await emit(row('Privado', 'sala-privada'), false); assert.equal(await count(), 1); assert.equal(reads, before);
  });
  await test('ráfaga y consulta de respaldo reproducen un aviso por cada mensaje', async () => {
    await emit(row('Uno')); await emit(row('Dos')); assert.equal(await count(), 3);
    rows.unshift(row('Sin Realtime')); await poll(); assert.equal(await count(), 4); await poll(); assert.equal(await count(), 4);
  });
  await test('error de lectura conserva avisos y recuperación no repite el historial', async () => {
    rejectRead = true; await poll(); await wait("document.body.innerText.includes('No se pudo cargar el chat')"); assert.equal(await count(), 4);
    rejectRead = false; await poll(); assert.equal(await count(), 4);
  });
  await test('cuenta: mensaje propio suena una vez aunque coincidan envío y Realtime', async () => {
    await fresh(true); await wait("document.querySelector('input[placeholder=\"Escribe un mensaje...\"]')"); await gesture(); await submit('Mi mensaje'); assert.equal(await count(), 1);
    assert.equal(await evaluate("document.querySelector('input[placeholder=\"Escribe un mensaje...\"]').value"), '');
    await poll(); assert.equal(await count(), 1);
  });
  await test('envío rechazado no suena, conserva el texto y permite reintentar', async () => {
    rejectPost = true; await submit('Reintentar'); assert.equal(await count(), 1);
    assert.equal(await evaluate("document.querySelector('input[placeholder=\"Escribe un mensaje...\"]').value"), 'Reintentar');
    assert.equal(await evaluate("document.querySelector('input[placeholder=\"Escribe un mensaje...\"]').form.querySelector('button').disabled"), false);
    rejectPost = false; await submit('Reintentar'); assert.equal(await count(), 2);
  });
  for (const [width, height] of [[1366, 768], [390, 844], [360, 800]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await test(`chat vacío y nuevo mensaje sin desborde ${width}x${height}`, async () => {
      await fresh(false, true); await gesture(); assert.equal(await count(), 0); await emit(row('Primero')); assert.equal(await count(), 1);
      await evaluate('document.fonts.ready.then(()=>true)'); assert.equal(await evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth'), 0);
      const image = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${shots}/${width}x${height}.png`, Buffer.from(image.data, 'base64'));
    });
  }
  console.log(`${total}/${total} casos de chat en navegador correctos`);
} finally { await evaluate('localStorage.clear();sessionStorage.clear();true').catch(() => {}); ws.close(); await fetch(`${cdp}/json/close/${tab.id}`); }
