// Handlers reales + PostgreSQL aislado. Auth y Steam son proveedores simulados;
// ninguna credencial, identidad o solicitud sale a servicios remotos.
import assert from 'node:assert/strict';
import { registerHooks, createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import ts from 'typescript';
import { abrirPostgresSteam, literal } from './steam-fixture.mjs';

const raiz=path.resolve('.');
registerHooks({
  resolve(spec,context,next){if(spec.startsWith('@/'))return {url:pathToFileURL(path.join(raiz,'src',spec.slice(2)+'.ts')).href,shortCircuit:true};if(spec==='next/server')return next('next/server.js',context);return next(spec,context);},
  load(url,context,next){if(url.startsWith(pathToFileURL(path.join(raiz,'src')).href)&&url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};return next(url,context);},
});
process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='qa-anon';process.env.SUPABASE_SERVICE_ROLE_KEY='qa-service';
process.env.NEXT_PUBLIC_APP_URL='https://www.kodigodota.com';process.env.STEAM_API_KEY='';
const origen=process.env.NEXT_PUBLIC_APP_URL,db=await abrirPostgresSteam();
const {NextRequest}=createRequire(import.meta.url)('next/server');
const original=globalThis.fetch;
let total=0,seq=0,creados=0,emitidas=0,steamValido=true,malId=false,sinConfirmar=false,conMfa=false;
const titulares=new Map(),enlaces=new Map();
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const usuario=async id=>{const t=await db.sql(`select jsonb_build_object('id',id,'email',email,'app_metadata',coalesce(raw_app_meta_data,'{}'),'user_metadata',coalesce(raw_user_meta_data,'{}'),'aud','authenticated','role','authenticated','created_at',clock_timestamp()) from auth.users where id=${literal(id)}`);return t?{...JSON.parse(t),email_confirmed_at:sinConfirmar?null:new Date().toISOString(),factors:conMfa?[{status:'verified'}]:[]}:null;};
const alta=async(id,email,nick)=>db.sql(`insert into auth.users(id,email,raw_user_meta_data) values(${literal(id)},${literal(email)},${literal({nick})}::jsonb)`);
const rpcArgs={steam_auth_iniciar:['p_id','p_state_hash','p_challenge','p_proposito','p_usuario','p_origen','p_siguiente','p_remoto_hash'],steam_auth_tomar:['p_id','p_state_hash','p_origen','p_nonce_hash'],steam_auth_preparar:['p_id','p_state_hash','p_steam','p_entrega_hash'],steam_auth_consumir:['p_id','p_entrega_hash','p_challenge','p_usuario'],steam_cuenta_reservar:['p_steam'],steam_cuenta_vincular:['p_steam','p_usuario','p_avatar','p_nombre']};
globalThis.fetch=async(input,init={})=>{
  const url=new URL(String(input));const headers=new Headers(init.headers);const method=init.method??'GET';
  if(url.origin==='https://steamcommunity.com'){assert.equal(url.pathname,'/openid/login');return new Response(`is_valid:${steamValido}\n`);}
  assert.equal(url.origin,'http://127.0.0.1:54321','No se permiten servicios reales');
  const body=init.body?JSON.parse(String(init.body)):{};
  const autorizacion=headers.get('authorization');
  if(url.pathname.startsWith('/rest/v1/rpc/')){
    assert.equal(autorizacion,'Bearer qa-service');const nombre=url.pathname.split('/').pop();assert.ok(rpcArgs[nombre]);
    try{const r=await db.rpc(nombre,rpcArgs[nombre].map(k=>body[k]));return json(r?(nombre==='steam_auth_consumir'?JSON.parse(r):r):null);}catch(e){return json({message:e.message,code:'P0001'},400);}
  }
  if(url.pathname==='/rest/v1/profiles'){
    const id=url.searchParams.get('id')?.replace(/^eq\./,'');const t=await db.sql(`select coalesce(jsonb_agg(to_jsonb(p)),'[]') from profiles p where id=${literal(id)}`);return json(JSON.parse(t));
  }
  if(url.pathname==='/auth/v1/user'){
    const id=titulares.get(autorizacion?.replace(/^Bearer /,''));return id?json(await usuario(id)):json({code:'bad_jwt',msg:'Invalid token'},401);
  }
  if(url.pathname.startsWith('/auth/v1/admin/'))assert.equal(autorizacion,'Bearer qa-service');
  if(url.pathname==='/auth/v1/admin/users'&&method==='POST'){
    try{await db.sql(`insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values(${literal(body.id)},${literal(body.email)},${literal(body.user_metadata)}::jsonb,${literal(body.app_metadata)}::jsonb)`);creados++;return json(await usuario(body.id));}catch{return json({code:'user_already_exists',msg:'Already exists'},422);}
  }
  if(url.pathname.startsWith('/auth/v1/admin/users/')){const u=await usuario(url.pathname.split('/').pop());return u?json(u):json({code:'user_not_found',msg:'User not found'},404);}
  if(url.pathname==='/auth/v1/admin/generate_link'){
    const id=await db.sql(`select id from auth.users where email=${literal(body.email)}`);assert.ok(id,'No genera enlaces para usuarios desconocidos');const hashed=randomUUID();enlaces.set(hashed,id);return json({...await usuario(id),...(malId?{id:randomUUID()}:{}),hashed_token:hashed,action_link:'https://unused.invalid',verification_type:'magiclink'});
  }
  if(url.pathname==='/auth/v1/verify'){
    assert.equal(body.type,'email');const id=enlaces.get(body.token_hash);assert.ok(id);enlaces.delete(body.token_hash);emitidas++;
    const token=Buffer.from('header').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture';titulares.set(token,id);
    return json({access_token:token,refresh_token:randomUUID(),expires_in:3600,token_type:'bearer',user:await usuario(id)});
  }
  throw new Error('Petición inesperada: '+url.pathname);
};
const caso=async(nombre,fn)=>{await fn();total++;console.log(`[ok] ${nombre}`);};
const h=valor=>createHash('sha256').update(valor).digest('base64url');
const cookie=(res,nombre)=>res.cookies.get(nombre)?.value;
const {POST:login}=await import('../../src/app/api/auth/steam/login/route.ts');
const {POST:vincular}=await import('../../src/app/api/auth/steam/start/route.ts');
const {GET:callback}=await import('../../src/app/api/auth/steam/callback/route.ts');
const {POST:completar}=await import('../../src/app/api/auth/steam/session/route.ts');
const req=(ruta,body,cookies='',token=null,origin=origen)=>new NextRequest(origen+ruta,{method:'POST',headers:{origin,'content-type':'application/json',cookie:cookies,'x-forwarded-for':`127.0.0.${++seq}`,...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
async function inicio(token=null){const verificador=randomBytes(32).toString('base64url');const r=await (token?vincular:login)(req('/api/auth/steam/'+(token?'start':'login'),{challenge:h(verificador),next:'/salas/qa'},'',token));assert.equal(r.status,200);const datos=await r.json();return {verificador,state:cookie(r,'steam_oauth_state'),url:new URL(datos.url),res:r};}
async function vuelta(i,steam='76561198000000101',cambiar){const u=new URL(i.url.searchParams.get('openid.return_to'));u.searchParams.set('openid.ns','http://specs.openid.net/auth/2.0');u.searchParams.set('openid.mode','id_res');u.searchParams.set('openid.op_endpoint','https://steamcommunity.com/openid/login');u.searchParams.set('openid.claimed_id','https://steamcommunity.com/openid/id/'+steam);u.searchParams.set('openid.identity','https://steamcommunity.com/openid/id/'+steam);u.searchParams.set('openid.return_to',i.url.searchParams.get('openid.return_to'));u.searchParams.set('openid.response_nonce',new Date().toISOString().replace(/\.\d{3}Z$/,'Z')+randomUUID());u.searchParams.set('openid.assoc_handle','fixture');u.searchParams.set('openid.signed','op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle');u.searchParams.set('openid.sig','fixture');if(cambiar)cambiar(u);return callback(new NextRequest(u,{headers:{cookie:'steam_oauth_state='+i.state}}));}
const entregar=(i,r,token=null,verificador=i.verificador)=>completar(req('/api/auth/steam/session',{verificador},'steam_login_handoff='+cookie(r,'steam_login_handoff'),token));
try {
  await caso('origen ajeno no inicia acceso',async()=>assert.equal((await login(req('/api/auth/steam/login',{challenge:h('qa')},'',null,'https://evil.invalid'))).status,403));
  await caso('vincular exige sesión',async()=>assert.equal((await vincular(req('/api/auth/steam/start',{challenge:h('qa')}))).status,401));
  await caso('challenge inválido rechazado',async()=>assert.equal((await login(req('/api/auth/steam/login',{challenge:'bad'}))).status,400));
  await caso('inicio no crea usuarios ni devuelve credenciales',async()=>{const i=await inicio();assert.match(i.res.headers.get('set-cookie'),/HttpOnly/);assert.match(i.res.headers.get('set-cookie'),/Secure/);assert.equal(i.url.origin,'https://steamcommunity.com');assert.equal(creados,0);assert.equal(emitidas,0);});
  await caso('proveedor inválido no crea ni autentica',async()=>{const i=await inicio();steamValido=false;const r=await vuelta(i);steamValido=true;assert.ok(r.headers.get('location').includes('error=invalido'));assert.equal(creados,0);});
  await caso('retorno manipulado no entrega prueba',async()=>{const i=await inicio();const r=await vuelta(i,undefined,u=>u.searchParams.set('openid.return_to','https://evil.invalid'));assert.ok(r.headers.get('location').includes('error=invalido'));});
  let i=await inicio(),r=await vuelta(i),id;
  await caso('callback limpia URL y cookies sin emitir tokens',async()=>{assert.equal(r.headers.get('location'),origen+'/login/steam');assert.ok(cookie(r,'steam_login_handoff'));assert.equal(emitidas,0);assert.equal(r.headers.get('cache-control'),'no-store');});
  await caso('otra clave no completa la misma prueba',async()=>assert.equal((await entregar(i,r,null,randomBytes(32).toString('base64url'))).status,401));
  await caso('alta con Steam entrega sesión y perfil sin MMR inventado',async()=>{const res=await entregar(i,r);assert.equal(res.status,200);const d=await res.json();id=d.userId;assert.ok(d.access_token);assert.ok(d.refresh_token);assert.equal(d.next,'/salas/qa');assert.ok(!JSON.stringify(d).includes('7656119'));assert.equal(await db.sql(`select (mmr is null)::text from profiles where id=${literal(id)}`),'true');assert.equal(creados,1);});
  await caso('repetir entrega no emite otra sesión',async()=>{const n=emitidas;assert.equal((await entregar(i,r)).status,401);assert.equal(emitidas,n);});
  await db.sql(`update profiles set nick='NickConservado',mmr=4500 where id=${literal(id)};insert into movimientos_billetera values(${literal(id)},13600)`);
  await caso('ingreso existente conserva UUID, nick, MMR y saldo',async()=>{const j=await inicio(),c=await vuelta(j);const d=await (await entregar(j,c)).json();assert.equal(d.userId,id);assert.equal(await db.sql(`select nick||':'||mmr||':'||(select sum(monto) from movimientos_billetera where user_id=p.id) from profiles p where id=${literal(id)}`),'NickConservado:4500:13600');assert.equal(creados,1);});
  await caso('dos altas concurrentes convergen a una cuenta',async()=>{const a=await inicio(),b=await inicio(),ra=await vuelta(a,'76561198000000102'),rb=await vuelta(b,'76561198000000102');const resultados=await Promise.all([entregar(a,ra),entregar(b,rb)]);assert.deepEqual(resultados.map(x=>x.status),[200,200]);const [da,dbb]=await Promise.all(resultados.map(x=>x.json()));assert.equal(da.userId,dbb.userId);assert.equal(creados,2);});
  const existente=randomUUID(),otro=randomUUID();await alta(existente,'existente@example.test','Existente');await alta(otro,'otro@example.test','Otro');titulares.set('sesion-a',existente);titulares.set('sesion-b',otro);
  await caso('cambio de sesión impide vincular a otra cuenta',async()=>{const j=await inicio('sesion-a'),c=await vuelta(j,'76561198000000103');assert.equal((await entregar(j,c,'sesion-b')).status,401);const d=await (await entregar(j,c,'sesion-a')).json();assert.equal(d.userId,existente);assert.equal(d.vinculo,true);assert.ok(!d.access_token);assert.equal(await db.sql(`select steam_id from profiles where id=${literal(existente)}`),'76561198000000103');});
  await caso('cuenta bloqueada no recibe sesión',async()=>{await db.sql(`update profiles set baneado=true where id=${literal(id)}`);const j=await inicio(),c=await vuelta(j),n=emitidas;assert.equal((await entregar(j,c)).status,503);assert.equal(emitidas,n);await db.sql(`update profiles set baneado=false where id=${literal(id)}`);});
  await caso('enlace Auth de otro UUID se rechaza',async()=>{const j=await inicio(),c=await vuelta(j),n=emitidas;malId=true;assert.equal((await entregar(j,c)).status,503);malId=false;assert.equal(emitidas,n);});
  await caso('Steam no confirma un correo real pendiente',async()=>{const j=await inicio(),c=await vuelta(j),n=emitidas;sinConfirmar=true;assert.equal((await entregar(j,c)).status,401);sinConfirmar=false;assert.equal(emitidas,n);});
  await caso('Steam no omite un segundo factor existente',async()=>{const j=await inicio(),c=await vuelta(j),n=emitidas;conMfa=true;assert.equal((await entregar(j,c)).status,401);conMfa=false;assert.equal(emitidas,n);});
  console.log(`${total}/${total} casos API Steam correctos · Auth/Steam simulados y PostgreSQL aislado`);
}finally{globalThis.fetch=original;await db.cerrar();}
