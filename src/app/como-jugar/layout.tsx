import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { REDES_SITIO, URL_SITIO } from '@/lib/sitio';

const titulo = 'Cómo jugar Dota 2 en nuestras salas';
const descripcion = 'Conoce cómo registrarte, vincular Steam, completar tu perfil y jugar salas 1v1 o 5v5 en KódigoDota. Consulta los pasos y las reglas de la comunidad.';
export const metadata: Metadata = {
  title: titulo,
  description: descripcion,
  alternates: { canonical: '/como-jugar' },
  openGraph: { ...REDES_SITIO, title: titulo, description: descripcion, url: `${URL_SITIO}/como-jugar` },
};

export default function GuiaLayout({ children }: { children: ReactNode }) { return children; }
