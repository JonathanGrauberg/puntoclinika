"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { audit } from "@/lib/audit";
import { permisosDe } from "@/lib/permissions";

const obraSocialSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
});

export interface ObraSocialFormState {
  error?: string;
}

export async function crearObraSocial(formData: FormData): Promise<ObraSocialFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    return { error: "No tenés permiso para hacer esto." };
  }
  const parsed = obraSocialSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await withTenantContext(session.tenantId, async (tx) => {
    const created = await tx.obraSocial.create({
      data: { tenantId: session.tenantId, nombre: parsed.data.nombre },
    });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "CREATE",
      entidad: "ObraSocial",
      entidadId: created.id,
    });
  });

  revalidatePath("/obras-sociales");
}

export async function listarObrasSociales(soloActivas = false) {
  const session = await requireSession();
  return withTenantContext(session.tenantId, (tx) =>
    tx.obraSocial.findMany({
      where: soloActivas ? { activo: true } : undefined,
      orderBy: { nombre: "asc" },
    })
  );
}

export async function toggleObraSocialActivo(id: string, activo: boolean) {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    return { error: "No tenés permiso para hacer esto." };
  }

  await withTenantContext(session.tenantId, async (tx) => {
    await tx.obraSocial.update({ where: { id }, data: { activo } });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "UPDATE",
      entidad: "ObraSocial",
      entidadId: id,
      detalle: { activo },
    });
  });

  revalidatePath("/obras-sociales");
}

const afiliacionSchema = z.object({
  pacienteId: z.string().min(1),
  obraSocialId: z.string().min(1, "Elegí una obra social"),
  numeroAfiliado: z.string().trim().min(1, "El número de afiliado es obligatorio").max(50),
  plan: z.string().trim().max(100).optional(),
});

export interface AfiliacionFormState {
  error?: string;
}

export async function crearAfiliacion(formData: FormData): Promise<AfiliacionFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarPacientes) {
    return { error: "No tenés permiso para hacer esto." };
  }
  const parsed = afiliacionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  await withTenantContext(session.tenantId, async (tx) => {
    const created = await tx.afiliacion.create({
      data: {
        tenantId: session.tenantId,
        pacienteId: data.pacienteId,
        obraSocialId: data.obraSocialId,
        numeroAfiliado: data.numeroAfiliado,
        plan: data.plan || null,
      },
    });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "CREATE",
      entidad: "Afiliacion",
      entidadId: created.id,
    });
  });

  revalidatePath(`/pacientes/${data.pacienteId}`);
}

export async function listarAfiliacionesDePaciente(pacienteId: string) {
  const session = await requireSession();
  return withTenantContext(session.tenantId, (tx) =>
    tx.afiliacion.findMany({
      where: { pacienteId, activo: true },
      include: { obraSocial: true },
      orderBy: { createdAt: "asc" },
    })
  );
}

export async function eliminarAfiliacion(id: string) {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarPacientes) {
    return { error: "No tenés permiso para hacer esto." };
  }

  const pacienteId = await withTenantContext(session.tenantId, async (tx) => {
    const afiliacion = await tx.afiliacion.update({ where: { id }, data: { activo: false } });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "UPDATE",
      entidad: "Afiliacion",
      entidadId: id,
      detalle: { activo: false },
    });
    return afiliacion.pacienteId;
  });

  revalidatePath(`/pacientes/${pacienteId}`);
}

/** Carga el número que dio la obra social al autorizar una práctica. */
export async function guardarAutorizacionOS(turnoId: string, numeroAutorizacionOS: string) {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarTurnos) {
    return { error: "No tenés permiso para hacer esto." };
  }

  await withTenantContext(session.tenantId, async (tx) => {
    await tx.turno.update({ where: { id: turnoId }, data: { numeroAutorizacionOS: numeroAutorizacionOS || null } });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "UPDATE",
      entidad: "Turno",
      entidadId: turnoId,
      detalle: { numeroAutorizacionOS },
    });
  });

  revalidatePath("/turnos");
}
