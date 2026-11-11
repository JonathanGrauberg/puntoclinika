import type { EstadoHallazgo, SuperficieDental, TipoHallazgo } from "@prisma/client";

// ---------------------------------------------------------------------------
// Numeración FDI
// ---------------------------------------------------------------------------

const rango = (desde: number, hasta: number) =>
  Array.from({ length: Math.abs(hasta - desde) + 1 }, (_, i) => (desde <= hasta ? desde + i : desde - i));

/** Filas del odontograma, de izquierda a derecha como las ve el odontólogo (derecha del paciente = izquierda de la pantalla). */
export const ARCADAS = {
  permanentes: {
    superior: [...rango(18, 11), ...rango(21, 28)],
    inferior: [...rango(48, 41), ...rango(31, 38)],
  },
  temporales: {
    superior: [...rango(55, 51), ...rango(61, 65)],
    inferior: [...rango(85, 81), ...rango(71, 75)],
  },
} as const;

export type Denticion = keyof typeof ARCADAS;

const TODAS_LAS_PIEZAS = new Set<number>([
  ...ARCADAS.permanentes.superior,
  ...ARCADAS.permanentes.inferior,
  ...ARCADAS.temporales.superior,
  ...ARCADAS.temporales.inferior,
]);

export function esPiezaValida(pieza: number) {
  return TODAS_LAS_PIEZAS.has(pieza);
}

export function denticionDe(pieza: number): Denticion {
  return pieza >= 51 ? "temporales" : "permanentes";
}

export interface InfoPieza {
  pieza: number;
  arcada: "superior" | "inferior";
  /** Lado del paciente: la derecha del paciente se dibuja a la izquierda de la pantalla. */
  ladoPaciente: "derecha" | "izquierda";
  anterior: boolean;
  nombre: string;
}

export function infoPieza(pieza: number): InfoPieza {
  const cuadrante = Math.floor(pieza / 10);
  const posicion = pieza % 10;
  const temporal = pieza >= 51;
  const arcada = cuadrante === 1 || cuadrante === 2 || cuadrante === 5 || cuadrante === 6 ? "superior" : "inferior";
  const ladoPaciente = cuadrante === 1 || cuadrante === 4 || cuadrante === 5 || cuadrante === 8 ? "derecha" : "izquierda";
  const anterior = temporal ? posicion <= 3 : posicion <= 3;

  let nombre: string;
  if (temporal) {
    nombre = posicion <= 2 ? "Incisivo" : posicion === 3 ? "Canino" : "Molar";
  } else {
    nombre = posicion <= 2 ? "Incisivo" : posicion === 3 ? "Canino" : posicion <= 5 ? "Premolar" : "Molar";
  }
  return { pieza, arcada, ladoPaciente, anterior, nombre: `${nombre}${temporal ? " temporal" : ""}` };
}

// ---------------------------------------------------------------------------
// Caras
// ---------------------------------------------------------------------------

export const SUPERFICIES: SuperficieDental[] = ["VESTIBULAR", "LINGUAL", "MESIAL", "DISTAL", "OCLUSAL"];

export function etiquetaSuperficie(s: SuperficieDental, pieza: number) {
  const info = infoPieza(pieza);
  switch (s) {
    case "VESTIBULAR":
      return "Vestibular";
    case "LINGUAL":
      return info.arcada === "superior" ? "Palatina" : "Lingual";
    case "MESIAL":
      return "Mesial";
    case "DISTAL":
      return "Distal";
    case "OCLUSAL":
      return info.anterior ? "Incisal" : "Oclusal";
  }
}

const LETRA_SUPERFICIE: Record<SuperficieDental, string> = {
  VESTIBULAR: "V",
  LINGUAL: "L",
  MESIAL: "M",
  DISTAL: "D",
  OCLUSAL: "O",
};

/** "MOD", "O", etc. Para textos cortos. */
export function resumenSuperficies(superficies: SuperficieDental[], pieza: number) {
  const orden: SuperficieDental[] = ["MESIAL", "OCLUSAL", "DISTAL", "VESTIBULAR", "LINGUAL"];
  const info = infoPieza(pieza);
  return orden
    .filter((s) => superficies.includes(s))
    .map((s) => (s === "LINGUAL" && info.arcada === "superior" ? "P" : s === "OCLUSAL" && info.anterior ? "I" : LETRA_SUPERFICIE[s]))
    .join("");
}

// ---------------------------------------------------------------------------
// Hallazgos
// ---------------------------------------------------------------------------

export interface MetaHallazgo {
  label: string;
  /** Se marca en caras (true) o abarca la pieza entera (false). */
  porCara: boolean;
  /** Estado sugerido al anotarlo. */
  estadoSugerido: EstadoHallazgo;
}

