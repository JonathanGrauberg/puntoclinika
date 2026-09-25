"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { permisosDe } from "@/lib/permissions";

const consultorioSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  piso: z.string().trim().max(50).optional().or(z.literal("")),
});

export interface ConsultorioFormState {
  error?: string;
}

export async function crearConsultorio(formData: FormData): Promise<ConsultorioFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    return { error: "No tenés permiso para hacer esto." };
  }
  const parsed = consultorioSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  await withTenantContext(session.tenantId, async (tx) => {
    const created = await tx.consultorio.create({
      data: {
        tenantId: session.tenantId,
        nombre: data.nombre,
        piso: data.piso || null,
      },
    });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "CREATE",
      entidad: "Consultorio",
      entidadId: created.id,
    });
  });

  revalidatePath("/configuracion/consultorios");
}

export async function listarConsultorios(soloActivos = false) {
  const session = await requireSession();
  return withTenantContext(session.tenantId, (tx) =>
    tx.consultorio.findMany({
      where: soloActivos ? { activo: true } : undefined,
      orderBy: { nombre: "asc" },
    })
  );
}

/** Slug del centro, para armarle a la secretaría el link de la pantalla de kiosco. */
export async function obtenerTenantSlug() {
  const session = await requireSession();
  // Tenant no lleva policy de RLS (ver schema.prisma) — se busca directo por id.
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId } });
  return tenant.slug;
}
