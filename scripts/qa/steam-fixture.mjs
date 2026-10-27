// Base desechable: nunca carga .env.local ni se conecta a Supabase remoto.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

export const literal = v => v === null || v === undefined ? 'null' : "'"+String(typeof v==='object'?JSON.stringify(v):v).replaceAll("'","''")+"'";
export async function abrirPostgresSteam() {
  const raiz=path.resolve(tmpdir());
  const temporal=await mkdtemp(path.join(raiz,'kodigodota-steam-'));
  const data=path.join(temporal,'data');
  const bin=process.env.PG_BIN ?? 'C:/Program Files/PostgreSQL/18/bin';
  function ejecutar(nombre,args,entrada='') {
    return new Promise((resolve,reject)=>{
      const hijo=spawn(path.join(bin,nombre+(process.platform==='win32'?'.exe':'')),args,{windowsHide:true,stdio:['pipe','pipe','pipe']});
      let out='',err='';
      hijo.stdout.on('data',b=>out+=b);hijo.stderr.on('data',b=>err+=b);hijo.on('error',reject);
      hijo.on('exit',code=>{if(nombre==='pg_ctl'){hijo.stdout.destroy();hijo.stderr.destroy();if(code===0)resolve(out.trim());else reject(new Error(err||out));}});
      hijo.on('close',code=>code===0?resolve(out.trim()):reject(new Error(err||out)));hijo.stdin.end(entrada);
    });
  }
  const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
  const sql=texto=>ejecutar('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres'],texto);
  let iniciado=false;
  async function cerrar() {
    if(iniciado)await ejecutar('pg_ctl',['-D',data,'-m','immediate','-w','stop']);
    const destino=path.resolve(temporal);
    if(!destino.startsWith(raiz+path.sep)||!path.basename(destino).startsWith('kodigodota-steam-'))throw new Error('Directorio temporal inesperado');
    await rm(destino,{recursive:true,force:true});
  }
  try {
    await ejecutar('initdb',['-D',data,'-U','postgres','-A','trust','--encoding=UTF8','--no-locale']);
    await ejecutar('pg_ctl',['-D',data,'-l',path.join(temporal,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);iniciado=true;
    await sql(`create role anon; create role authenticated; create role service_role;
      grant usage on schema public to anon,authenticated,service_role;
      create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,raw_app_meta_data jsonb);
      create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,nick text not null,steam_id text unique,
        baneado boolean not null default false,rol text not null default 'jugador',steam_avatar_url text,steam_nombre text,mmr integer,roles_preferidos text[] default '{}');
      create unique index profiles_nick on profiles(lower(nick));
      create table movimientos_billetera(user_id uuid references profiles(id),monto integer);
      create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$begin
        insert into profiles(id,nick) values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'nick'),''),'jugador_'||substr(new.id::text,1,8)));return new;end;$$;
      create trigger nuevo_usuario after insert on auth.users for each row execute function handle_new_user();`);
    for(const archivo of (await readdir('supabase/migrations')).filter(f=>f.includes('_steam_login')&&f.endsWith('.sql')).sort()) {
      await sql(await readFile(path.join('supabase/migrations',archivo),'utf8'));
    }
    return {sql,cerrar,rpc:(nombre,args,rol='service_role')=>sql(`set role ${rol};select public.${nombre}(${args.map(literal).join(',')});`)};
  } catch(error) {await cerrar();throw error;}
}
