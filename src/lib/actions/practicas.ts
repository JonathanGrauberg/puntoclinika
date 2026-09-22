"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { audit } from "@/lib/audit";
import { permisosDe } from "@/lib/permissions";

const practicaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  duracionMin: z.coerce.number().int().min(5, "Mínimo 5 minutos").max(480),
  precioParticular: z.coerce.number().min(0, "El precio no puede ser negativo"),
  requiereEstudio: z.coerce.boolean().optional(),
  requiereAutorizacionOS: z.coerce.boolean().optional(),
});

export interface PracticaFormState {
  error?: string;
}

export async function crearPractica(formData: FormData): Promise<PracticaFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    return { error: "No tenés permiso para hacer esto." };
  }
  const raw = Object.fromEntries(formData.entries());
  const parsed = practicaSchema.safeParse({
    ...raw,
    requiereEstudio: raw.requiereEstudio === "on",
    requiereAutorizacionOS: raw.requiereAutorizacionOS === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  await withTenantContext(session.tenantId, async (tx) => {
    const created = await tx.practica.create({
      data: {
        tenantId: session.tenantId,
        nombre: data.nombre,
        duracionMin: data.duracionMin,
        precioParticular: data.precioParticular,
        requiereEstudio: data.requiereEstudio ?? false,
        requiereAutorizacionOS: data.requiereAutorizacionOS ?? false,
      },
    });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "CREATE",
      entidad: "Practica",
      entidadId: created.id,
    });
  });

  revalidatePath("/configuracion/practicas");
}

export async function listarPracticas(soloActivas = false) {
  const session = await requireSession();
  return withTenantContext(session.tenantId, (tx) =>
    tx.practica.findMany({
      where: soloActivas ? { activo: true } : undefined,
      orderBy: { nombre: "asc" },
    })
  );
}
