#!/usr/bin/env node
// Steam y Supabase están interceptados: no crea cuentas, vincula identidades ni mueve saldo.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const base=new URL(process.env.QA_BASE??'http://127.0.0.1:3001').origin;
const auth=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
const cdp=process.env.QA_CDP??'http://127.0.0.1:9222';
const userId='22000000-0000-4000-8000-000000000001';
const roomId='11000000-0000-4000-8000-000000000001';
const key=`sb-${new URL(auth).hostname.split('.')[0]}-auth-token`;
const contexto='kodigodota-steam-acceso-v1';
const pkce='kodigodota-steam-';
const shots=`qa-artifacts/steam/ui-${Date.now()}`;
const payload=Buffer.from(JSON.stringify({sub:userId,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
const token=`eyJhbGciOiJIUzI1NiJ9.${payload}.qa`;
const user={id:userId,aud:'authenticated',role:'authenticated',email:userId+'@steam.kodigodota.invalid',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email'],steam_creada:true},user_metadata:{},identities:[{provider:'email',user_id:userId,id:'qa-steam'}],created_at:new Date().toISOString()};
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
  if(url.origin==='https://steamcommunity.com'){
    await send('Fetch.fulfillRequest',{requestId,responseCode:302,responseHeaders:[{name:'location',value:base+'/login/steam'+(scenario.cancel?'?error=cancelado':'')}]});return;
  }
  if(url.origin!==auth&&url.origin!==base){failures.push('El despliegue apunta a un proyecto de Supabase inesperado');await send('Fetch.fulfillRequest',{requestId,responseCode:403,body:''});return;}
  const headers=[{name:'content-type',value:'application/json'},{name:'access-control-allow-origin',value:base},{name:'access-control-allow-headers',value:'*'},{name:'access-control-allow-methods',value:'GET,POST,HEAD,OPTIONS'},{name:'access-control-expose-headers',value:'content-range'},{name:'content-range',value:'0-0/0'}];
  if(request.method==='OPTIONS'){await send('Fetch.fulfillRequest',{requestId,responseCode:204,responseHeaders:headers});return;}
  calls.push({path:url.pathname,method:request.method,query:url.search,body:request.postData?JSON.parse(request.postData):null});
  let status=200,data=[];
  if(['/api/auth/steam/login','/api/auth/steam/start'].includes(url.pathname)){
    const body=JSON.parse(request.postData);assert.match(body.challenge,/^[A-Za-z0-9_-]{43}$/);
    if(url.pathname.endsWith('/start'))assert.equal(Object.entries(request.headers).find(([name])=>name.toLowerCase()==='authorization')?.[1],`Bearer ${token}`);
    scenario.challenge=body.challenge;scenario.next=body.next;
    data={url:'https://steamcommunity.com/openid/login?state=qa-state'};
  }else if(url.pathname==='/api/auth/steam/session'){
    const body=JSON.parse(request.postData);assert.equal(createHash('sha256').update(body.verificador).digest('base64url'),scenario.challenge);
    if(scenario.tokenError){status=401;data={error:'El acceso con Steam venció o no es válido. Vuelve a intentarlo.'};}
    else data=scenario.link?{userId,vinculo:true,next:'/perfil?steam=linked'}:{userId:scenario.wrongUser?'33000000-0000-4000-8000-000000000001':userId,access_token:token,refresh_token:'qa-refresh',next:scenario.next};
  }else if(endpoint==='user') data=scenario.changedUser?{...user,id:'33000000-0000-4000-8000-000000000001'}:user;
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
  else if(url.pathname==='/api/perfil/steam')data={vinculado:true};
  else if(url.pathname==='/api/steam/sync')data={steamId:null,avatarUrl:null,nombre:null,perfilUrl:null};
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
async function clickSteam(){await wait("[...document.querySelectorAll('button')].some(e=>e.textContent.includes('Continuar con Steam'))");await evaluate("[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Continuar con Steam')).click()");}
async function input(selector,value){await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await send('Input.insertText',{text:value});}
async function screenshot(name,width,height){
  await evaluate('document.fonts.ready.then(()=>true)');
  assert.equal(await evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth'),0);
  const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${shots}/${name}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
}
async function test(name,fn){await fn();assert.deepEqual(failures,[]);total++;console.log(`[ok] ${name}`);}
const exchanges=()=>calls.filter(c=>c.path.endsWith('/session')).length;
const nickWrites=()=>calls.filter(c=>c.path.endsWith('/actualizar_nick')).length;
try{
  await test('retorno HTTP de Steam sin caché ni referencia de navegación',async()=>{
    const r=await fetch(base+'/api/auth/steam/callback',{redirect:'manual'});
    assert.equal(r.status,307);assert.equal(new URL(r.headers.get('location')).pathname,'/login/steam');
    assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.match(r.headers.get('cache-control'),/no-store/);
  });
  await mkdir(shots,{recursive:true});await send('Page.enable');await send('Runtime.enable');
  await send('Fetch.enable',{patterns:[{urlPattern:'https://*.supabase.co/*',requestStage:'Request'},{urlPattern:base+'/api/*',requestStage:'Request'},{urlPattern:'https://steamcommunity.com/openid/login*',requestStage:'Request'}]});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin===${JSON.stringify(base)})window.WebSocket=class extends EventTarget{static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;readyState=0;send(){}close(){this.readyState=3;}};`});
  for(const [width,height] of [[1366,768],[390,844],[360,800]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
    for(const path of ['/login','/register'])await test(`botón Steam y tema sin overflow ${path} ${width}x${height}`,async()=>{
      await fresh(path);await wait("document.body.innerText.includes('Continuar con Steam')");
      await wait("getComputedStyle(document.querySelector('main,form')).fontFamily.includes('Manrope')");
      assert.match(await evaluate("getComputedStyle(document.querySelector('main,form')).fontFamily"),/Manrope/);
      await screenshot(path.slice(1),width,height);
    });
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
  await test('cuenta existente: clave de navegador, mismo UUID, retorno a sala y sin cambiar nick',async()=>{
    const next=`/salas/${roomId}/partida`;await fresh('/login?next='+encodeURIComponent(next));await clickSteam();
    await wait(`location.pathname===${JSON.stringify(next)}`);assert.equal(exchanges(),1);assert.equal(nickWrites(),0);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)})).user.id`),userId);
    assert.equal(await evaluate(`Object.keys(sessionStorage).filter(k=>k.startsWith(${JSON.stringify(pkce)})||k===${JSON.stringify(contexto)}).length`),0);
    assert.ok(!await evaluate("location.href.includes('access_token')||location.href.includes('code=')"));
  });
  await test('cuenta nueva: nick propio, validación, colisión y guardado confirmado',async()=>{
    await fresh('/register',{nick:'jugador_220000000000'});await clickSteam();await wait("document.querySelector('#steam-nick')");
    assert.equal(exchanges(),1);assert.equal(nickWrites(),0);assert.equal(await evaluate('location.search'),'');
    await screenshot('nick',1366,768);
    for(const [width,height] of [[390,844],[360,800]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await screenshot('nick',width,height);}
    await input('#steam-nick','ab');await evaluate("document.querySelector('form').requestSubmit()");await wait("document.body.innerText.includes('entre 3 y 20')");assert.equal(nickWrites(),0);
    await evaluate("document.querySelector('#steam-nick').focus();document.querySelector('#steam-nick').select()");await send('Input.insertText',{text:'NickOcupado'});scenario.taken=true;
    await evaluate("document.querySelector('form').requestSubmit()");await wait("document.body.innerText.includes('ya está en uso')");
    scenario.taken=false;await evaluate("document.querySelector('#steam-nick').focus();document.querySelector('#steam-nick').select()");await send('Input.insertText',{text:'MiNickNuevo'});
    await evaluate("document.querySelector('form').requestSubmit()");await wait("location.pathname==='/'");assert.equal(scenario.nick,'MiNickNuevo');assert.equal(exchanges(),1);
  });
  await test('cancelar Steam limpia el retorno y permite volver a iniciar sesión',async()=>{
    await fresh('/login',{cancel:true});await clickSteam();await wait("document.body.innerText.includes('Cancelaste el acceso')");
    assert.equal(exchanges(),0);assert.equal(await evaluate('location.search+location.hash'),'');assert.ok(!await evaluate("document.body.innerText.includes('private-provider-detail')"));
  });
  await test('recargar la elección de nick reanuda la sesión sin repetir la entrega',async()=>{
    await fresh('/register?next=%2Fperfil%23steam',{nick:'jugador_220000000000'});await clickSteam();await wait("document.querySelector('#steam-nick')");
    await send('Page.reload');await wait("document.querySelector('#steam-nick')");assert.equal(exchanges(),1);
    await input('#steam-nick','NickRecargado');await evaluate("document.querySelector('form').requestSubmit()");await wait("location.pathname==='/perfil'");
    assert.equal(await evaluate('location.hash'),'#steam');assert.equal(scenario.nick,'NickRecargado');
  });
  await test('contexto vencido o corrupto no intercambia códigos',async()=>{
    for(const value of [JSON.stringify({creado:Date.now()-3600000,next:'/'}),'{invalid-json','null','[]']){
      await fresh('/login');await evaluate(`sessionStorage.setItem(${JSON.stringify(contexto)},${JSON.stringify(value)})`);
      await send('Page.navigate',{url:base+'/login/steam?code=qa-code'});await wait("document.body.innerText.includes('venció o no es válido')");assert.equal(exchanges(),0);
    }
  });
  await test('código rechazado no crea sesión ni pide un nick',async()=>{
    await fresh('/login',{tokenError:true});await clickSteam();await wait("document.body.innerText.includes('venció o no es válido')");assert.equal(exchanges(),1);assert.equal(nickWrites(),0);
  });
  await test('callback directo sin contexto rechaza el código',async()=>{
    await fresh('/login/steam?code=qa-code');await wait("document.body.innerText.includes('venció o no es válido')");assert.equal(exchanges(),0);
  });
  await test('error de perfil permite reintentar sin gastar el código dos veces',async()=>{
    await fresh('/login',{profileError:true});await clickSteam();await wait("document.body.innerText.includes('No se pudo cargar tu perfil')");
    scenario.profileError=false;await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Reintentar').click()");await wait("location.pathname==='/'");assert.equal(exchanges(),1);
  });
  await test('perfil ausente no se crea en el navegador',async()=>{
    await fresh('/login',{missingProfile:true});await clickSteam();await wait("document.body.innerText.includes('No se pudo cargar tu perfil')");assert.equal(nickWrites(),0);
  });
  await test('cuenta bloqueada no entra y cierra solo la sesión local',async()=>{
    await fresh('/login',{banned:true});await clickSteam();await wait("document.body.innerText.includes('Tu cuenta no puede ingresar')");assert.equal(nickWrites(),0);assert.ok(calls.some(c=>c.path.endsWith('/logout')&&c.query.includes('scope=local')));
  });
  await test('cambio de usuario antes de guardar nick no modifica otro perfil',async()=>{
    await fresh('/register',{nick:'jugador_220000000000'});await clickSteam();await wait("document.querySelector('#steam-nick')");scenario.changedUser=true;
    await input('#steam-nick','NickSeguro');await evaluate("document.querySelector('form').requestSubmit()");await wait("document.body.innerText.includes('Tu sesión cambió')");assert.equal(nickWrites(),0);
  });
  await test('sesión de otro UUID se rechaza',async()=>{
    await fresh('/login',{wrongUser:true});await clickSteam();await wait("document.body.innerText.includes('No se pudo verificar tu sesión')");assert.equal(nickWrites(),0);
  });
  await test('el acceso por correo conserva la detección de recuperación de contraseña',async()=>{
    await fresh('/recuperar?cambiar=1#access_token='+token+'&refresh_token=qa-refresh&expires_in=3600&token_type=bearer&type=recovery');
    await wait("document.body.innerText.includes('Nueva contraseña')");assert.equal(exchanges(),0);
  });
  for(const cancel of [false,true])await test(cancel?'cancelar vínculo conserva la sesión actual':'vincular desde perfil conserva UUID y no cambia la sesión',async()=>{
    await fresh('/login',{link:true,cancel});
    await evaluate(`localStorage.setItem(${JSON.stringify(key)},JSON.stringify(${JSON.stringify({access_token:token,refresh_token:'qa-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})}));true`);
    await send('Page.navigate',{url:base+'/perfil'});await wait("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Vincular con Steam'))");
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Vincular con Steam')).click()");
    if(cancel){await wait("document.body.innerText.includes('Cancelaste el acceso')");assert.equal(exchanges(),0);}
    else{await wait("location.pathname==='/perfil'&&location.search==='?steam=linked'");assert.equal(exchanges(),1);}
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)})).user.id`),userId);
    assert.ok(!calls.some(c=>c.path.endsWith('/logout')));
  });
  console.log(`${total}/${total} casos Steam OK · ${shots} · sin cuentas reales ni dinero`);
}finally{await evaluate('localStorage.clear();sessionStorage.clear();true').catch(()=>{});ws.close();await fetch(`${cdp}/json/close/${tab.id}`);}
