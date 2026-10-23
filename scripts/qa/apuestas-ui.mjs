#!/usr/bin/env node
// UI con respuestas HTTP de prueba en una pestaña CDP aislada.
// No envía escrituras a Supabase. La lógica de dinero se prueba en apuestas-local.mjs.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';

const base = process.env.QA_BASE ?? 'http://127.0.0.1:3001';
const cdp = process.env.QA_CDP ?? 'http://127.0.0.1:9222';
const room = '11000000-0000-4000-8000-000000000001';
const uid = '22000000-0000-4000-8000-000000000001';
const rival = '22000000-0000-4000-8000-000000000002';
const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
const sessionKey = `sb-${new URL(supabase).hostname.split('.')[0]}-auth-token`;
const usuario = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'qa-ui@example.test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const payload = Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url');
const sesion = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.qa`, refresh_token: 'qa-ui', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, token_type: 'bearer', user: usuario };
const sala = { id: room, nombre: 'QA Radiant vs Dire', cuota: 1000, cupo: 2, comision_bp: 500, modalidad: '1v1', destacada: true, estado: 'en_juego', iniciada_at: new Date(Date.now()-1200000).toISOString(), created_at: new Date().toISOString(), participantes_sala: [{ count: 2 }] };
// Los apostadores son espectadores; no forman parte de los equipos.
const parts = ['33000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000002'].map((id,i) => ({ sala_id: room, user_id:id, equipo:i+1, profiles:{ nick:i===0?'Jugador QA':'Rival QA',mmr:4500,steam_avatar_url:null,steam_nombre:null,roles_preferidos:['mid'] } }));
const perfil = (nick) => ({ nick, steam_avatar_url: `${base}/dota2.svg` });
const original = () => [
  { id:randomUUID(), sala_id:room, creador_id:rival, aceptante_id:null, equipo_creador:2, estado:'pendiente', ganador_id:null, creado_en:new Date().toISOString(), creador:perfil('Rival QA'), aceptante:null },
  { id:randomUUID(), sala_id:room, creador_id:rival, aceptante_id:uid, equipo_creador:2, estado:'aceptada', ganador_id:null, creado_en:new Date().toISOString(), creador:perfil('Rival QA'), aceptante:perfil('Jugador QA') },
];
let bets=original(), saldo=10000, autenticado=true, faltante=false, sinOfertas=false, falloAceptar=false;
let total=0;
const pagina = await (await fetch(`${cdp}/json/new?${encodeURIComponent('about:blank')}`,{method:'PUT'})).json();
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
let seq=0; const pendientes=new Map(); const errores=[];
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq; pendientes.set(id,{resolve,reject}); ws.send(JSON.stringify({id,method,params}));});
ws.addEventListener('message', (evento) => {
  const msg=JSON.parse(evento.data);
  if(msg.id){const p=pendientes.get(msg.id); if(!p)return; pendientes.delete(msg.id); if(msg.error)p.reject(new Error(JSON.stringify(msg.error)));else p.resolve(msg.result);return;}
  if(msg.method==='Runtime.exceptionThrown') errores.push(msg.params.exceptionDetails.exception?.description??msg.params.exceptionDetails.text);
  if(msg.method==='Runtime.consoleAPICalled' && msg.params.type==='error') errores.push(msg.params.args.map(a=>a.value??a.description).join(' '));
  if(msg.method==='Fetch.requestPaused') void atender(msg.params).catch(e=>errores.push(e.message));
});
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
async function atender({requestId,request}) {
  if(request.method==='OPTIONS') {
    await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'access-control-allow-origin',value:base},{name:'access-control-allow-headers',value:'*'},{name:'access-control-allow-methods',value:'GET,POST,OPTIONS'}],body:''});return;
  }
  const url=new URL(request.url); const endpoint=url.pathname.split('/').pop();
  let data=[],status=200,count=null,inicio=0;
  const body=request.postData?JSON.parse(request.postData):{};
  if(endpoint==='salas') data=url.searchParams.has('id')?sala:[sala,{...sala,id:'11000000-0000-4000-8000-000000000002',nombre:'QA sala abierta',estado:'abierta',destacada:false}];
  else if(endpoint==='participantes_sala') data=url.searchParams.has('user_id')?[]:parts;
  else if(endpoint==='profiles') data={nick:'Jugador QA',steam_avatar_url:null,steam_nombre:null,mmr:4500,rol:'jugador'};
  else if(url.pathname==='/api/perfil/steam') data={vinculado:true};
  else if(endpoint==='mi_saldo') data=saldo;
  else if(endpoint==='es_admin') data=false;
  else if(endpoint==='user') data=usuario;
  else if(endpoint==='apuestas_sala') {
    if(faltante){status=404;data={message:'Could not find the table in the schema cache'};}
    else {
      data=sinOfertas?[]:bets.filter(a=>a.sala_id===url.searchParams.get('sala_id')?.replace('eq.',''));
      const estado=url.searchParams.get('estado');
      if(estado?.startsWith('eq.')) data=data.filter(a=>a.estado===estado.slice(3));
      if(estado?.startsWith('in.')) data=data.filter(a=>estado.slice(4,-1).split(',').includes(a.estado));
      if(url.searchParams.has('or')) data=data.filter(a=>a.creador_id===uid||a.aceptante_id===uid);
      if(url.searchParams.get('creador_id')===`neq.${uid}`) data=data.filter(a=>a.creador_id!==uid);
      if(url.searchParams.has('equipo_creador')) data=data.filter(a=>a.equipo_creador===Number(url.searchParams.get('equipo_creador').slice(3)));
      data.sort((a,b)=>b.creado_en.localeCompare(a.creado_en)||b.id.localeCompare(a.id));
      count=data.length;inicio=Number(url.searchParams.get('offset')??0);
      data=data.slice(inicio,inicio+Number(url.searchParams.get('limit')??1000));
    }
  } else if(endpoint==='crear_apuesta_sala') {
    data=body.p_id;
    bets.push({id:body.p_id,sala_id:room,creador_id:uid,aceptante_id:null,equipo_creador:body.p_equipo,estado:'pendiente',ganador_id:null,creado_en:new Date().toISOString(),creador:perfil('Jugador QA'),aceptante:null});
  } else if(endpoint==='cancelar_apuesta_sala') { bets=bets.map(a=>a.id===body.p_apuesta?{...a,estado:'cancelada'}:a);data=null; }
  else if(endpoint==='aceptar_apuesta_sala') {
    if(falloAceptar){status=400;data={message:'Esta oferta ya no está disponible'};}
    else { bets=bets.map(a=>a.id===body.p_apuesta?{...a,estado:'aceptada',aceptante_id:uid,aceptante:perfil('Jugador QA')}:a);saldo-=550;data=null; }
  }
  const headers=[{name:'content-type',value:'application/json'},{name:'access-control-allow-origin',value:base},{name:'access-control-allow-headers',value:'*'}];
  if(count!==null)headers.push({name:'content-range',value:`${inicio}-${inicio+Math.max(0,data.length-1)}/${count}`},{name:'access-control-expose-headers',value:'content-range'});
  await send('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:headers,body:Buffer.from(JSON.stringify(data)).toString('base64')});
}
const evaluar=async(expression)=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
const esperar=async(expression)=>{for(let i=0;i<60;i++){if(await evaluar(expression))return;await sleep(100);}throw new Error(`No apareció: ${expression}`);};
const clickTexto=async(texto)=>{const ok=await evaluar(`(()=>{const b=[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.trim()===${JSON.stringify(texto)});if(!b||b.disabled)return false;b.click();return true;})()`);assert.ok(ok,`Botón habilitado: ${texto}`);};
const textoIncluye=(s)=>`document.querySelector('dialog[open]')?.innerText.includes(${JSON.stringify(s)})`;
async function abrir(ruta='/') {
  await send('Page.navigate',{url:`${base}${ruta}`});
  await esperar(`document.querySelectorAll('button').length>0 && [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Apostar ·'))`);
  if(ruta==='/') {
    assert.equal(await evaluar(`[...document.querySelectorAll('button')].filter(b=>b.textContent.includes('Apostar ·')).length`),2,'Hero y tarjeta en juego, sin botón en sala abierta');
  }
  await evaluar(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Apostar ·')).click()`);
  await esperar(`!!document.querySelector('dialog[open]')`);
  if(autenticado&&!faltante)await esperar(textoIncluye('Tu saldo: S/'));
  await sleep(150);
}
async function medir(nombre,w,h) {
  const m=await evaluar(`(()=>{const d=document.querySelector('dialog[open]'),r=d.getBoundingClientRect();return{overflow:document.documentElement.scrollWidth-innerWidth,modalOverflow:d.scrollWidth-d.clientWidth,left:r.left,right:r.right,top:r.top,bottom:r.bottom};})()`);
  assert.equal(m.overflow,0);assert.equal(m.modalOverflow,0);assert.ok(m.left>=0&&m.right<=w+1&&m.top>=0&&m.bottom<=h+1,JSON.stringify(m));
  const shot=await send('Page.captureScreenshot',{format:'png'});
  await writeFile(`qa-artifacts/apuestas/ui/${nombre}-${w}x${h}.png`,Buffer.from(shot.data,'base64'));
}
async function cerrar(){await clickTexto('×');await esperar(`!document.querySelector('dialog[open]')`);}
async function caso(nombre,fn){await fn();total++;console.log(`[ok] ${nombre}`);}
try{
  await mkdir('qa-artifacts/apuestas/ui',{recursive:true});
  await send('Page.enable');await send('Runtime.enable');
  await send('Fetch.enable',{patterns:[{urlPattern:`${supabase}/*`,requestStage:'Request'},{urlPattern:`${base}/api/perfil/steam*`,requestStage:'Request'}]});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    if(location.origin===${JSON.stringify(base)}){
      localStorage.clear();
      if(!location.search.includes('anon'))localStorage.setItem(${JSON.stringify(sessionKey)},${JSON.stringify(JSON.stringify(sesion))});
      window.WebSocket=class extends EventTarget{static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;readyState=0;send(){}close(){this.readyState=3;}};
    }
  `});
  for(const[w,h]of[[1366,768],[390,844],[360,800]]){
    await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<600});
    bets=original();saldo=10000;
    await caso(`landing y modal autenticado ${w}x${h}`,async()=>{
      await abrir();await esperar(textoIncluye('Rival QA'));
      assert.ok(await evaluar(`!document.querySelector('dialog').innerText.includes('Para la casa')&&!document.querySelector('dialog').innerText.includes('S/ 1.00')`));
      assert.ok(await evaluar(`document.querySelector('dialog [data-apuesta-cruce]')?.querySelectorAll('img').length===2`));
      await medir('modal',w,h);
    });
    await caso(`aceptar apuesta y reflejar saldo ${w}x${h}`,async()=>{
      await clickTexto('Apostar a Radiant');await esperar(textoIncluye('Confirmar apuesta · S/ 5.50'));
      await clickTexto('Confirmar apuesta · S/ 5.50');await esperar(textoIncluye('Apuesta confirmada.'));await esperar(textoIncluye('94.50'));
      assert.ok(await evaluar(textoIncluye('Confirmada · S/ 5.50 aportados')));await cerrar();
    });
    await caso(`datos de la partida y selector Dire ${w}x${h}`,async()=>{
      await abrir(`/salas/${room}/partida`);
      await evaluar(`document.querySelector('dialog input[value="2"]').click()`);
      await esperar(textoIncluye('Ofrecer S/ 5.50 a Dire'));await clickTexto('Ofrecer S/ 5.50 a Dire');
      await esperar(textoIncluye('Oferta publicada.'));await esperar(textoIncluye('Esperando rival · sin cobro'));
      await clickTexto('Cancelar oferta');await esperar(textoIncluye('Oferta cancelada.'));await medir('partida',w,h);await cerrar();
    });
  }
  await caso('varias ofertas pendientes del mismo usuario sin bloquear el botón',async()=>{
    bets=original();saldo=10000;await abrir();
    await clickTexto('Ofrecer S/ 5.50 a Radiant');await esperar(textoIncluye('Oferta publicada.'));
    await clickTexto('Ofrecer S/ 5.50 a Radiant');
    await esperar(`document.querySelectorAll('dialog button').length>0&&[...document.querySelectorAll('dialog button')].filter(b=>b.textContent==='Cancelar oferta').length===2`);
    assert.equal(saldo,10000);await cerrar();
  });
  await caso('paginación de ofertas, apuestas propias y cruces públicos sin recortes',async()=>{
    const plantilla=original();
    bets=Array.from({length:55},(_,i)=>({...plantilla[0],id:randomUUID(),creador:perfil(`Rival ${i+1}`)}));
    bets.push(...Array.from({length:35},(_,i)=>({...plantilla[0],id:randomUUID(),creador_id:uid,creador:perfil(`Propia ${i+1}`)})));
    bets.push(...Array.from({length:25},(_,i)=>({...plantilla[1],id:randomUUID(),creador:perfil(`Cruce ${i+1}`)})));
    await abrir();
    await esperar(`document.querySelector('nav[aria-label="Páginas de ofertas"]')?.innerText.includes('1 / 6')`);
    await evaluar(`document.querySelector('nav[aria-label="Páginas de ofertas"] button:last-child').click()`);
    await esperar(`document.querySelector('nav[aria-label="Páginas de ofertas"]')?.innerText.includes('2 / 6')`);
    await esperar(`document.querySelector('nav[aria-label="Páginas de mis apuestas"]')?.innerText.includes('1 / 6')`);
    await evaluar(`document.querySelector('nav[aria-label="Páginas de mis apuestas"] button:last-child').click()`);
    await esperar(`document.querySelector('nav[aria-label="Páginas de mis apuestas"]')?.innerText.includes('2 / 6')`);
    await esperar(`document.querySelector('dialog [data-apuestas-publicas]')?.innerText.includes('1 / 3')`);
    await evaluar(`document.querySelector('dialog [data-apuestas-publicas] button:last-child').click()`);
    await esperar(`document.querySelector('dialog [data-apuestas-publicas]')?.innerText.includes('2 / 3')`);
    await cerrar();bets=original();
  });
  await caso('vacío, saldo insuficiente y sin cobro',async()=>{sinOfertas=true;saldo=549;await abrir();await esperar(textoIncluye('Necesitas S/ 5.50'));assert.ok(await evaluar(`!![...document.querySelectorAll('dialog button')].find(b=>b.textContent.includes('Ofrecer')&&b.disabled)`));await cerrar();sinOfertas=false;saldo=10000;});
  await caso('error de aceptación de oferta ya tomada',async()=>{bets=original();falloAceptar=true;await abrir();await clickTexto('Apostar a Radiant');await clickTexto('Confirmar apuesta · S/ 5.50');await esperar(textoIncluye('Esta oferta ya no está disponible'));await cerrar();falloAceptar=false;});
  await caso('SQL pendiente: aviso claro y botones de dinero deshabilitados',async()=>{faltante=true;await abrir();await esperar(textoIncluye('todavía no están habilitadas'));assert.equal(await evaluar(`document.querySelectorAll('dialog input[type="radio"]').length`),0);await cerrar();faltante=false;});
  await caso('después de 25 minutos solo muestra historial y deshabilita nuevas apuestas',async()=>{
    sala.iniciada_at=new Date(Date.now()-25*60000-1000).toISOString();bets=original();await abrir();
    await esperar(textoIncluye('Apuestas cerradas:'));
    assert.equal(await evaluar(`document.querySelectorAll('dialog input[type="radio"]').length`),0);
    assert.ok(await evaluar(`document.querySelector('dialog [data-apuesta-cruce]')!==null`));
    await cerrar();sala.iniciada_at=new Date(Date.now()-20*60000).toISOString();
  });
  await caso('sin sesión: cruces públicos con ambos avatares/nicks y cierre con Escape',async()=>{
    bets=original();autenticado=false;await abrir('/?anon');await esperar(textoIncluye('Inicia sesión para apostar'));
    await esperar(`document.querySelectorAll('[data-apuesta-cruce]').length>=3`);
    assert.equal(await evaluar(`document.querySelectorAll('dialog input[type="radio"]').length`),0);
    assert.ok(await evaluar(`document.querySelector('dialog [data-apuesta-cruce]')?.innerText.includes('Rival QA')&&document.querySelector('dialog [data-apuesta-cruce]')?.innerText.includes('Jugador QA')`));
    assert.equal(await evaluar(`document.querySelector('dialog [data-apuesta-cruce]').querySelectorAll('img').length`),2);
    await medir('sin-sesion',360,800);await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await esperar(`!document.querySelector('dialog[open]')`);
  });
  assert.deepEqual(errores,[],`Errores de consola: ${errores.join('\n')}`);
  console.log(`\n${total}/${total} casos UI OK; fixtures aislados, sin escrituras reales.`);
}finally{ws.close();await fetch(`${cdp}/json/close/${pagina.id}`);}
