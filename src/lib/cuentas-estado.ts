export type EstadoCuenta = "suspendida" | "prueba" | "por_vencer" | "vencida" | "activa";

export const ETIQUETA_ESTADO: Record<EstadoCuenta, string> = {
  suspendida: "Suspendida",
  prueba: "En prueba",
  por_vencer: "Por vencer",
  vencida: "Prueba vencida",
  activa: "Activa",
};

export const CHIP_ESTADO: Record<EstadoCuenta, string> = {
  suspendida: "bg-red-500/15 text-red-700 dark:text-red-300",
  prueba: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  por_vencer: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  vencida: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  activa: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export const DIAS_POR_VENCER = 5;

/** Días que faltan para el fin de la prueba (negativo = ya venció). null si la cuenta no tiene prueba. */
export function diasDePrueba(trialHasta: Date | string | null, ahora = Date.now()) {
  if (!trialHasta) return null;
  return Math.ceil((new Date(trialHasta).getTime() - ahora) / 86_400_000);
}

export function estadoDeCuenta(c: { activo: boolean; trialHasta: Date | string | null }, ahora = Date.now()): EstadoCuenta {
  if (!c.activo) return "suspendida";
  const dias = diasDePrueba(c.trialHasta, ahora);
  if (dias === null) return "activa";
  if (dias < 0) return "vencida";
  return dias <= DIAS_POR_VENCER ? "por_vencer" : "prueba";
}

export function formatoPrecio(n: number) {
  return n > 0 ? `$ ${Math.round(n).toLocaleString("es-AR")}` : "Sin precio";
}

export const ETIQUETA_TIPO: Record<string, string> = {
  MEDICO: "Centro médico",
  ODONTOLOGIA: "Odontólogo",
  LABORATORIO: "Laboratorio",
};
