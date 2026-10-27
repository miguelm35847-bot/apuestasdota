'use client';

/**
 * Motor de sonidos de la arena.
 *
 * Los navegadores no dejan reproducir audio hasta que el usuario interactúa
 * con la página, por eso el contexto se crea/reanuda con el primer clic o
 * tecla. Los tonos se sintetizan con la Web Audio API: no hay archivos de
 * audio que cargar ni licencias que revisar.
 *
 * Sonidos:
 *  - 'verificacion': aviso de que el admin pide confirmar "Estoy listo".
 *    Solo se reproduce dentro de la sala.
 *  - 'listos': todos confirmaron "Estoy listo" en una 5v5. Suena al admin
 *    que creó la sala para que elija a los capitanes y lance la moneda.
 *  - 'moneda': se lanzó la moneda del sorteo: el admin puede crear el lobby
 *    en Dota y poner la sala en juego.
 *  - 'fin': la partida terminó. Suena para todos los jugadores de la sala,
 *    estén o no dentro de la sala (llega por notificación).
 *  - 'mensaje': aviso breve por mensaje nuevo en el chat general abierto.
 */
export type TonoSonido = 'verificacion' | 'listos' | 'moneda' | 'fin' | 'mensaje';

let contexto: AudioContext | null = null;
let preparado = false;
let siguienteMensaje = 0;

function obtenerContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!contexto) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      contexto = new Ctor();
    } catch {
      return null;
    }
  }
  return contexto;
}

/** Libera el audio con el primer gesto del usuario (regla de los navegadores). */
export function prepararSonido() {
  if (preparado || typeof window === 'undefined') return;
  preparado = true;

  const desbloquear = () => {
    const ctx = obtenerContexto();
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  };

  // Se mantiene escuchando: si el primer clic no desbloquea el audio (por
  // ejemplo, porque el contexto se creó más tarde), el siguiente intento sí.
  window.addEventListener('pointerdown', desbloquear);
  window.addEventListener('keydown', desbloquear);
}

function tocarTono(
  ctx: AudioContext,
  frecuencia: number,
  inicio: number,
  duracion: number,
  volumen: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t0 = ctx.currentTime + inicio;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frecuencia, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volumen, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duracion + 0.05);
}

function sonar(ctx: AudioContext, tono: TonoSonido) {
  if (tono === 'mensaje') {
    // Aviso corto y suave. Separa los mensajes de una misma ráfaga.
    const inicio = Math.max(ctx.currentTime, siguienteMensaje);
    tocarTono(ctx, 1046, inicio - ctx.currentTime, 0.085, 0.045);
    siguienteMensaje = inicio + 0.12;
    return;
  }
  if (tono === 'verificacion') {
    tocarTono(ctx, 880, 0, 0.13, 0.16);
    tocarTono(ctx, 1174, 0.17, 0.16, 0.16);
    return;
  }
  if (tono === 'listos') {
    // Acorde ascendente de "todos listos": más largo que el aviso de pedir.
    tocarTono(ctx, 659, 0, 0.16, 0.15);
    tocarTono(ctx, 784, 0.16, 0.16, 0.15);
    tocarTono(ctx, 988, 0.32, 0.18, 0.15);
    tocarTono(ctx, 1318, 0.52, 0.3, 0.13);
    return;
  }
  if (tono === 'moneda') {
    // Brillo descendente, como el tintineo de una máquina de monedas.
    tocarTono(ctx, 1568, 0, 0.1, 0.14);
    tocarTono(ctx, 1318, 0.12, 0.1, 0.14);
    tocarTono(ctx, 1046, 0.24, 0.14, 0.14);
    tocarTono(ctx, 1568, 0.4, 0.2, 0.12);
    return;
  }
  tocarTono(ctx, 523, 0, 0.18, 0.14);
  tocarTono(ctx, 659, 0.16, 0.18, 0.14);
  tocarTono(ctx, 784, 0.32, 0.36, 0.14);
}

/** Reproduce un sonido de la arena. */
export function reproducirSonido(tono: TonoSonido) {
  if (typeof window === 'undefined') return;

  // El chat no intenta autoplay ni acumula avisos para el primer clic.
  if (tono === 'mensaje') {
    if (contexto?.state === 'running') sonar(contexto, tono);
    return;
  }

  const ctx = obtenerContexto();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx
      .resume()
      .then(() => {
        if (ctx.state === 'running') sonar(ctx, tono);
      })
      .catch(() => undefined);
    return;
  }

  sonar(ctx, tono);
}
