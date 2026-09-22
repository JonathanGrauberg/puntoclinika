export const METODOS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"] as const;

export const METODO_PAGO_LABEL: Record<(typeof METODOS_PAGO)[number], string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};
