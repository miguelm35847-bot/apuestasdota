import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { crearTokenSteam, leerTokenSteam, challengeSteam, origenSteam } from '../../src/lib/steamState.ts';
import { getSteamLoginUrl, verifySteamOpenId } from '../../src/lib/steam.ts';
import { necesitaNickSocial, validarNickSocial, etiquetaCuenta } from '../../src/lib/acceso.ts';

let total=0;
const caso=async(nombre,fn)=>{await fn();total++;console.log(`[ok] ${nombre}`);};
const callback='https://www.kodigodota.com/api/auth/steam/callback?state=qa';
const original=globalThis.fetch, origenAnterior=process.env.NEXT_PUBLIC_APP_URL;
const params=()=>new URLSearchParams({
  'openid.ns':'http://specs.openid.net/auth/2.0','openid.mode':'id_res','openid.op_endpoint':'https://steamcommunity.com/openid/login',
  'openid.claimed_id':'https://steamcommunity.com/openid/id/76561198000000001','openid.identity':'https://steamcommunity.com/openid/id/76561198000000001',
  'openid.return_to':callback,'openid.assoc_handle':'qa','openid.sig':'qa',
  'openid.response_nonce':new Date().toISOString().replace(/\.\d{3}Z$/,'Z')+'qa',
  'openid.signed':'op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
});
try {
  globalThis.fetch=async(url,opciones)=>{assert.equal(String(url),'https://steamcommunity.com/openid/login');assert.equal(opciones.redirect,'error');assert.equal(new URLSearchParams(opciones.body).get('openid.mode'),'check_authentication');return new Response('is_valid:true\n');};
  await caso('prueba verificada en Steam',async()=>assert.equal(await verifySteamOpenId(params(),callback),'76561198000000001'));
  for(const [campo,valor] of [
    ['openid.ns','bad'],['openid.mode','cancel'],['openid.op_endpoint','https://evil.invalid'],['openid.return_to',callback+'bad'],
    ['openid.identity','https://steamcommunity.com/openid/id/76561198000000002'],['openid.claimed_id','https://evil.invalid/https://steamcommunity.com/openid/id/76561198000000001'],
    ['openid.claimed_id','https://steamcommunity.com/openid/id/76561198000000001/path'],['openid.signed','op_endpoint,identity'],
    ['openid.response_nonce','2000-01-01T00:00:00Zqa'],['openid.response_nonce','2099-01-01T00:00:00Zqa'],['openid.response_nonce','bad'],
  ])await caso('rechaza '+campo+': '+valor,async()=>{const p=params();p.set(campo,valor);assert.equal(await verifySteamOpenId(p,callback),null);});
  await caso('rechaza parámetros duplicados',async()=>{const p=params();p.append('openid.claimed_id',p.get('openid.claimed_id'));assert.equal(await verifySteamOpenId(p,callback),null);});
  for(const texto of ['is_valid:false','not_is_valid:true','is_valid:trueevil','is_valid:true\nis_valid:false'])await caso('rechaza confirmación falsa o ambigua',async()=>{globalThis.fetch=async()=>new Response(texto);assert.equal(await verifySteamOpenId(params(),callback),null);});
  await caso('error de red falla cerrado',async()=>{globalThis.fetch=async()=>{throw new Error('offline');};assert.equal(await verifySteamOpenId(params(),callback),null);});
  await caso('retorno y realm del proveedor exactos',()=>{const u=new URL(getSteamLoginUrl(callback,'nuevo'));assert.equal(u.origin,'https://steamcommunity.com');assert.equal(u.searchParams.get('openid.realm'),'https://www.kodigodota.com');assert.equal(new URL(u.searchParams.get('openid.return_to')).searchParams.get('state'),'nuevo');});
  await caso('state aleatorio y opaco',()=>{const a=crearTokenSteam();assert.notEqual(a.valor,crearTokenSteam().valor);assert.deepEqual(leerTokenSteam(a.valor),{id:a.id,hash:a.hash});});
  for(const invalido of [null,'','bad','not-a-uuid.'+'a'.repeat(43),'a'.repeat(5000)])await caso('rechaza token inválido',()=>assert.equal(leerTokenSteam(invalido),null));
  await caso('clave de navegador no es el hash enviado al servidor',()=>{const v=randomBytes(32).toString('base64url');assert.equal(challengeSteam(v).length,43);assert.notEqual(challengeSteam(v),v);assert.equal(challengeSteam('bad'),null);});
  delete process.env.NEXT_PUBLIC_APP_URL;
  await caso('origen local permitido',()=>assert.equal(origenSteam('http://127.0.0.1:3001/path'),'http://127.0.0.1:3001'));
  await caso('host público sin configurar falla cerrado',()=>assert.throws(()=>origenSteam('https://evil.invalid')));
  process.env.NEXT_PUBLIC_APP_URL='https://www.kodigodota.com';
  await caso('proxy no sustituye el origen configurado',()=>assert.equal(origenSteam('https://evil.invalid'),'https://www.kodigodota.com'));
  const id='11111111-2222-4333-8444-555555555555';
  await caso('nick propio y provisional Steam',()=>{assert.ok(necesitaNickSocial(id,'jugador_111111112222'));assert.ok(validarNickSocial('jugador_111111112222',id));assert.equal(validarNickSocial('JugadorReal',id),null);});
  await caso('el perfil oculta el correo técnico',()=>{assert.equal(etiquetaCuenta({email:id+'@steam.kodigodota.invalid',app_metadata:{steam_creada:true}}),'Acceso con Steam');assert.equal(etiquetaCuenta({email:'persona@example.test'}),'persona@example.test');});
  console.log(`${total}/${total} casos Steam correctos`);
}finally{globalThis.fetch=original;if(origenAnterior===undefined)delete process.env.NEXT_PUBLIC_APP_URL;else process.env.NEXT_PUBLIC_APP_URL=origenAnterior;}
