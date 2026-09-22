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
}

const SIN_PERMISOS: Permisos = {
  gestionarPacientes: false,
  gestionarTurnos: false,
  verTodosLosTurnos: false,
  gestionarConfiguracion: false,
  verAuditoria: false,
};

const MATRIZ: Record<Rol, Permisos> = {
  ADMIN: {
    gestionarPacientes: true,
    gestionarTurnos: true,
    verTodosLosTurnos: true,
    gestionarConfiguracion: true,
    verAuditoria: true,
  },
  SECRETARIA: {
    gestionarPacientes: true,
    gestionarTurnos: true,
    verTodosLosTurnos: true,
    gestionarConfiguracion: false,
    verAuditoria: false,
  },
  MEDICO: {
    gestionarPacientes: true,
    gestionarTurnos: true,
    verTodosLosTurnos: false,
    gestionarConfiguracion: false,
    verAuditoria: false,
  },
  AUDITOR: {
    gestionarPacientes: false,
    gestionarTurnos: false,
    verTodosLosTurnos: true,
    gestionarConfiguracion: false,
    verAuditoria: true,
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
