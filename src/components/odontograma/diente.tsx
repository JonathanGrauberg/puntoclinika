import type { EstadoHallazgo, SuperficieDental, TipoHallazgo } from "@prisma/client";
import { HALLAZGOS, infoPieza } from "@/lib/odontograma";

export const COLOR_ROJO = "#ef4444";
export const COLOR_AZUL = "#3b82f6";

export function colorDeEstado(estado: EstadoHallazgo) {
  return estado === "A_REALIZAR" ? COLOR_ROJO : COLOR_AZUL;
}

export interface HallazgoMinimo {
  tipo: TipoHallazgo;
  estado: EstadoHallazgo;
  superficies: SuperficieDental[];
}

type PosicionCara = "arriba" | "abajo" | "izquierda" | "derecha" | "centro";

/** Dónde cae cada cara dentro de la cruz: el mesial siempre mira hacia la línea media del odontograma. */
export function posicionesDeCaras(pieza: number): Record<SuperficieDental, PosicionCara> {
  const info = infoPieza(pieza);
  const superior = info.arcada === "superior";
  const mesialADerecha = info.ladoPaciente === "derecha";
  return {
    VESTIBULAR: superior ? "arriba" : "abajo",
    LINGUAL: superior ? "abajo" : "arriba",
    OCLUSAL: "centro",
    MESIAL: mesialADerecha ? "derecha" : "izquierda",
    DISTAL: mesialADerecha ? "izquierda" : "derecha",
  };
}

const POLIGONOS: Record<Exclude<PosicionCara, "centro">, string> = {
  arriba: "0,0 40,0 28,12 12,12",
  abajo: "0,40 40,40 28,28 12,28",
  izquierda: "0,0 12,12 12,28 0,40",
  derecha: "40,0 28,12 28,28 40,40",
};

/** Color de cada cara según lo vigente: si hay rojo y azul en la misma cara, gana el rojo (lo que falta hacer). */
export function coloresPorCara(hallazgos: HallazgoMinimo[]) {
  const colores: Partial<Record<SuperficieDental, EstadoHallazgo>> = {};
  for (const h of hallazgos) {
    if (!HALLAZGOS[h.tipo].porCara) continue;
    for (const s of h.superficies) {
      if (colores[s] !== "A_REALIZAR") colores[s] = h.estado;
    }
  }
  return colores;
}

function Marca({ tipo, color }: { tipo: TipoHallazgo; color: string }) {
  const comun = { stroke: color, strokeWidth: 3, fill: "none", strokeLinecap: "round" as const };
  switch (tipo) {
    case "AUSENTE":
    case "EXTRACCION":
      return (
        <g {...comun}>
          <line x1="5" y1="5" x2="35" y2="35" />
          <line x1="35" y1="5" x2="5" y2="35" />
        </g>
      );
    case "CORONA":
      return <circle cx="20" cy="20" r="18" {...comun} />;
    case "ENDODONCIA":
      return <line x1="20" y1="6" x2="20" y2="34" {...comun} strokeWidth={4} />;
    case "IMPLANTE":
      return (
        <g {...comun} strokeWidth={2.5}>
          <line x1="11" y1="11" x2="29" y2="11" />
          <line x1="11" y1="20" x2="29" y2="20" />
          <line x1="11" y1="29" x2="29" y2="29" />
        </g>
      );
    case "PROTESIS_FIJA":
      return <rect x="2" y="2" width="36" height="36" {...comun} strokeWidth={2.5} strokeDasharray="5 3" />;
    case "PROTESIS_REMOVIBLE":
      return <path d="M3 20 Q10 8 17 20 T31 20 T39 20" {...comun} strokeWidth={2.5} />;
    default:
      return null;
  }
}

/**
 * Una pieza dibujada como cruz de 5 caras. Con `onCara` las caras se pueden
 * tocar (selector grande del panel); sin eso es solo la vista del odontograma.
 */
export function DienteSvg({
  pieza,
  hallazgos = [],
  seleccionadas = [],
  onCara,
  className,
}: {
  pieza: number;
  hallazgos?: HallazgoMinimo[];
  seleccionadas?: SuperficieDental[];
  onCara?: (s: SuperficieDental) => void;
  className?: string;
}) {
  const posiciones = posicionesDeCaras(pieza);
  const colores = coloresPorCara(hallazgos);
  const marcas = hallazgos.filter((h) => !HALLAZGOS[h.tipo].porCara);
  const interactivo = Boolean(onCara);

  const caras = (Object.keys(posiciones) as SuperficieDental[]).map((s) => {
    const estado = colores[s];
    const elegida = seleccionadas.includes(s);
    const props = {
      fill: estado ? colorDeEstado(estado) : "hsl(var(--card))",
      fillOpacity: estado ? 0.9 : 1,
      stroke: elegida ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
      strokeWidth: elegida ? 3 : 1,
      onClick: onCara ? () => onCara(s) : undefined,
      style: interactivo ? { cursor: "pointer" } : undefined,
      "data-cara": s,
    };
    const pos = posiciones[s];
    return pos === "centro" ? (
      <rect key={s} {...props} x="12" y="12" width="16" height="16" />
    ) : (
      <polygon key={s} {...props} points={POLIGONOS[pos]} />
    );
  });

  return (
    <svg viewBox="-2 -2 44 44" className={className} role="img" aria-label={`Pieza ${pieza}`}>
      {caras}
      {marcas.map((m, i) => (
        <g key={i} pointerEvents="none">
          <Marca tipo={m.tipo} color={colorDeEstado(m.estado)} />
        </g>
      ))}
    </svg>
  );
}
