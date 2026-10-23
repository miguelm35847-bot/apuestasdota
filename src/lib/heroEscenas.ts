type HeroFigura = {
  id: 'invoker' | 'void-spirit';
  imagen: string;
  lado: 'izquierda' | 'derecha';
};

type HeroEscena = {
  fondo: string;
  figuras: readonly HeroFigura[];
};

/** Las escenas se conservan como opciones de arte; no son un selector público. */
export const HERO_ESCENAS: Record<'sf-phantom' | 'convergencia', HeroEscena> = {
  'sf-phantom': {
    fondo: '/hero-arena-v2.webp',
    figuras: [],
  },
  convergencia: {
    fondo: '/hero-convergencia-cielo.webp',
    figuras: [
      {
        id: 'invoker',
        imagen: '/hero-convergencia-invoker.webp',
        lado: 'izquierda',
      },
      {
        id: 'void-spirit',
        imagen: '/hero-convergencia-void-spirit.webp',
        lado: 'derecha',
      },
    ],
  },
};

export const HERO_ESCENA_ACTIVA: keyof typeof HERO_ESCENAS = 'convergencia';
