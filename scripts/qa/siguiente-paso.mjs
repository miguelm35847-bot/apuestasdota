import assert from 'node:assert/strict';
import { siguientePaso } from '../../src/lib/siguientePaso.ts';

const base = { esAdmin: false, yaJugo: false, steamVinculado: true, mmr: 3000, salaActual: null, salasDisponibles: 2 };
const decidir = (cambios = {}) => siguientePaso({ ...base, ...cambios });
assert.equal(decidir({ steamVinculado: false }).href, '/perfil#steam');
assert.equal(decidir({ mmr: null }).href, '/perfil#perfil-dota');
assert.equal(decidir({ mmr: 0 }).id, 'buscar', 'MMR cero es un valor guardado');
assert.equal(decidir({ salasDisponibles: 0 }).href, '/como-jugar', 'Sin cupos no recomienda entrar');
assert.equal(decidir().href, '#salas-lista');
assert.equal(decidir({ salaActual: { id: 'mi-sala', nombre: 'Arena', estado: 'abierta' }, steamVinculado: false }).href, '/salas/mi-sala');
assert.equal(decidir({ salaActual: { id: 'mi-sala', nombre: 'Arena', estado: 'en_juego' } }).titulo, 'Tu primera partida está en juego');
for (const cambios of [{ esAdmin: true }, { yaJugo: true }, { esAdmin: null }, { yaJugo: null }, { steamVinculado: null }, { mmr: undefined }, { salasDisponibles: null }]) {
  assert.equal(decidir(cambios), null, `No inventa un paso con ${JSON.stringify(cambios)}`);
}
console.log('[ok] 14 decisiones de primeros pasos, cupos, permisos y datos desconocidos');
