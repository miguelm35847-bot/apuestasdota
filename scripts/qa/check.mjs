#!/usr/bin/env node
/**
 * QA visual por Chrome DevTools Protocol, sin dependencias.
 *
 * Requiere:
 *   - Chrome/Edge escuchando en --remote-debugging-port=9222.
 *   - Node 22+ (usa WebSocket nativo).
 *
 * Qué comprueba en cada URL y viewport:
 *   - overflow horizontal de la página;
 *   - errores de consola y excepciones;
 *   - opcionalmente, que una tarjeta ([role="dialog"]) se abra al pasar el
 *     cursor por un selector y quede dentro del viewport.
 *
 * Sale con código 1 si alguna comprobación falla.
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const AYUDA = `Uso: node scripts/qa/check.mjs [opciones]

  --cdp <url>            Endpoint de Chrome (def. http://127.0.0.1:9222)
  --base <url>           Origen de la app (def. http://127.0.0.1:3000)
  --url <ruta>           Ruta a revisar; repetible (def. /)
  --viewports <lista>    Anchos x altos separados por coma
                         (def. 1366x768,390x844,360x800)
  --settle <ms>          Espera tras cargar cada página (def. 2500)
  --scroll <selector>    Desplaza ese elemento al centro antes de medir
  --hover <selector>     Selector del disparador de la tarjeta
  --hover-index <n|last> Elemento a usar cuando hay varios (def. 0)
  --login                Inicia sesión con QA_EMAIL y QA_PASSWORD antes de revisar
  --expect <texto>       Texto que debe aparecer; repetible
  --reject <texto>       Texto que no debe aparecer; repetible
  --shot <dir>           Guarda una captura por URL y viewport
  --json                 Salida JSON
  --help                 Muestra esta ayuda

Ejemplo:
  npm run qa -- --url / --hover "a[aria-label^='Ver perfil de']" --hover-index last
`;

function fallar(mensaje) {
  console.error(`error: ${mensaje}`);
  process.exit(2);
}

function opciones(argv) {
  const opts = {
    cdp: 'http://127.0.0.1:9222',
    base: 'http://127.0.0.1:3000',
    urls: [],
    viewports: [
      [1366, 768],
      [390, 844],
      [360, 800],
    ],
    settle: 2500,
    scroll: null,
    hover: null,
    hoverIndex: '0',
    login: false,
    expect: [],
    reject: [],
    shot: null,
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const valor = () => {
      const v = argv[++i];
      if (v === undefined) fallar(`falta el valor de ${arg}`);
      return v;
    };

    switch (arg) {
      case '--cdp':
        opts.cdp = valor();
        break;
      case '--base':
        opts.base = valor().replace(/\/$/, '');
        break;
      case '--url':
        opts.urls.push(valor());
        break;
      case '--viewports':
        opts.viewports = valor().split(',').map((par) => {
          const m = /^(\d+)x(\d+)$/.exec(par.trim());
          if (!m) fallar(`viewport inválido: ${par} (usa ANCHOxALTO)`);
          return [Number(m[1]), Number(m[2])];
        });
        break;
      case '--settle':
        opts.settle = Number(valor());
        break;
      case '--scroll':
        opts.scroll = valor();
        break;
      case '--hover':
        opts.hover = valor();
        break;
      case '--hover-index':
        opts.hoverIndex = valor();
        break;
      case '--login':
        opts.login = true;
        break;
      case '--expect':
        opts.expect.push(valor());
        break;
      case '--reject':
        opts.reject.push(valor());
        break;
      case '--shot':
        opts.shot = valor();
        break;
      case '--json':
        opts.json = true;
        break;
      case '--help':
        console.log(AYUDA);
        process.exit(0);
        break;
      default:
        fallar(`opción desconocida: ${arg} (usa --help)`);
    }
  }

  if (opts.urls.length === 0) opts.urls = ['/'];
  return opts;
}

async function crearPestana(cdp, url) {
  const res = await fetch(`${cdp}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!res.ok) throw new Error(`Chrome no abrió la pestaña (${res.status})`);
  return res.json();
}

function conectar(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pendientes = new Map();
  const eventos = [];

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pendientes.has(msg.id)) {
      const { resolve, reject } = pendientes.get(msg.id);
      pendientes.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    if (msg.method) eventos.push(msg);
  });

  const listo = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error(`No se pudo conectar a ${wsUrl}`)), {
      once: true,
    });
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const idMensaje = ++id;
      pendientes.set(idMensaje, { resolve, reject });
      ws.send(JSON.stringify({ id: idMensaje, method, params }));
    });

  return { ws, send, listo, eventos };
}

function resumenEvento(evento) {
  const { method, params } = evento;
  if (method === 'Runtime.exceptionThrown') {
    const detalle = params.exceptionDetails;
    return {
      nivel: 'error',
      texto: `excepción: ${detalle?.exception?.description ?? detalle?.text ?? 'desconocida'}`,
    };
  }
  if (method === 'Runtime.consoleAPICalled') {
    const nivel = params.type === 'error' ? 'error' : params.type === 'warning' ? 'warning' : 'log';
    const texto = params.args
      .map((a) => a.value ?? a.description ?? a.unserializableValue ?? '')
      .join(' ')
      .trim();
    return { nivel, texto: `console.${params.type}: ${texto}` };
  }
  if (method === 'Log.entryAdded' && params.entry.level === 'error') {
    return { nivel: 'error', texto: `log: ${params.entry.text}` };
  }
  return null;
}

function crearEvaluador(send) {
  return async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    }
    return r.result.value;
  };
}

async function iniciarSesion(send, opts) {
  const email = process.env.QA_EMAIL;
  const password = process.env.QA_PASSWORD;
  if (!email || !password) {
    throw new Error(
      '--login necesita QA_EMAIL y QA_PASSWORD (añádelos a .env.local; npm run qa los carga)'
    );
  }

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: `${opts.base}/login` });
  await sleep(opts.settle);

  const evaluar = crearEvaluador(send);
  const enfocar = (selector) =>
    evaluar(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.focus();
      return true;
    })()`);

  if (!(await enfocar('#email'))) throw new Error('no se encontró el campo #email en /login');
  await send('Input.insertText', { text: email });
  if (!(await enfocar('#password'))) throw new Error('no se encontró el campo #password en /login');
  await send('Input.insertText', { text: password });
  await evaluar(`document.querySelector('form button[type="submit"]')?.click() ?? false`);

  for (let intento = 0; intento < 40; intento++) {
    await sleep(250);
    const estado = await evaluar(`(() => ({
      path: location.pathname,
      sesion: Object.keys(localStorage).some(
        (k) => k.startsWith('sb-') && k.includes('auth-token')
      ),
    }))()`);
    if (estado.sesion && estado.path !== '/login') return estado;
  }

  const texto = await evaluar(`document.body.innerText.replace(/\\s+/g, ' ').slice(0, 200)`);
  throw new Error(`el login no completó; la página muestra: ${texto}`);
}

async function revisar(send, eventos, opts, ruta, [width, height]) {
  const base = opts.base + (ruta.startsWith('/') ? ruta : `/${ruta}`);
  eventos.length = 0;

  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });

  const navegacion = await send('Page.navigate', { url: base });
  if (navegacion.errorText) throw new Error(`no cargó ${base}: ${navegacion.errorText}`);
  await sleep(opts.settle);

  const evaluar = crearEvaluador(send);

  const base_ = await evaluar(`(() => ({
    titulo: document.title,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    visible: document.visibilityState,
    texto: document.body.innerText,
  }))()`);

  const problemas = [];
  if (base_.overflowX > 0) {
    problemas.push(`overflow horizontal de ${base_.overflowX}px`);
  }
  for (const esperado of opts.expect) {
    if (!base_.texto.includes(esperado)) problemas.push(`falta el texto "${esperado}"`);
  }
  for (const rechazado of opts.reject) {
    if (base_.texto.includes(rechazado)) problemas.push(`no debería aparecer "${rechazado}"`);
  }

  if (opts.scroll) {
    const ok = await evaluar(`(() => {
      const el = document.querySelector(${JSON.stringify(opts.scroll)});
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      return true;
    })()`);
    if (!ok) problemas.push(`no se encontró --scroll "${opts.scroll}"`);
    await sleep(400);
  }

  let hover = null;
  if (opts.hover) {
    const selector = JSON.stringify(opts.hover);
    const posicion =
      opts.hoverIndex === 'last'
        ? 'els[els.length - 1]'
        : `els[Math.min(${Math.max(0, Number(opts.hoverIndex) || 0)}, els.length - 1)]`;

    const disparador = await evaluar(`(() => {
      const els = [...document.querySelectorAll(${selector})];
      if (!els.length) return { encontrado: false };
      const el = ${posicion};
      el.scrollIntoView({ block: 'center', inline: 'center' });
      window.__qaTrigger = el;
      return { encontrado: true, total: els.length };
    })()`);

    if (!disparador.encontrado) {
      // El selector puede no existir en todas las rutas: se omite, no falla.
      hover = { abierta: false, omitido: true };
    } else {
      await sleep(400);
      const punto = await evaluar(`(() => {
        const r = window.__qaTrigger.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);

      // Moverse fuera y volver garantiza que se dispare mouseenter.
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 4, y: 4, buttons: 0 });
      await sleep(120);
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: Math.round(punto.x),
        y: Math.round(punto.y),
        buttons: 0,
      });
      await sleep(700);

      hover = await evaluar(`(() => {
        const card = document.querySelector('[role="dialog"]');
        const trigger = window.__qaTrigger.getBoundingClientRect();
        if (!card) return { abierta: false, disparador: Math.round(trigger.width) };
        const r = card.getBoundingClientRect();
        return {
          abierta: true,
          ancho: Math.round(r.width),
          alto: Math.round(r.height),
          separacion: Math.round(r.top - trigger.bottom),
          dentroDelViewport:
            r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth,
          texto: card.textContent.replace(/\\s+/g, ' ').trim().slice(0, 80),
        };
      })()`);

      if (!hover.abierta) problemas.push('la tarjeta no se abrió al pasar el cursor');
      else if (!hover.dentroDelViewport) problemas.push('la tarjeta quedó fuera del viewport');
    }
  }

  const eventosResumen = eventos.map(resumenEvento).filter(Boolean);
  const errores = eventosResumen.filter((e) => e.nivel === 'error');
  const advertencias = eventosResumen.filter((e) => e.nivel === 'warning');
  for (const e of errores) problemas.push(e.texto);

  if (opts.shot) {
    const captura = await send('Page.captureScreenshot', { format: 'png' });
    const limpia = ruta === '/' ? 'home' : ruta.replace(/^\//, '').replace(/[/?=&]+/g, '-');
    const archivo = path.join(opts.shot, `${limpia}-${width}x${height}.png`);
    await mkdir(opts.shot, { recursive: true });
    await writeFile(archivo, Buffer.from(captura.data, 'base64'));
  }

  return {
    url: ruta,
    viewport: `${width}x${height}`,
    titulo: base_.titulo,
    overflowX: base_.overflowX,
    hover,
    advertencias: advertencias.map((a) => a.texto),
    problemas,
  };
}

const opts = opciones(process.argv.slice(2));

let pestana;
let conexion;
const resultados = [];

try {
  pestana = await crearPestana(opts.cdp, 'about:blank');
  conexion = conectar(pestana.webSocketDebuggerUrl);
  await conexion.listo;
  await conexion.send('Page.enable');
  await conexion.send('Runtime.enable');
  await conexion.send('Log.enable');

  // Cada ejecución arranca sin sesión: evita que una corrida con --login
  // contamine las siguientes en el mismo perfil de Chrome.
  await conexion.send('Storage.clearDataForOrigin', {
    origin: new URL(opts.base).origin,
    storageTypes: 'all',
  });

  if (opts.login) {
    const sesion = await iniciarSesion(conexion.send, opts);
    if (!opts.json) console.log(`[ok] sesión QA iniciada · ${sesion.path}`);
  }

  for (const ruta of opts.urls) {
    for (const viewport of opts.viewports) {
      resultados.push(await revisar(conexion.send, conexion.eventos, opts, ruta, viewport));
    }
  }
} catch (error) {
  console.error(`error: ${error.message}`);
  if (conexion) conexion.ws.close();
  process.exit(2);
}

conexion.ws.close();
await fetch(`${opts.cdp}/json/close/${pestana.id}`).catch(() => {});

if (opts.hover && !resultados.some((r) => r.hover && !r.hover.omitido)) {
  resultados[0].problemas.push(`--hover "${opts.hover}" no coincidió en ninguna página`);
}

const fallos = resultados.filter((r) => r.problemas.length > 0);

if (opts.json) {
  console.log(JSON.stringify({ ok: fallos.length === 0, resultados }, null, 2));
} else {
  for (const r of resultados) {
    const estado = r.problemas.length === 0 ? 'ok' : 'FALLA';
    const hover = r.hover
      ? r.hover.omitido
        ? ' · hover sin coincidencias'
        : r.hover.abierta
          ? ` · tarjeta ${r.hover.ancho}x${r.hover.alto} a ${r.hover.separacion}px`
          : ' · tarjeta no abierta'
      : '';
    console.log(
      `[${estado}] ${r.url} ${r.viewport} · overflow ${r.overflowX}px${hover}${
        r.advertencias.length ? ` · ${r.advertencias.length} aviso(s)` : ''
      }`
    );
    for (const p of r.problemas) console.log(`        - ${p}`);
    if (r.hover?.abierta) console.log(`        tarjeta: ${r.hover.texto}`);
  }
  console.log(
    `\n${resultados.length - fallos.length}/${resultados.length} comprobaciones OK · ${fallos.length} con problemas`
  );
}

process.exit(fallos.length === 0 ? 0 : 1);
