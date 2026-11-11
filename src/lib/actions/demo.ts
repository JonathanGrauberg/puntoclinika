"use server";

import { revalidatePath } from "next/cache";
import { requireSession, obtenerMiProfesionalId } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { permisosDe } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { cargarDemoDental, borrarDemo } from "@/lib/demo-dental";

export async function cargarDatosEjemplo(): Promise<{ error?: string }> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    return { error: "No tenés permiso para hacer esto." };
  }
  if (session.tenantTipo !== "ODONTOLOGIA") {
    return { error: "Los datos de ejemplo solo están disponibles para consultorios dentales." };
  }

  const resultado = await withTenantContext(session.tenantId, async (tx) => {
    if ((await tx.paciente.count({ where: { esDemo: true } })) > 0) return { yaEstaban: true };

    const profesionalId =
      (await obtenerMiProfesionalId(session.userId, session.tenantId)) ??
      (await tx.profesional.findFirst({ where: { activo: true }, select: { id: true } }))?.id;
    if (!profesionalId) return { sinProfesional: true };

    const practicas = await tx.practica.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, duracionMin: true },
    });
    const creado = await cargarDemoDental(tx, { tenantId: session.tenantId, profesionalId, practicas });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "CREATE",
      entidad: "DatosEjemplo",
      entidadId: session.tenantId,
      detalle: creado,
    });
    return {};
  });

  if ("sinProfesional" in resultado) return { error: "Primero tiene que haber un profesional cargado." };
  revalidatePath("/dashboard");
  revalidatePath("/pacientes");
  revalidatePath("/turnos");
  return {};
}

export async function borrarDatosEjemplo(): Promise<{ error?: string; conservados?: number }> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    return { error: "No tenés permiso para hacer esto." };
  }

  const res = await withTenantContext(session.tenantId, async (tx) => {
    const r = await borrarDemo(tx, session.tenantId);
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "DELETE",
      entidad: "DatosEjemplo",
      entidadId: session.tenantId,
      detalle: r,
    });
    return r;
  });

  revalidatePath("/dashboard");
  revalidatePath("/pacientes");
  revalidatePath("/turnos");
  return { conservados: res.conservados };
}
