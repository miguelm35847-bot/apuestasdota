import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { REDES_SITIO, URL_SITIO } from '@/lib/sitio';

const titulo = 'Historial de partidas de Dota 2';
const descripcion = 'Consulta los resultados y ganadores de las partidas terminadas en las salas de KódigoDota.';
export const metadata: Metadata = {
  title: titulo,
  description: descripcion,
  alternates: { canonical: '/salas/historial' },
  openGraph: { ...REDES_SITIO, title: titulo, description: descripcion, url: `${URL_SITIO}/salas/historial` },
};

export default function HistorialLayout({ children }: { children: ReactNode }) { return children; }
