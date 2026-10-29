import assert from 'node:assert/strict';
import { centimosDeTexto, premioPorGanador, resumenImportesSala, MAX_IMPORTE_SALA } from '../../src/lib/importesSala.ts';

for (const [texto,esperado] of [['11',1100],['6.00',600],['0.01',1],['10,50',1050],[' 1.1 ',110],['1001.01',100101]]) assert.equal(centimosDeTexto(texto),esperado,texto);
for (const texto of ['', ' ', '-6', '1.001', '1e3', 'Infinity', 'NaN', '5abc', '1,2.3', '9007199254741.00']) assert.equal(centimosDeTexto(texto),null,texto);
assert.equal(centimosDeTexto('9007199254740.99'),MAX_IMPORTE_SALA);
assert.deepEqual(resumenImportesSala(1100,2000,10),{recaudacion:11000,premios:10000,diferencia:1000});
assert.deepEqual(resumenImportesSala(600,1000,2),{recaudacion:1200,premios:1000,diferencia:200});
assert.deepEqual(resumenImportesSala(600,1200,10),{recaudacion:6000,premios:6000,diferencia:0});
assert.deepEqual(resumenImportesSala(600,1500,10),{recaudacion:6000,premios:7500,diferencia:-1500});
assert.equal(premioPorGanador({cuota:600,cupo:10,comision_bp:1500,premio_por_ganador:1500}),1500);
assert.equal(premioPorGanador({cuota:101,cupo:10,comision_bp:1500}),171);
assert.equal(premioPorGanador({cuota:1100,cupo:2,comision_bp:0,premio_por_ganador:null}),2200);
console.log('24 comprobaciones de importes, céntimos, bonos y compatibilidad correctas.');
