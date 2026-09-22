import type { AuditAction, Prisma } from "@prisma/client";
import type { TenantClient } from "./tenant-context";

interface AuditParams {
  tenantId: string;
  userId?: string | null;
  accion: AuditAction;
  entidad: string;
  entidadId: string;
  detalle?: Prisma.InputJsonValue;
  ip?: string | null;
}

/**
 * Registra un evento de auditoría dentro de la misma transacción tenant-scoped.
 *
 * CREATE/UPDATE/DELETE sobre entidades sensibles (Paciente, HistoriaClinicaEntry,
 * Estudio, Factura) deben llamar esto explícitamente junto a la mutación.
 *
 * VIEW no se audita por middleware genérico (loguear cada SELECT sería ruido
 * y costo innecesario) — se llama a mano solo en los puntos de acceso que
 * importa trazar: abrir la ficha completa de un paciente, ver/descargar un estudio.
 */
export async function audit(tx: TenantClient, params: AuditParams) {
  await tx.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      accion: params.accion,
      entidad: params.entidad,
      entidadId: params.entidadId,
      detalle: params.detalle,
      ip: params.ip ?? null,
    },
  });
}

export function auditView(
  tx: TenantClient,
  params: Omit<AuditParams, "accion">
) {
  return audit(tx, { ...params, accion: "VIEW" });
}
