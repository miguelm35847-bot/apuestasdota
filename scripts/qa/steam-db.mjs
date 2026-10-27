import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { abrirPostgresSteam, literal } from './steam-fixture.mjs';

const db=await abrirPostgresSteam();
const hash=v=>createHash('sha256').update(v).digest('hex');
const challenge=createHash('sha256').update('qa-browser').digest('base64url');
const origen='https://www.kodigodota.com';
let total=0;
const caso=async(nombre,fn)=>{await fn();total++;console.log(`[ok] ${nombre}`);};
const nueva=()=>({id:randomUUID(),state:hash(randomUUID()),entrega:hash(randomUUID()),nonce:hash(randomUUID()),remoto:hash(randomUUID())});
const iniciar=(i,usuario=null)=>db.rpc('steam_auth_iniciar',[i.id,i.state,challenge,usuario?'vincular':'login',usuario,origen,'/salas/qa',i.remoto]);
const preparar=async(i,steam='76561198000000001')=>{await db.rpc('steam_auth_tomar',[i.id,i.state,origen,i.nonce]);await db.rpc('steam_auth_preparar',[i.id,i.state,steam,i.entrega]);};
const consumir=(i,c=challenge,u=null)=>db.rpc('steam_auth_consumir',[i.id,i.entrega,c,u]);
const alta=async(id,nick)=>db.sql(`insert into auth.users(id,raw_user_meta_data) values(${literal(id)},${literal({nick})}::jsonb);`);
try {
  const a=randomUUID(),b=randomUUID();await alta(a,'JugadorA');await alta(b,'JugadorB');
  await db.sql(`update profiles set steam_id='76561198000000011',mmr=4500 where id=${literal(a)};insert into movimientos_billetera values(${literal(a)},13600);`);
  for(const rol of ['anon','authenticated']) {
    await caso(rol+' sin acceso directo a identidades',()=>assert.rejects(db.sql(`set role ${rol};select * from steam_auth.cuentas;`),/permission denied/));
    await caso(rol+' no puede crear pruebas ni reclamar identidades',async()=>{await assert.rejects(db.rpc('steam_cuenta_reservar',['76561198000000011'],rol),/permission denied/);await assert.rejects(db.rpc('steam_auth_iniciar',[randomUUID(),hash('x'),challenge,'login',null,origen,null,hash('ip')],rol),/permission denied/);});
  }
  await caso('funciones solo para servidor, search_path cerrado y RLS',async()=>{
    assert.equal(await db.sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='steam_auth' and c.relkind='r' and c.relrowsecurity"),'2');
    assert.equal(await db.sql("select count(*) from pg_proc where proname like 'steam_%' and not has_function_privilege('anon',oid,'execute') and not has_function_privilege('authenticated',oid,'execute') and has_function_privilege('service_role',oid,'execute')"),'6');
  });
  await caso('UUID existente conserva cuenta, MMR y saldo',async()=>{assert.equal(await db.rpc('steam_cuenta_reservar',['76561198000000011']),a);await db.rpc('steam_cuenta_vincular',['76561198000000011',a,null,null]);assert.equal(await db.sql(`select mmr||':'||(select sum(monto) from movimientos_billetera where user_id=p.id) from profiles p where id=${literal(a)}`),'4500:13600');});
  await caso('reservas simultáneas entregan el mismo UUID',async()=>{const ids=await Promise.all(Array.from({length:5},()=>db.rpc('steam_cuenta_reservar',['76561198000000012'])));assert.equal(new Set(ids).size,1);});
  await caso('vincular un Steam ajeno no cambia ninguna cuenta',async()=>{await assert.rejects(db.rpc('steam_cuenta_vincular',['76561198000000011',b,null,null]),/otra cuenta/);assert.equal(await db.sql(`select coalesce(steam_id,'vacío') from profiles where id=${literal(b)}`),'vacío');});
  await caso('reserva en alta no puede trasladarse a otro usuario',async()=>{await assert.rejects(db.rpc('steam_cuenta_vincular',['76561198000000012',b,null,null]),/otra cuenta/);});
  await caso('cambio verificado de Steam retira la asociación anterior',async()=>{await db.rpc('steam_cuenta_vincular',['76561198000000013',a,null,null]);assert.notEqual(await db.rpc('steam_cuenta_reservar',['76561198000000011']),a);assert.equal(await db.rpc('steam_cuenta_reservar',['76561198000000013']),a);});
  await caso('cuenta bloqueada no vincula',async()=>{await db.sql(`update profiles set baneado=true where id=${literal(b)}`);await assert.rejects(db.rpc('steam_cuenta_vincular',['76561198000000014',b,null,null]),/disponible/);await db.sql(`update profiles set baneado=false where id=${literal(b)}`);});
  await caso('state incorrecto u origen distinto no consume la prueba',async()=>{const i=nueva();await iniciar(i);await assert.rejects(db.rpc('steam_auth_tomar',[i.id,hash('otro'),origen,i.nonce]),/venció/);await assert.rejects(db.rpc('steam_auth_tomar',[i.id,i.state,'https://evil.invalid',i.nonce]),/venció/);await preparar(i);});
  await caso('callback simultáneo se consume exactamente una vez',async()=>{const i=nueva();await iniciar(i);const r=await Promise.allSettled([1,2].map(()=>db.rpc('steam_auth_tomar',[i.id,i.state,origen,i.nonce])));assert.equal(r.filter(x=>x.status==='fulfilled').length,1);});
  await caso('nonce de Steam repetido se rechaza en otro intento',async()=>{const i=nueva(),j=nueva();j.nonce=i.nonce;await iniciar(i);await iniciar(j);await preparar(i);await assert.rejects(preparar(j),/duplicate key/);});
  await caso('clave incorrecta no entrega la identidad',async()=>{const i=nueva();await iniciar(i);await preparar(i);await assert.rejects(consumir(i,'x'.repeat(43)),/válido/);const datos=JSON.parse(await consumir(i));assert.equal(datos.steam,'76561198000000001');assert.equal(datos.siguiente,'/salas/qa');});
  await caso('entrega simultánea única, sin Steam persistido después',async()=>{const i=nueva();await iniciar(i);await preparar(i);const r=await Promise.allSettled([consumir(i),consumir(i)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(await db.sql(`select (steam_id is null and entrega_hash is null)::text from steam_auth.intentos where id=${literal(i.id)}`),'true');});
  await caso('cambio de sesión en vinculación no consume ni reasigna',async()=>{const i=nueva();await iniciar(i,a);await preparar(i);await assert.rejects(consumir(i,challenge,b),/sesión cambió/);assert.equal(JSON.parse(await consumir(i,challenge,a)).usuario,a);});
  await caso('pruebas vencidas se rechazan',async()=>{const i=nueva();await iniciar(i);await db.sql(`update steam_auth.intentos set vence=clock_timestamp()-interval '1 second' where id=${literal(i.id)}`);await assert.rejects(preparar(i),/venció/);});
  await caso('cuota de intentos persistente bajo concurrencia',async()=>{const remoto=hash(randomBytes(32)),intentos=Array.from({length:12},()=>({...nueva(),remoto}));const r=await Promise.allSettled(intentos.map(i=>iniciar(i)));assert.equal(r.filter(x=>x.status==='fulfilled').length,10);});
  await caso('borrar un perfil desvincula su cuenta de Steam privada',async()=>{await db.rpc('steam_cuenta_vincular',['76561198000000015',b,null,null]);await db.sql(`delete from auth.users where id=${literal(b)}`);assert.notEqual(await db.rpc('steam_cuenta_reservar',['76561198000000015']),b);});
  console.log(`${total}/${total} casos PostgreSQL Steam correctos, sin Supabase remoto`);
}finally{await db.cerrar();}
