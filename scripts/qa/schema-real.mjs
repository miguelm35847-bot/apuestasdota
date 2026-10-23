import {readFile} from 'node:fs/promises';
const ident=s=>'"'+s.replaceAll('"','""')+'"';
/** Restaura solo metadatos de public en PostgreSQL aislado, nunca datos de usuarios. */
export async function prepararSchemaReal(sql,usuarios){
 const s=JSON.parse(await readFile('docs/schema/public-2026-10-23.json','utf8'));
 const acl=JSON.parse(await readFile('docs/schema/access-2026-10-23.json','utf8'));
 const indexes=JSON.parse(await readFile('docs/schema/indexes-2026-10-23.json','utf8'));
 await sql(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'authenticated')$$;
 grant usage on schema auth,public to anon,authenticated,service_role;
 set check_function_bodies=off;`);
 for(const t of s.tables)await sql(`create table public.${ident(t.name)}(${t.columns.map(c=>`${ident(c.name)} ${c.type}${c.identity?' generated '+(c.identity==='a'?'always':'by default')+' as identity':c.default?' default '+c.default:''}${c.notnull?' not null':''}`).join(',')});`);
 for(const c of [...s.constraints].sort((a,b)=>Number(a.definition.startsWith('FOREIGN KEY'))-Number(b.definition.startsWith('FOREIGN KEY'))))await sql(`alter table public.${ident(c.table)} add constraint ${ident(c.name)} ${c.definition};`);
 for(const i of indexes)await sql(i.indexdef+';');
 for(const f of s.functions)await sql(f);
 for(const t of s.triggers)await sql(t+';');
 for(const v of s.views)await sql(`create view public.${ident(v.name)} ${v.options?.includes('security_invoker=true')?'with(security_invoker=true)':''} as ${v.definition}`);
 for(const t of s.tables)if(t.rls)await sql(`alter table public.${ident(t.name)} enable row level security;`);
 for(const p of s.policies)await sql(`create policy ${ident(p.policyname)} on public.${ident(p.tablename)} as ${p.permissive} for ${p.cmd} to ${p.roles.map(r=>r==='public'?'public':ident(r)).join(',')}${p.qual?' using ('+p.qual+')':''}${p.with_check?' with check ('+p.with_check+')':''};`);
 for(const f of acl.function_grants){await sql(`revoke all on function ${f.signature} from public,anon,authenticated,service_role;`);for(const r of ['anon','authenticated','service_role'])if(f[r])await sql(`grant execute on function ${f.signature} to ${r};`);}
 for(const g of acl.grants)await sql(`grant ${g.privilege_type} on public.${ident(g.table_name)} to ${g.grantee};`);
 for(const g of acl.column_grants)await sql(`grant ${g.privilege_type}(${ident(g.column_name)}) on public.${ident(g.table_name)} to ${g.grantee};`);
 for(let i=0;i<usuarios.length;i++)await sql(`insert into auth.users(id) values('${usuarios[i]}');insert into profiles(id,nick,rol,mmr) values('${usuarios[i]}','qa-local-${i}','${i===4?'admin':'jugador'}',4500);insert into movimientos_billetera(user_id,tipo,monto) values('${usuarios[i]}','recarga',10000);`);
 await sql('create publication supabase_realtime for table public.apuestas_sala;');
}
