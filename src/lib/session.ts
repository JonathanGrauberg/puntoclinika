import { cache } from "react";
import { redirect } from "next/navigation";
import type { ModuloKey } from "@prisma/client";
import { auth } from "@/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { listEnabledModules } from "@/lib/modules";

export interface ActiveSession {
  userId: string;
  userName: string;
  tenantId: string;
  tenantName: string;
  rol: string;
}

/**
 * Para usar al principio de cada page/layout protegido. Redirige a /login
 * si no hay sesión, o si el usuario no tiene ningún centro asignado
 * (memberships vacío — no debería pasar en uso normal, pero sin esto
 * tenantId quedaría undefined y rompería todo lo que dependa de RLS).
 *
 * Envuelta en `cache()`: el layout y la page de una misma request la llaman
 * cada uno por su lado, pero así comparten el resultado en vez de duplicar
 * la consulta.
 */
export const requireSession = cache(async (): Promise<ActiveSession> => {
  const session = await auth();
  if (!session?.user || !session.user.tenantId) {
    redirect("/login");
  }

  return {
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? "Usuario",
    tenantId: session.user.tenantId,
    tenantName: session.user.tenantName ?? "Centro",
    // Fail-closed: si por algún motivo el token no trae rol, no se le da
    // de arranque el rol más amplio (SECRETARIA) — permisosDe("") = sin permisos.
    rol: session.user.rol ?? "",
  };
});

/** Profesional vinculado al usuario actual (relevante para el rol MEDICO). */
export async function obtenerMiProfesionalId(userId: string, tenantId: string) {
  const profesional = await withTenantContext(tenantId, (tx) =>
    tx.profesional.findUnique({ where: { userId } })
  );
  return profesional?.id ?? null;
}

/**
 * Sesión activa + módulos habilitados del tenant, para pasarle directo al
 * Shell. Cacheada por el mismo motivo que `requireSession`: el layout la usa
 * para el Shell y cada page la vuelve a llamar para su propia lógica
 * (permisos, tenantId), sin pagar la consulta de nuevo.
 */
export const requireSessionWithModules = cache(async (): Promise<
  ActiveSession & { enabledModules: ModuloKey[] }
> => {
  const session = await requireSession();
  const enabledModules = await withTenantContext(session.tenantId, (tx) =>
    listEnabledModules(tx, session.tenantId)
  );
  return { ...session, enabledModules };
});
