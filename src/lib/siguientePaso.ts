export type ProgresoInicial = {
  esAdmin: boolean | null;
  yaJugo: boolean | null;
  steamVinculado: boolean | null;
  mmr: number | null | undefined;
  salaActual: { id: string; nombre: string; estado: string } | null;
  salasDisponibles: number | null;
};

export type PasoInicial = {
  id: 'steam' | 'perfil' | 'sala' | 'buscar' | 'esperar';
  titulo: string;
  descripcion: string;
  accion: string;
  href: string;
  numero: number;
};

/** null significa que no hay una recomendación comprobada para mostrar. */
export function siguientePaso(progreso: ProgresoInicial): PasoInicial | null {
  const { esAdmin, yaJugo, steamVinculado, mmr, salaActual, salasDisponibles } = progreso;
  if (esAdmin !== false || yaJugo !== false) return null;
  if (salaActual) {
    return {
      id: 'sala',
      titulo: salaActual.estado === 'en_juego' ? 'Tu primera partida está en juego' : 'Ya tienes un lugar en la arena',
      descripcion: `Sigue los próximos pasos en ${salaActual.nombre}.`,
      accion: 'Ir a mi sala',
      href: `/salas/${salaActual.id}`,
      numero: 3,
    };
  }
  if (steamVinculado === null || mmr === undefined || salasDisponibles === null) return null;
  if (!steamVinculado) {
    return {
      id: 'steam',
      titulo: 'Vincula tu cuenta de Steam',
      descripcion: 'Conecta tu cuenta de Dota 2 para jugar tu primera partida.',
      accion: 'Vincular Steam',
      href: '/perfil#steam',
      numero: 1,
    };
  }
  if (mmr === null) {
    return {
      id: 'perfil',
      titulo: 'Completa tu perfil de jugador',
      descripcion: 'Guarda tu MMR y elige los roles que prefieres jugar.',
      accion: 'Completar perfil',
      href: '/perfil#perfil-dota',
      numero: 2,
    };
  }
  if (salasDisponibles > 0) {
    return {
      id: 'buscar',
      titulo: 'Todo listo para tu primera partida',
      descripcion: 'Elige una sala con cupos y revisa su entrada antes de unirte.',
      accion: 'Elegir sala',
      href: '#salas-lista',
      numero: 3,
    };
  }
  return {
    id: 'esperar',
    titulo: 'Tu perfil está listo',
    descripcion: 'Ahora no hay salas con cupos. Conoce la dinámica antes de tu primera partida.',
    accion: 'Cómo jugar',
    href: '/como-jugar',
    numero: 3,
  };
}
