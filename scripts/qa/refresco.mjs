import assert from 'node:assert/strict';
import { crearRefrescoVisible } from '../../src/lib/refrescoVisible.ts';

const originales = { setTimeout, clearTimeout, documento: Object.getOwnPropertyDescriptor(globalThis, 'document') };
let ahora = 0, secuencia = 0, total = 0;
const timers = new Map();
const activos = [];
const documento = Object.assign(new EventTarget(), { hidden: false });
globalThis.document = documento;
globalThis.setTimeout = (fn, ms = 0) => { const id = ++secuencia; timers.set(id, { fn, cuando: ahora + ms }); return id; };
globalThis.clearTimeout = id => timers.delete(id);
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
async function avanzar(ms) {
  const fin = ahora + ms;
  while (true) {
    const siguiente = [...timers].filter(([, t]) => t.cuando <= fin).sort((a, b) => a[1].cuando - b[1].cuando)[0];
    if (!siguiente) break;
    ahora = siguiente[1].cuando; timers.delete(siguiente[0]); siguiente[1].fn(); await flush();
  }
  ahora = fin; await flush();
}
async function visible(valor) { documento.hidden = !valor; documento.dispatchEvent(new Event('visibilitychange')); await flush(); }
function crear(fn, opciones = {}) {
  const refresco = crearRefrescoVisible(fn, { intervaloMs: 30000, intervaloSinRealtimeMs: 5000, ...opciones });
  activos.push(refresco); return refresco;
}
async function caso(nombre, fn) {
  try { await fn(); total++; console.log('[ok] ' + nombre); }
  finally { activos.splice(0).forEach(r => r.detener()); timers.clear(); documento.hidden = false; ahora = 0; }
}

try {
  await caso('carga inicial y respaldo a los cinco segundos', async () => {
    let llamadas = 0; crear(async () => { llamadas++; }); await flush();
    assert.equal(llamadas, 1); await avanzar(4999); assert.equal(llamadas, 1);
    await avanzar(1); assert.equal(llamadas, 2);
  });
  await caso('Realtime confirmado amplía el respaldo a treinta segundos', async () => {
    let llamadas = 0; const r = crear(async () => { llamadas++; }); await flush();
    r.estadoRealtime('SUBSCRIBED'); await flush(); const inicial = llamadas;
    await avanzar(29999); assert.equal(llamadas, inicial);
    await avanzar(1); assert.equal(llamadas, inicial + 1);
  });
  await caso('errores repetidos del canal no aplazan indefinidamente el respaldo', async () => {
    let llamadas = 0; const r = crear(async () => { llamadas++; }); await flush();
    r.estadoRealtime('SUBSCRIBED'); await flush(); r.estadoRealtime('CHANNEL_ERROR'); const inicial = llamadas;
    await avanzar(2000); r.estadoRealtime('TIMED_OUT'); await avanzar(3000);
    assert.equal(llamadas, inicial + 1);
  });
  await caso('ráfaga Realtime se agrupa en una sola lectura', async () => {
    let llamadas = 0; const r = crear(async () => { llamadas++; }); await flush();
    for (let i = 0; i < 20; i++) r.notificar();
    await avanzar(249); assert.equal(llamadas, 1); await avanzar(1); assert.equal(llamadas, 2);
  });
  await caso('pestaña oculta no consulta por eventos, respaldo ni llamadas explícitas', async () => {
    let llamadas = 0; const r = crear(async () => { llamadas++; }); await flush(); await visible(false);
    r.notificar(); await r.actualizar(); r.estadoRealtime('SUBSCRIBED'); await avanzar(90000);
    assert.equal(llamadas, 1); await visible(true); assert.equal(llamadas, 2);
  });
  await caso('montaje oculto espera hasta volver a la pestaña', async () => {
    documento.hidden = true; let llamadas = 0; crear(async () => { llamadas++; }); await flush();
    await avanzar(60000); assert.equal(llamadas, 0); await visible(true); assert.equal(llamadas, 1);
  });
  await caso('consultas lentas no se solapan y los cambios pendientes se recargan una vez', async () => {
    let llamadas = 0, simultaneas = 0, maximo = 0, liberar;
    const r = crear(async () => {
      llamadas++; simultaneas++; maximo = Math.max(maximo, simultaneas);
      if (llamadas === 1) await new Promise(resolve => { liberar = resolve; });
      simultaneas--;
    });
    await flush(); const a = r.actualizar(), b = r.actualizar(); assert.equal(a, b);
    await avanzar(60000); assert.equal(llamadas, 1); liberar(); await a;
    assert.equal(llamadas, 2); assert.equal(maximo, 1);
  });
  await caso('fallo de red conserva los reintentos posteriores', async () => {
    let llamadas = 0; crear(async () => { if (++llamadas === 1) throw new Error('red'); }); await flush();
    await avanzar(5000); assert.equal(llamadas, 2);
  });
  await caso('ocultar cancela la respuesta atrasada y volver obtiene datos nuevos', async () => {
    let liberar, aplicadas = 0, llamadas = 0, primera;
    crear(async signal => {
      llamadas++;
      if (llamadas === 1) { primera = signal; await new Promise(resolve => { liberar = resolve; }); }
      if (!signal.aborted) aplicadas++;
    });
    await flush(); await visible(false); assert.equal(primera.aborted, true);
    liberar(); await flush(); assert.equal(aplicadas, 0);
    await visible(true); assert.equal(aplicadas, 1);
  });
  await caso('desmontar cancela solicitudes y elimina todos los refrescos', async () => {
    let llamadas = 0, signal;
    const r = crear(async s => { signal = s; llamadas++; await new Promise(() => {}); }); await flush();
    r.notificar(); r.detener(); assert.equal(signal.aborted, true);
    await visible(false); await visible(true); await avanzar(90000); await r.actualizar();
    assert.equal(llamadas, 1); assert.equal(timers.size, 0);
  });
  await caso('desmontaje antes de la primera microtarea no inicia consultas', async () => {
    let llamadas = 0; const r = crear(async () => { llamadas++; }); r.detener(); await flush();
    assert.equal(llamadas, 0);
  });
  await caso('saldo conserva su intervalo y refresco manual inmediato', async () => {
    let llamadas = 0; const r = crear(async () => { llamadas++; }, { intervaloMs: 15000, intervaloSinRealtimeMs: 15000 });
    await flush(); await avanzar(14999); assert.equal(llamadas, 1); await avanzar(1); assert.equal(llamadas, 2);
    await r.actualizar(); assert.equal(llamadas, 3);
  });
  console.log(`${total}/${total} casos de visibilidad, concurrencia y Realtime correctos.`);
} finally {
  globalThis.setTimeout = originales.setTimeout; globalThis.clearTimeout = originales.clearTimeout;
  if (originales.documento) Object.defineProperty(globalThis, 'document', originales.documento); else delete globalThis.document;
}
