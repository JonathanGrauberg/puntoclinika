"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { audit } from "@/lib/audit";

const profesionalSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  apellido: z.string().trim().min(1, "El apellido es obligatorio").max(100),
  matricula: z.string().trim().max(50).optional(),
  especialidad: z.string().trim().max(100).optional(),
});

export interface ProfesionalFormState {
  error?: string;
}

export async function crearProfesional(formData: FormData): Promise<ProfesionalFormState | void> {
  const session = await requireSession();
  const raw = Object.fromEntries(formData.entries());
  const parsed = profesionalSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  await withTenantContext(session.tenantId, async (tx) => {
    const created = await tx.profesional.create({
      data: {
        tenantId: session.tenantId,
        nombre: data.nombre,
        apellido: data.apellido,
        matricula: data.matricula || null,
        especialidad: data.especialidad || null,
      },
    });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "CREATE",
      entidad: "Profesional",
      entidadId: created.id,
    });
  });

  revalidatePath("/configuracion/profesionales");
}

export async function listarProfesionales(soloActivos = false) {
  const session = await requireSession();
  return withTenantContext(session.tenantId, (tx) =>
    tx.profesional.findMany({
      where: soloActivos ? { activo: true } : undefined,
      orderBy: { apellido: "asc" },
    })
  );
}
