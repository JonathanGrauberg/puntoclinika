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

    // Accesos hechos desde el Portal del Paciente no tienen userId (el
    // paciente no es un User) pero sí guardan pacienteId en detalle.
    const pacienteIds = [
      ...new Set(
        entradas
          .filter((e) => !e.userId)
          .map((e) => (e.detalle as { pacienteId?: string } | null)?.pacienteId)
          .filter((id): id is string => !!id)
      ),
    ];
    const pacientes = pacienteIds.length
      ? await tx.paciente.findMany({ where: { id: { in: pacienteIds } }, select: { id: true, nombre: true, apellido: true } })
      : [];
    const pacientePorId = new Map(pacientes.map((p) => [p.id, `${p.apellido}, ${p.nombre} (paciente)`]));

    return entradas.map((e) => {
      const detalle = e.detalle as { pacienteId?: string } | null;
      let usuario = "Sistema";
      if (e.userId) {
        usuario = nombrePorId.get(e.userId) ?? "Usuario eliminado";
      } else if (detalle?.pacienteId) {
        usuario = pacientePorId.get(detalle.pacienteId) ?? "Paciente";
      }
      return {
        id: e.id,
        accion: e.accion,
        entidad: e.entidad,
        entidadId: e.entidadId,
        usuario,
        createdAt: e.createdAt,
      };
    });
  });
}
