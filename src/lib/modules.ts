import type { ModuloKey } from "@prisma/client";
import type { TenantClient } from "./tenant-context";

/**
 * Chequea si un módulo está habilitado para el tenant activo.
 * Usar para gatear rutas, nav items y lógica condicional (ej: si
 * OBRAS_SOCIALES está apagado, Paciente.obraSocialTexto es solo texto libre).
 */
export async function hasModule(
  tx: TenantClient,
  tenantId: string,
  modulo: ModuloKey
): Promise<boolean> {
  const row = await tx.tenantModule.findUnique({
    where: { tenantId_modulo: { tenantId, modulo } },
  });
  return row?.habilitado ?? false;
}
