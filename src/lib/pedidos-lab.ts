import type { EstadoPedidoLab } from "@prisma/client";

export interface InfoEstado {
  label: string;
  /** Lo que dice el botón grande para pasar a este estado. */
  accion: string;
  /** Clases del chip (fondo + texto), con soporte de modo oscuro. */
  chip: string;
}

export const ESTADOS_PEDIDO: Record<EstadoPedidoLab, InfoEstado> = {
  ENVIADO: {
    label: "Enviado",
    accion: "Marcar como enviado",
    chip: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  },
  RECIBIDO: {
    label: "Recibido",
    accion: "El laboratorio lo recibió",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  EN_PROCESO: {
    label: "En proceso",
    accion: "Está en proceso",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  EN_PRUEBA: {
    label: "En prueba",
    accion: "Pasó a prueba",
    chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  TERMINADO: {
    label: "Terminado",
    accion: "Está terminado",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  ENTREGADO: {
    label: "Entregado",
    accion: "Lo recibí en el consultorio",
    chip: "bg-green-600/15 text-green-700 dark:text-green-300",
  },
  DEVUELTO: {
    label: "Devuelto con observaciones",
    accion: "Devolver con observaciones",
    chip: "bg-red-500/15 text-red-700 dark:text-red-300",
  },
};

export const ORDEN_ESTADOS: EstadoPedidoLab[] = [
  "ENVIADO",
  "RECIBIDO",
  "EN_PROCESO",
  "EN_PRUEBA",
  "TERMINADO",
  "ENTREGADO",
  "DEVUELTO",
];

/** El paso que sigue lo más habitual. Después de una prueba se puede volver a proceso (ajustes) o terminar. */
export const SIGUIENTE: Record<EstadoPedidoLab, EstadoPedidoLab | null> = {
  ENVIADO: "RECIBIDO",
  RECIBIDO: "EN_PROCESO",
  EN_PROCESO: "EN_PRUEBA",
  EN_PRUEBA: "TERMINADO",
  TERMINADO: "ENTREGADO",
  ENTREGADO: null,
  DEVUELTO: "RECIBIDO",
};

/** Estados en los que el trabajo ya no está en manos del laboratorio: no cuenta como atrasado. */
export function estaCerrado(estado: EstadoPedidoLab) {
  return estado === "TERMINADO" || estado === "ENTREGADO";
}

export function estaAtrasado(estado: EstadoPedidoLab, fechaEntrega: Date | null, hoy: Date) {
  return Boolean(fechaEntrega) && !estaCerrado(estado) && fechaEntrega!.getTime() < hoy.getTime();
}

export function numeroPedido(n: number) {
  return `#${String(n).padStart(4, "0")}`;
}

/** "11, 12 y 13" */
export function textoPiezas(piezas: number[]) {
  if (piezas.length === 0) return "";
  const orden = [...piezas].sort((a, b) => a - b).map(String);
  return orden.length === 1 ? orden[0] : `${orden.slice(0, -1).join(", ")} y ${orden[orden.length - 1]}`;
}

export const MAX_BYTES_ARCHIVO_PEDIDO = 50 * 1024 * 1024;

/** Fotos, PDF, escaneos 3D (STL/PLY/OBJ) y comprimidos. */
export const EXTENSIONES_ARCHIVO_PEDIDO = ["jpg", "jpeg", "png", "webp", "heic", "pdf", "stl", "ply", "obj", "zip"];

export function extensionDe(nombre: string) {
  const i = nombre.lastIndexOf(".");
  return i === -1 ? "" : nombre.slice(i + 1).toLowerCase();
}

export function formatoBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
