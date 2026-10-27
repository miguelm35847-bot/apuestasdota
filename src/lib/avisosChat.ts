export type MensajeAviso = { id: string; sala_id: string | null; created_at: string };

/** Un aviso por ID; historial inicial y filas antiguas de relleno permanecen mudos. */
export function crearAvisosChat(avisar: () => void) {
  const vistos = new Set<string>();
  let inicializado = false;
  let ultimaFecha = -Infinity;
  function recordar(m: MensajeAviso): boolean {
    if (!m || m.sala_id !== null || typeof m.id !== 'string' || !m.id || !Number.isFinite(Date.parse(m.created_at))) return false;
    if (vistos.has(m.id)) return false;
    vistos.add(m.id);
    if (vistos.size > 1000) vistos.delete(vistos.values().next().value!);
    return true;
  }
  return {
    recibir(m: MensajeAviso) {
      if (!recordar(m)) return;
      ultimaFecha = Math.max(ultimaFecha, Date.parse(m.created_at));
      avisar();
    },
    sincronizar(filas: readonly MensajeAviso[]) {
      const anterior = ultimaFecha;
      for (const m of filas) {
        if (!recordar(m)) continue;
        const fecha = Date.parse(m.created_at);
        if (inicializado && fecha >= anterior) avisar();
        ultimaFecha = Math.max(ultimaFecha, fecha);
      }
      inicializado = true;
    },
  };
}
