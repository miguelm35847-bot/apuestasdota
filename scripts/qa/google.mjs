import assert from 'node:assert/strict';
import { rutaRetornoSegura, necesitaNickGoogle, validarNickGoogle } from '../../src/lib/acceso.ts';

let total=0;
for(const value of [null,undefined,'','https://evil.test','//evil.test','///evil.test','/\\evil.test','/%5cevil.test','/%2f%2fevil.test','/foo/..//evil.test','/%2e%2e//evil.test','/\tevil.test','/%0aevil.test','javascript:alert(1)','/login','/login/google?code=fake','/register','/api/test','/recuperar','/%6cogin/google','/%ff']){
  assert.equal(rutaRetornoSegura(value),null,String(value));total++;
}
for(const value of ['/','/#salas','/perfil#steam','/salas/123/partida','/admin','/salas/historial?pagina=2']){
  assert.equal(rutaRetornoSegura(value),value);total++;
}
const id='22000000-0000-4000-8000-000000000001';
assert.equal(necesitaNickGoogle(id,'jugador_22000000'),true);total++;
assert.equal(necesitaNickGoogle(id,'jugador_de_dota'),false);total++;
for(const nick of ['ab',' '.repeat(3),'a'.repeat(21),'abc\nxyz','jugador_22000000']){assert.ok(validarNickGoogle(nick,id));total++;}
for(const nick of ['mik','  Mi nick  ','Jugador2026','🚀🚀🚀']){assert.equal(validarNickGoogle(nick,id),null);total++;}
console.log(`${total}/${total} casos de retorno seguro y nick OK`);
