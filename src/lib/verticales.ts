import type { ModuloKey, TipoCentro } from "@prisma/client";

export interface PracticaInicial {
  nombre: string;
  duracionMin: number;
}

export interface Vertical {
  etiqueta: string;
  /** Módulos que arrancan prendidos al crear un centro de este tipo. */
  modulos: ModuloKey[];
  /** Cómo se llama el profesional que atiende (para textos de la pantalla). */
  profesional: string;
  /** En medicina el DNI es obligatorio; en el consultorio dental alcanza con nombre y teléfono. */
  dniObligatorio: boolean;
  practicasIniciales: PracticaInicial[];
}

export const VERTICALES: Record<TipoCentro, Vertical> = {
  MEDICO: {
    etiqueta: "Centro médico",
    modulos: ["PACIENTES", "TURNOS", "ESTUDIOS", "FACTURACION"],
    profesional: "Médico",
    dniObligatorio: true,
    practicasIniciales: [],
  },
  ODONTOLOGIA: {
    etiqueta: "Odontólogo",
    // ODONTOGRAMA todavía no tiene pantalla (fase B): se deja prendido para que
    // los consultorios que se registren ahora lo reciban sin tocarles nada.
    modulos: ["PACIENTES", "TURNOS", "FACTURACION", "OBRAS_SOCIALES", "ODONTOGRAMA", "LABORATORIO"],
    profesional: "Odontólogo",
    dniObligatorio: false,
    practicasIniciales: [
      { nombre: "Consulta", duracionMin: 30 },
      { nombre: "Limpieza", duracionMin: 45 },
      { nombre: "Arreglo de caries", duracionMin: 45 },
      { nombre: "Extracción", duracionMin: 30 },
      { nombre: "Tratamiento de conducto", duracionMin: 60 },
      { nombre: "Corona", duracionMin: 60 },
      { nombre: "Blanqueamiento", duracionMin: 60 },
      { nombre: "Urgencia", duracionMin: 30 },
    ],
  },
  LABORATORIO: {
    etiqueta: "Laboratorio dental",
    modulos: ["PACIENTES"],
    profesional: "Protesista",
    dniObligatorio: false,
    practicasIniciales: [],
  },
};

/** Tipos que una persona puede elegir al registrarse sola. */
export const TIPOS_REGISTRABLES: TipoCentro[] = ["ODONTOLOGIA"];

/** Sesiones anteriores a esta versión no traen el tipo: son centros médicos. */
export function tipoDeCentro(valor: string | undefined | null): TipoCentro {
  return valor === "ODONTOLOGIA" || valor === "LABORATORIO" ? valor : "MEDICO";
}

export const TERMINOS_VERSION = "2026-11-borrador";
export const DIAS_PRUEBA_GRATIS = 14;
