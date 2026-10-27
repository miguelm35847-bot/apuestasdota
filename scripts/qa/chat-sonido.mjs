import assert from 'node:assert/strict';
import { crearAvisosChat } from '../../src/lib/avisosChat.ts';
import { prepararSonido, reproducirSonido } from '../../src/lib/sonidos.ts';

let total = 0;
function caso(nombre, fn) { fn(); total++; console.log(`[ok] ${nombre}`); }
const fila = (id, segundo = 0, sala_id = null) => ({ id, sala_id, created_at: new Date(1700000000000 + segundo * 1000).toISOString() });
let sonidos = 0;
const nuevo = () => crearAvisosChat(() => sonidos++);
caso('historial inicial silencioso y mensaje nuevo con aviso', () => {
  const chat = nuevo(); chat.sincronizar([fila('historial')]); assert.equal(sonidos, 0);
  chat.recibir(fila('nuevo', 1)); assert.equal(sonidos, 1);
  chat.recibir(fila('nuevo', 1)); chat.sincronizar([fila('nuevo', 1), fila('historial')]); assert.equal(sonidos, 1);
});
caso('respuesta del envío, Realtime y consulta no triplican el aviso propio', () => {
  const chat = nuevo(); chat.sincronizar([]); const antes = sonidos;
  chat.recibir(fila('propio')); chat.recibir(fila('propio')); chat.sincronizar([fila('propio')]); assert.equal(sonidos - antes, 1);
});
caso('consulta de respaldo detecta cada mensaje nuevo y no repite al refrescar', () => {
  const chat = nuevo(); chat.sincronizar([]); const antes = sonidos;
  chat.sincronizar([fila('dos', 2), fila('uno', 1)]); chat.sincronizar([fila('dos', 2), fila('uno', 1)]); assert.equal(sonidos - antes, 2);
});
caso('mensajes privados e inválidos no generan avisos', () => {
  const chat = nuevo(), antes = sonidos;
  for (const m of [fila('privado', 1, 'sala'), { ...fila('mal'), created_at: 'invalida' }, { ...fila(''), id: '' }, null]) chat.recibir(m);
  assert.equal(sonidos, antes);
});
caso('evento antes de cargar el historial no se repite', () => {
  const chat = nuevo(), antes = sonidos; chat.recibir(fila('en-vivo', 4)); chat.sincronizar([fila('en-vivo', 4), fila('antiguo')]); assert.equal(sonidos - antes, 1);
});
caso('relleno histórico tras borrado y navegación permanecen silenciosos', () => {
  const chat = nuevo(), antes = sonidos; chat.sincronizar([fila('base', 3)]);
  chat.sincronizar([fila('base', 3), fila('relleno', 1)]); nuevo().sincronizar([fila('base', 3)]); assert.equal(sonidos, antes);
});
caso('eventos fuera de orden y distintos IDs con igual fecha se oyen una vez', () => {
  const chat = nuevo(), antes = sonidos; chat.sincronizar([fila('base', 3)]);
  chat.recibir(fila('tardio', 2)); chat.recibir(fila('igual-a', 3)); chat.recibir(fila('igual-b', 3)); assert.equal(sonidos - antes, 3);
});
caso('memoria acotada sin volver a avisar por el historial', () => {
  const chat = nuevo(), antes = sonidos; chat.sincronizar([fila('viejo')]);
  for (let i = 1; i <= 1100; i++) chat.recibir(fila(String(i), i));
  chat.sincronizar([fila('viejo')]); assert.equal(sonidos - antes, 1100);
});

const notas = [];
let contextos = 0;
class AudioFalso {
  static instancias = [];
  state = 'suspended'; currentTime = 10; destination = {};
  constructor() { contextos++; AudioFalso.instancias.push(this); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createOscillator() {
    const nota = {}; notas.push(nota);
    return { frequency: { setValueAtTime: f => { nota.frecuencia = f; } }, connect() {}, start: t => { nota.inicio = t; }, stop: t => { nota.fin = t; } };
  }
  createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
}
globalThis.window = new EventTarget(); window.AudioContext = AudioFalso;
caso('antes del primer gesto no crea contexto ni acumula sonido', () => {
  prepararSonido(); prepararSonido(); reproducirSonido('mensaje'); assert.equal(contextos, 0); assert.equal(notas.length, 0);
  window.dispatchEvent(new Event('pointerdown')); assert.equal(contextos, 1); assert.equal(notas.length, 0);
});
caso('tono breve y ráfagas separadas por mensaje', () => {
  reproducirSonido('mensaje'); reproducirSonido('mensaje'); assert.equal(notas.length, 2);
  assert.equal(notas[0].frecuencia, 1046); assert.equal(notas[0].inicio, 10); assert.ok(Math.abs(notas[1].inicio - 10.12) < 1e-9);
  assert.ok(notas[0].fin - notas[0].inicio < 0.14);
});
caso('contexto suspendido no acumula avisos y el siguiente gesto lo recupera', () => {
  const audio = AudioFalso.instancias[0];
  audio.state = 'suspended'; reproducirSonido('mensaje'); assert.equal(notas.length, 2);
  window.dispatchEvent(new Event('keydown')); assert.equal(contextos, 1); assert.equal(notas.length, 2);
  reproducirSonido('mensaje'); assert.equal(notas.length, 3);
});
caso('se conservan los tonos existentes de la arena', () => {
  reproducirSonido('verificacion'); assert.equal(notas.length, 5); assert.equal(notas[3].frecuencia, 880); assert.equal(notas[4].frecuencia, 1174);
});
delete globalThis.window;
console.log(`${total}/${total} casos de avisos y audio correctos`);