export const HALLAZGOS: Record<TipoHallazgo, MetaHallazgo> = {
  CARIES: { label: "Caries", porCara: true, estadoSugerido: "A_REALIZAR" },
  OBTURACION: { label: "Obturación", porCara: true, estadoSugerido: "EXISTENTE" },
  SELLADOR: { label: "Sellador", porCara: true, estadoSugerido: "EXISTENTE" },
  FRACTURA: { label: "Fractura", porCara: true, estadoSugerido: "A_REALIZAR" },
  CORONA: { label: "Corona", porCara: false, estadoSugerido: "EXISTENTE" },
  ENDODONCIA: { label: "Endodoncia", porCara: false, estadoSugerido: "EXISTENTE" },
  EXTRACCION: { label: "Extracción indicada", porCara: false, estadoSugerido: "A_REALIZAR" },
  AUSENTE: { label: "Ausente", porCara: false, estadoSugerido: "EXISTENTE" },
  IMPLANTE: { label: "Implante", porCara: false, estadoSugerido: "EXISTENTE" },
  PROTESIS_FIJA: { label: "Prótesis fija", porCara: false, estadoSugerido: "EXISTENTE" },
  PROTESIS_REMOVIBLE: { label: "Prótesis removible", porCara: false, estadoSugerido: "EXISTENTE" },
  OTRO: { label: "Otro", porCara: true, estadoSugerido: "A_REALIZAR" },
};

/** Orden de los botones al anotar un hallazgo: lo más usado primero. */
export const ORDEN_HALLAZGOS: TipoHallazgo[] = [
  "CARIES",
  "OBTURACION",
  "ENDODONCIA",
  "CORONA",
  "EXTRACCION",
  "AUSENTE",
  "IMPLANTE",
  "PROTESIS_FIJA",
  "PROTESIS_REMOVIBLE",
  "SELLADOR",
  "FRACTURA",
  "OTRO",
];

export const ESTADO_LABEL: Record<EstadoHallazgo, string> = {
  A_REALIZAR: "Por hacer",
  EXISTENTE: "Existente",
};

// ---------------------------------------------------------------------------
// Tratamientos realizados
// ---------------------------------------------------------------------------

export interface MetaTratamiento {
  label: string;
  /** Hallazgo (azul) que deja en la pieza. null = solo queda en la historia. */
  deja: TipoHallazgo | null;
  porCara: boolean;
  /** Hallazgos "por hacer" que este tratamiento resuelve. */
  cierra: TipoHallazgo[];
  /** Si es true, al hacerlo se cierra todo lo abierto de la pieza (ej: extracción). */
  cierraTodo?: boolean;
}

export type TipoTratamiento =
  | "OBTURACION"
  | "ENDODONCIA"
  | "CORONA"
  | "EXTRACCION"
  | "IMPLANTE"
  | "SELLADOR"
  | "PROTESIS_FIJA"
  | "PROTESIS_REMOVIBLE"
  | "OTRO";

export const TRATAMIENTOS: Record<TipoTratamiento, MetaTratamiento> = {
  OBTURACION: { label: "Arreglo de caries (obturación)", deja: "OBTURACION", porCara: true, cierra: ["CARIES", "OBTURACION", "FRACTURA"] },
  ENDODONCIA: { label: "Endodoncia (conducto)", deja: "ENDODONCIA", porCara: false, cierra: ["ENDODONCIA"] },
  CORONA: { label: "Corona", deja: "CORONA", porCara: false, cierra: ["CORONA"] },
  EXTRACCION: { label: "Extracción", deja: "AUSENTE", porCara: false, cierra: [], cierraTodo: true },
  IMPLANTE: { label: "Implante", deja: "IMPLANTE", porCara: false, cierra: ["IMPLANTE", "AUSENTE"] },
  SELLADOR: { label: "Sellador", deja: "SELLADOR", porCara: true, cierra: ["SELLADOR"] },
  PROTESIS_FIJA: { label: "Prótesis fija", deja: "PROTESIS_FIJA", porCara: false, cierra: ["PROTESIS_FIJA"] },
  PROTESIS_REMOVIBLE: { label: "Prótesis removible", deja: "PROTESIS_REMOVIBLE", porCara: false, cierra: ["PROTESIS_REMOVIBLE"] },
  OTRO: { label: "Otro tratamiento", deja: null, porCara: false, cierra: [] },
};

export const ORDEN_TRATAMIENTOS: TipoTratamiento[] = [
  "OBTURACION",
  "ENDODONCIA",
  "CORONA",
  "EXTRACCION",
  "IMPLANTE",
  "SELLADOR",
  "PROTESIS_FIJA",
  "PROTESIS_REMOVIBLE",
  "OTRO",
];

/** ¿Un hallazgo abierto lo resuelve este tratamiento? Se superpone si comparten alguna cara (o si alguno abarca la pieza entera). */
export function loCierra(
  tratamiento: MetaTratamiento,
  hallazgo: { tipo: TipoHallazgo; estado: EstadoHallazgo; superficies: SuperficieDental[] },
  superficiesTratamiento: SuperficieDental[]
) {
  if (tratamiento.cierraTodo) return true;
  if (!tratamiento.cierra.includes(hallazgo.tipo)) return false;
  if (hallazgo.estado !== "A_REALIZAR" && hallazgo.tipo !== "AUSENTE") return false;
  if (hallazgo.superficies.length === 0 || superficiesTratamiento.length === 0) return true;
  return hallazgo.superficies.some((s) => superficiesTratamiento.includes(s));
}
