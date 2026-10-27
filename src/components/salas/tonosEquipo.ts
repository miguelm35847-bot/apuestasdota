export type TonoEquipo = 'radiant' | 'dire' | 'neutral';

export const TONOS_EQUIPO: Record<
  TonoEquipo,
  {
    contenedor: string;
    cabecera: string;
    acento: string;
    icono: string;
    titulo: string;
    descripcion: string;
    contador: string;
    boton: string;
    panel: string;
    panelTitulo: string;
    panelContador: string;
  }
> = {
  radiant: {
    contenedor: 'border-emerald-400/15',
    cabecera: 'border-b border-emerald-400/10 bg-emerald-500/[0.05]',
    acento: 'bg-emerald-400/60',
    icono: 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/15',
    titulo: 'text-emerald-100',
    descripcion: 'text-emerald-200/50',
    contador: 'bg-emerald-500/10 text-emerald-100 ring-emerald-400/20',
    boton:
      'bg-emerald-500/10 text-emerald-100 ring-1 ring-inset ring-emerald-400/20 hover:bg-emerald-500/20',
    panel: 'border-emerald-400/15 bg-emerald-500/[0.04]',
    panelTitulo: 'text-emerald-200',
    panelContador: 'bg-emerald-500/10 text-emerald-100 ring-1 ring-inset ring-emerald-400/20',
  },
  dire: {
    contenedor: 'border-rose-400/15',
    cabecera: 'border-b border-rose-400/10 bg-rose-500/[0.05]',
    acento: 'bg-rose-400/60',
    icono: 'bg-rose-500/10 text-rose-200 ring-rose-400/15',
    titulo: 'text-rose-100',
    descripcion: 'text-rose-200/50',
    contador: 'bg-rose-500/10 text-rose-100 ring-rose-400/20',
    boton: 'bg-rose-500/10 text-rose-100 ring-1 ring-inset ring-rose-400/20 hover:bg-rose-500/20',
    panel: 'border-rose-400/15 bg-rose-500/[0.04]',
    panelTitulo: 'text-rose-200',
    panelContador: 'bg-rose-500/10 text-rose-100 ring-1 ring-inset ring-rose-400/20',
  },
  neutral: {
    contenedor: 'border-white/10',
    cabecera: 'border-b border-white/5 bg-white/[0.02]',
    acento: 'bg-slate-400/40',
    icono: 'bg-white/5 text-slate-300 ring-white/10',
    titulo: 'text-slate-100',
    descripcion: 'text-slate-400',
    contador: 'bg-white/5 text-slate-300 ring-white/10',
    boton: 'bg-white/5 text-slate-200 ring-1 ring-inset ring-white/10 hover:bg-white/10',
    panel: 'border-white/10 bg-white/[0.02]',
    panelTitulo: 'text-slate-300',
    panelContador: 'bg-white/5 text-slate-300 ring-white/10',
  },
};
