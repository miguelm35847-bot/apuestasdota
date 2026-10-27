#!/usr/bin/env node
// Supabase está interceptado: no crea cuentas, vincula identidades ni mueve saldo.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const base=new URL(process.env.QA_BASE??'http://127.0.0.1:3001').origin;
const auth=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
const cdp=process.env.QA_CDP??'http://127.0.0.1:9222';
const userId='22000000-0000-4000-8000-000000000001';
const roomId='11000000-0000-4000-8000-000000000001';
const shots=`qa-artifacts/login-volver/ui-${Date.now()}`;
const payload=Buffer.from(JSON.stringify({sub:userId,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
const token=`eyJhbGciOiJIUzI1NiJ9.${payload}.qa`;
const user={id:userId,aud:'authenticated',role:'authenticated',email:'qa-google@example.test',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'google',providers:['google']},user_metadata:{},identities:[{provider:'google',user_id:userId,id:'qa-google'}],created_at:new Date().toISOString()};
let scenario={},calls=[],failures=[],seq=0,total=0;
const pending=new Map();
const tab=await(await fetch(`${cdp}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
ws.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.id){const p=pending.get(message.id);pending.delete(message.id);if(message.error)p?.reject(new Error(JSON.stringify(message.error)));else p?.resolve(message.result);return;}
  if(message.method==='Fetch.requestPaused')void respond(message.params).catch(error=>failures.push(error.message));
  if(message.method==='Runtime.exceptionThrown')failures.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text);
  if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')failures.push(message.params.args.map(a=>a.value??a.description).join(' '));
});
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
async function wait(expression){for(let i=0;i<120;i++){if(await evaluate(`Boolean(${expression})`))return;await sleep(100);}throw new Error(`No apareció: ${expression}`);}
async function respond({requestId,request}){
  const url=new URL(request.url),endpoint=url.pathname.split('/').pop();
  if(url.origin!==auth&&url.origin!==base){failures.push('El despliegue apunta a un proyecto de Supabase inesperado');await send('Fetch.fulfillRequest',{requestId,responseCode:403,body:''});return;}
  const headers=[{name:'content-type',value:'application/json'},{name:'access-control-allow-origin',value:base},{name:'access-control-allow-headers',value:'*'},{name:'access-control-allow-methods',value:'GET,POST,HEAD,OPTIONS'},{name:'access-control-expose-headers',value:'content-range'},{name:'content-range',value:'0-0/0'}];
  if(request.method==='OPTIONS'){await send('Fetch.fulfillRequest',{requestId,responseCode:204,responseHeaders:headers});return;}
  calls.push({path:url.pathname,method:request.method,query:url.search,body:request.postData?JSON.parse(request.postData):null});
  let status=200,data=[];
  if(endpoint==='authorize'){
    assert.equal(url.searchParams.get('provider'),'google');
    assert.equal(url.searchParams.get('code_challenge_method'),'s256');
    assert.equal(url.searchParams.get('redirect_to'),base+'/login/google');
    scenario.challenge=url.searchParams.get('code_challenge');
    const target=base+'/login/google'+(scenario.cancel?'?error=access_denied&error_description=private-provider-detail':'?code=qa-code');
    await send('Fetch.fulfillRequest',{requestId,responseCode:302,responseHeaders:[{name:'location',value:target}]});return;
  }
  if(endpoint==='token'){
    assert.equal(url.searchParams.get('grant_type'),'password');
    if(scenario.credencialesInvalidas){status=400;data={code:'invalid_credentials',msg:'Invalid login credentials'};}
    else data={access_token:token,refresh_token:'qa-refresh',expires_in:3600,token_type:'bearer',user};
  }else if(endpoint==='user') data=scenario.changedUser?{...user,id:'33000000-0000-4000-8000-000000000001'}:scenario.noGoogle?{...user,identities:[]} : user;
  else if(endpoint==='profiles'){
    assert.equal(url.searchParams.get('id'),`eq.${userId}`);
    if(scenario.profileError){status=503;data={message:'Profile unavailable'};}
    else data=scenario.missingProfile?null:{nick:scenario.nick,baneado:!!scenario.banned,steam_avatar_url:null,steam_nombre:null,mmr:4500,roles_preferidos:[]};
  }else if(endpoint==='actualizar_nick'){
    const body=JSON.parse(request.postData);assert.deepEqual(Object.keys(body),['p_nick']);
    assert.equal(Object.entries(request.headers).find(([name])=>name.toLowerCase()==='authorization')?.[1],`Bearer ${token}`);
    if(scenario.taken){status=400;data={message:'Ese nick ya está en uso',code:'P0001'};}
    else {scenario.nick=body.p_nick;data=null;}
  }else if(endpoint==='es_admin') data=!!scenario.admin;
  else if(endpoint==='mi_saldo')data=10000;
  else if(endpoint==='logout')data={};
  else if(endpoint==='salas'&&url.searchParams.has('id'))data={id:roomId,nombre:'QA sala',estado:'en_juego',cupo:10,cuota:550,modalidad:'5v5',iniciada_at:new Date().toISOString()};
  else if(url.pathname==='/api/perfil/steam')data={vinculado:false};
  else if(!['GET','HEAD'].includes(request.method)&&!['es_admin','mi_saldo'].includes(endpoint)){failures.push(`Escritura inesperada: ${request.method} ${url.pathname}`);status=403;data={};}
  await send('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:headers,body:Buffer.from(JSON.stringify(data)).toString('base64')});
}
async function fresh(path='/login',options={}){
  scenario={nick:'JugadorExistente',...options};calls=[];failures=[];
  await send('Page.navigate',{url:base+'/login?qa-clean=1'});await wait("document.querySelector('button')");
  await evaluate('localStorage.clear();sessionStorage.clear();true');
  await send('Page.navigate',{url:base+path});await wait("document.querySelector('main,form')");
  await sleep(100);
}
async function input(selector,value){await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus();document.querySelector(${JSON.stringify(selector)}).select()`);await send('Input.insertText',{text:value});}
async function screenshot(name,width,height){
  await evaluate('document.fonts.ready.then(()=>true)');
  assert.equal(await evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth'),0);
  const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${shots}/${name}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
}
async function test(name,fn){await fn();assert.deepEqual(failures,[]);total++;console.log(`[ok] ${name}`);}


async function entrar(){
  await input('#email','qa@example.test');await input('#password','clave-ficticia');
  await evaluate("document.querySelector('form').requestSubmit()");
}
async function salirYVolver(){
  await wait("document.querySelector('nav button[aria-expanded]')");
  await evaluate("document.querySelector('nav button[aria-expanded]').click()");
  await wait("[...document.querySelectorAll('button')].some(b=>b.textContent==='Cerrar sesión')");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Cerrar sesión').click()");
  await wait("location.pathname==='/'&&[...document.querySelectorAll('nav a')].some(a=>a.getAttribute('href')==='/login')");
  await evaluate("document.querySelector('nav a[href=\"/login\"]').click()");
  await wait("location.pathname==='/login'&&document.querySelector('form')");
}
try{
  await mkdir(shots,{recursive:true});await send('Page.enable');await send('Runtime.enable');
  await send('Fetch.enable',{patterns:[{urlPattern:'https://*.supabase.co/*',requestStage:'Request'},{urlPattern:base+'/api/*',requestStage:'Request'}]});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin===${JSON.stringify(base)})window.WebSocket=class extends EventTarget{static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;readyState=0;send(){}close(){this.readyState=3;}};`});
  for(const [width,height] of [[1366,768],[390,844],[360,800]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
    await test(`entrar, salir y volver sin actualizar ${width}x${height}`,async()=>{
      await fresh('/login');await evaluate('window.__loginDocumento=42');await entrar();await wait("location.pathname==='/'");
      await salirYVolver();await sleep(300);
      assert.equal(await evaluate('window.__loginDocumento'),42,'No debe forzar una recarga');
      const listo=await evaluate("document.querySelector('form button[type=submit]').disabled===false&&document.querySelector('form button[type=submit]').textContent==='Iniciar sesión'");
      assert.equal(listo,true,'El botón quedó iniciando después de cerrar sesión');
      assert.equal(await evaluate("document.querySelector('#password').value"),'','La contraseña no debe conservarse al volver');
      await screenshot('volver',width,height);
      await entrar();await wait("location.pathname==='/'");
    });
  }
  await test('credenciales rechazadas permiten corregir y reintentar',async()=>{
    await fresh('/login',{credencialesInvalidas:true});await entrar();await wait("document.querySelector('[role=alert]')");
    assert.equal(await evaluate("document.querySelector('form button[type=submit]').disabled"),false);
    scenario.credencialesInvalidas=false;await evaluate("document.querySelector('form').requestSubmit()");await wait("location.pathname==='/'");
  });
  console.log(`${total}/${total} casos de reingreso correctos`);
}finally{await evaluate('localStorage.clear();sessionStorage.clear();true').catch(()=>{});ws.close();await fetch(`${cdp}/json/close/${tab.id}`);}
