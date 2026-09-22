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
 */
export async function requireSession(): Promise<ActiveSession> {
  const session = await auth();
  if (!session?.user || !session.user.tenantId) {
    redirect("/login");
  }

  return {
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? "Usuario",
    tenantId: session.user.tenantId,
    tenantName: session.user.tenantName ?? "Centro",
    rol: session.user.rol ?? "SECRETARIA",
  };
}

/**
 * Sesión activa + módulos habilitados del tenant, para pasarle directo al
 * Shell. La mayoría de las pages autenticadas empiezan con esto.
 */
export async function requireSessionWithModules(): Promise<
  ActiveSession & { enabledModules: ModuloKey[] }
> {
  const session = await requireSession();
  const enabledModules = await withTenantContext(session.tenantId, (tx) =>
    listEnabledModules(tx, session.tenantId)
  );
  return { ...session, enabledModules };
}
