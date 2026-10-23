import assert from 'node:assert/strict';
import { resultadoDotaVerificable as validar } from '../../src/lib/validarResultadoDota.ts';
const roster = new Map([[10,{equipo:1}],[20,{equipo:2}]]);
const base={match_id:123,start_time:100,duration:60,radiant_win:true,players:[{account_id:10,player_slot:0},{account_id:20,player_slot:128}]};
const check=(r=base,m=roster)=>validar(r,123,100,2,m,200);
assert.equal(check(),true);
for(const cambio of [
 {match_id:124},{start_time:99},{duration:101},{duration:-1},{radiant_win:undefined},
 {players:base.players.slice(0,1)},
 {players:[base.players[0],base.players[0]]},
 {players:[base.players[0],{account_id:20,player_slot:1}]},
 {players:[base.players[0],{account_id:20}]},
 {players:[base.players[0],{account_id:20,player_slot:255}]},
 {players:[...base.players,{account_id:30,player_slot:2}]},
])assert.equal(check({...base,...cambio}),false,JSON.stringify(cambio));
assert.equal(check(base,new Map([[10,{equipo:1}]])),false);
console.log('[ok] 13 casos de identidad, inicio, final, roster y lados del resultado');
