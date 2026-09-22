export type Rol = "ADMIN" | "SECRETARIA" | "MEDICO" | "AUDITOR";

export interface Permisos {
  /** Crear/editar pacientes (no incluye eliminar: no hay borrado real de pacientes). */
  gestionarPacientes: boolean;
  /** Crear/editar/cancelar turnos. Para MEDICO, solo sobre su propia agenda. */
  gestionarTurnos: boolean;
  /** Ver la agenda de cualquier profesional, no solo la propia. */
  verTodosLosTurnos: boolean;
  /** Profesionales, Prácticas, Usuarios. */
  gestionarConfiguracion: boolean;
  /** Log de auditoría. */
  verAuditoria: boolean;
  /** Cargar estudios (subir archivo + metadatos), estado queda PENDIENTE. */
  gestionarEstudios: boolean;
  /** Escribir el informe y firmarlo (pasa a INFORMADO) — control de calidad, solo médico/admin. */
  informarEstudios: boolean;
  /** Registrar un cobro (coseguro/plus) sobre un turno. Tarea de secretaría/admin, no del médico. */
  gestionarFacturacion: boolean;
  /** Ver los cobros de cualquier profesional. MEDICO ve solo los propios (para saber cuánto retirar). */
  verTodaFacturacion: boolean;
}

const SIN_PERMISOS: Permisos = {
  gestionarPacientes: false,
  gestionarTurnos: false,
  verTodosLosTurnos: false,
  gestionarConfiguracion: false,
  verAuditoria: false,
  gestionarEstudios: false,
  informarEstudios: false,
  gestionarFacturacion: false,
  verTodaFacturacion: false,
};

const MATRIZ: Record<Rol, Permisos> = {
  ADMIN: {
    gestionarPacientes: true,
    gestionarTurnos: true,
    verTodosLosTurnos: true,
    gestionarConfiguracion: true,
    verAuditoria: true,
    gestionarEstudios: true,
    informarEstudios: true,
    gestionarFacturacion: true,
    verTodaFacturacion: true,
  },
  SECRETARIA: {
    gestionarPacientes: true,
    gestionarTurnos: true,
    verTodosLosTurnos: true,
    gestionarConfiguracion: false,
    verAuditoria: false,
    gestionarEstudios: true,
    informarEstudios: false,
    gestionarFacturacion: true,
    verTodaFacturacion: true,
  },
  MEDICO: {
    gestionarPacientes: true,
    gestionarTurnos: true,
    verTodosLosTurnos: false,
    gestionarConfiguracion: false,
    verAuditoria: false,
    gestionarEstudios: true,
    informarEstudios: true,
    gestionarFacturacion: false,
    verTodaFacturacion: false,
  },
  AUDITOR: {
    gestionarPacientes: false,
    gestionarTurnos: false,
    verTodosLosTurnos: true,
    gestionarConfiguracion: false,
    verAuditoria: true,
    gestionarEstudios: false,
    informarEstudios: false,
    gestionarFacturacion: false,
    verTodaFacturacion: true,
  },
};

/** Rol no reconocido -> sin permisos (fail-closed), no SECRETARIA ni ningún default amplio. */
export function permisosDe(rol: string): Permisos {
  return MATRIZ[rol as Rol] ?? SIN_PERMISOS;
}

export class PermisoDenegadoError extends Error {
  constructor(mensaje = "No tenés permiso para hacer esto.") {
    super(mensaje);
    this.name = "PermisoDenegadoError";
  }
}
