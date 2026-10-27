type OpcionesRefresco = {
  intervaloMs: number;
  intervaloSinRealtimeMs?: number;
  debounceMs?: number;
};

/** Una carga a la vez, con una repetición si llegan cambios mientras se consulta. */
export function crearRefrescoVisible(
  cargar: (signal: AbortSignal) => Promise<void>,
  { intervaloMs, intervaloSinRealtimeMs = intervaloMs, debounceMs = 250 }: OpcionesRefresco
) {
  let cerrado = false;
  let conectado = false;
  let repetir = false;
  let enCurso: Promise<void> | null = null;
  let controlador: AbortController | null = null;
  let sondeo: ReturnType<typeof setTimeout> | undefined;
  let aviso: ReturnType<typeof setTimeout> | undefined;

  function programar() {
    clearTimeout(sondeo);
    if (!cerrado && !document.hidden && !enCurso) {
      sondeo = setTimeout(() => { void actualizar(); }, conectado ? intervaloMs : intervaloSinRealtimeMs);
    }
  }

  function actualizar(): Promise<void> {
    clearTimeout(aviso);
    if (cerrado || document.hidden) return Promise.resolve();
    if (enCurso) {
      repetir = true;
      return enCurso;
    }
    clearTimeout(sondeo);
    enCurso = Promise.resolve().then(async () => {
      while (!cerrado && !document.hidden) {
        repetir = false;
        controlador = new AbortController();
        try {
          await cargar(controlador.signal);
        } catch {
          // Un error de red no debe detener los siguientes intentos de respaldo.
        }
        if (!repetir) break;
      }
    }).finally(() => {
      enCurso = null;
      controlador = null;
      if (repetir && !cerrado && !document.hidden) return actualizar();
      programar();
    });
    return enCurso;
  }

  function notificar() {
    clearTimeout(aviso);
    if (!cerrado && !document.hidden) {
      aviso = setTimeout(() => { void actualizar(); }, debounceMs);
    }
  }

  function estadoRealtime(estado: string) {
    const anterior = conectado;
    conectado = estado === 'SUBSCRIBED';
    if (conectado && !anterior) void actualizar();
    else if (conectado !== anterior) programar();
  }

  function alCambiarVisibilidad() {
    if (document.hidden) {
      clearTimeout(sondeo);
      clearTimeout(aviso);
      repetir = false;
      controlador?.abort();
    } else {
      void actualizar();
    }
  }

  document.addEventListener('visibilitychange', alCambiarVisibilidad);
  void actualizar();

  return {
    actualizar,
    notificar,
    estadoRealtime,
    detener() {
      cerrado = true;
      repetir = false;
      clearTimeout(sondeo);
      clearTimeout(aviso);
      controlador?.abort();
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    },
  };
}
