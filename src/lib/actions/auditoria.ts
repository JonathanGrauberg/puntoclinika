"use server";

import { requireSession } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { permisosDe } from "@/lib/permissions";

export async function listarAuditoria() {
  const session = await requireSession();
  if (!permisosDe(session.rol).verAuditoria) return [];

  return withTenantContext(session.tenantId, async (tx) => {
    const entradas = await tx.auditLog.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // AuditLog.userId es un string suelto (no FK) a propósito — User es
    // global y no tiene policy de tenant. Se resuelve el nombre aparte.
    const userIds = [...new Set(entradas.map((e) => e.userId).filter((id): id is string => !!id))];
    const usuarios = userIds.length
      ? await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nombre: true } })
      : [];
    const nombrePorId = new Map(usuarios.map((u) => [u.id, u.nombre]));

    return entradas.map((e) => ({
      id: e.id,
      accion: e.accion,
      entidad: e.entidad,
      entidadId: e.entidadId,
      usuario: e.userId ? (nombrePorId.get(e.userId) ?? "Usuario eliminado") : "Sistema",
      createdAt: e.createdAt,
    }));
  });
}
