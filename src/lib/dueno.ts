import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface Dueno {
  userId: string;
  nombre: string;
  email: string;
}

/** El dueño de la plataforma (marca en la base, nunca en el token: se revalida en cada pedido). null si no lo es. */
export const obtenerDueno = cache(async (): Promise<Dueno | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, nombre: true, email: true, esDueno: true, activo: true },
  });
  if (!user || !user.esDueno || !user.activo) return null;
  return { userId: user.id, nombre: user.nombre, email: user.email };
});

/** Para páginas del panel: sin sesión va al login; con sesión pero sin ser dueño, la ruta ni existe (404). */
export async function requireDueno(): Promise<Dueno> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const d = await obtenerDueno();
  if (!d) notFound();
  return d;
}

/** Transacción con permiso de lectura sobre módulos y usuarios de todas las cuentas. Solo después de validar al dueño. */
export async function withDueno<T>(callback: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.es_dueno', 'on', true)`;
    return callback(tx);
  });
}

/** Total mensual estimado: precio del plan + los módulos que están prendidos fuera del plan (a su precio, o el especial). */
export function totalMensual(params: {
  plan: { precioMensual: number; modulos: string[] } | null;
  habilitados: { modulo: string; precioOverride: number | null }[];
  precios: Record<string, number>;
}) {
  const enPlan = new Set(params.plan?.modulos ?? []);
  const extras = params.habilitados
    .filter((m) => !enPlan.has(m.modulo))
    .map((m) => ({ modulo: m.modulo, precio: m.precioOverride ?? params.precios[m.modulo] ?? 0 }));
  const total = (params.plan?.precioMensual ?? 0) + extras.reduce((s, e) => s + e.precio, 0);
  return { total, extras };
}
