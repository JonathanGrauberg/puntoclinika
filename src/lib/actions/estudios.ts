"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession, obtenerMiProfesionalId } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { audit, auditView } from "@/lib/audit";
import { permisosDe } from "@/lib/permissions";
import { crearUrlSubidaEstudio, crearUrlDescargaEstudio } from "@/lib/storage";

export interface EstudioFormState {
  error?: string;
}

export async function crearUrlSubida(nombreArchivo: string, contentType: string) {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarEstudios) {
    throw new Error("No tenés permiso para hacer esto.");
  }
  return crearUrlSubidaEstudio({ tenantId: session.tenantId, nombreArchivo, contentType });
}

const estudioSchema = z.object({
  pacienteId: z.string().min(1, "Elegí un paciente"),
  practicaId: z.string().min(1, "Elegí una práctica"),
  modalidad: z.string().trim().max(60).optional(),
  key: z.string().min(1, "Falta subir el archivo"),
  turnoId: z.string().optional(),
});

export async function crearEstudio(formData: FormData): Promise<EstudioFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarEstudios) {
    return { error: "No tenés permiso para hacer esto." };
  }
  const raw = Object.fromEntries(formData.entries());
  const parsed = estudioSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const estudioId = await withTenantContext(session.tenantId, async (tx) => {
    const created = await tx.estudio.create({
      data: {
        tenantId: session.tenantId,
        pacienteId: data.pacienteId,
        practicaId: data.practicaId,
        turnoId: data.turnoId || null,
        modalidad: data.modalidad || null,
        archivoUrl: data.key,
      },
    });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "CREATE",
      entidad: "Estudio",
      entidadId: created.id,
    });
    return created.id;
  });

  revalidatePath("/estudios");
  redirect(`/estudios/${estudioId}`);
}

const informeSchema = z.object({
  informeTexto: z.string().trim().min(1, "El informe no puede estar vacío").max(5000),
});

export async function informarEstudio(id: string, formData: FormData): Promise<EstudioFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).informarEstudios) {
    return { error: "No tenés permiso para hacer esto." };
  }
  const miProfesionalId = await obtenerMiProfesionalId(session.userId, session.tenantId);
  if (!miProfesionalId) {
    return { error: "Tu usuario no está vinculado a ningún profesional, no podés firmar informes." };
  }

  const parsed = informeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await withTenantContext(session.tenantId, async (tx) => {
    await tx.estudio.update({
      where: { id },
      data: {
        informeTexto: parsed.data.informeTexto,
        estado: "INFORMADO",
        informadoPorId: miProfesionalId,
        informadoEn: new Date(),
      },
    });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "UPDATE",
      entidad: "Estudio",
      entidadId: id,
      detalle: { estado: "INFORMADO" },
    });
  });

  revalidatePath(`/estudios/${id}`);
  revalidatePath("/estudios");
}

export async function listarEstudios(query?: string) {
  const session = await requireSession();
  const q = query?.trim();

  return withTenantContext(session.tenantId, (tx) =>
    tx.estudio.findMany({
      where: q
        ? {
            paciente: {
              OR: [
                { dni: { contains: q } },
                { nombre: { contains: q, mode: "insensitive" } },
                { apellido: { contains: q, mode: "insensitive" } },
              ],
            },
          }
        : undefined,
      include: { paciente: true, practica: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  );
}

export async function obtenerEstudio(id: string) {
  const session = await requireSession();

  return withTenantContext(session.tenantId, async (tx) => {
    const estudio = await tx.estudio.findUnique({
      where: { id },
      include: { paciente: true, practica: true, informadoPor: true },
    });
    if (estudio) {
      await auditView(tx, {
        tenantId: session.tenantId,
        userId: session.userId,
        entidad: "Estudio",
        entidadId: id,
      });
    }
    return estudio;
  });
}

/** Genera la URL firmada para ver/descargar el archivo y deja registro de auditoría del acceso. */
export async function obtenerUrlDescarga(id: string) {
  const session = await requireSession();

  const estudio = await withTenantContext(session.tenantId, (tx) =>
    tx.estudio.findUniqueOrThrow({ where: { id } })
  );

  const url = await crearUrlDescargaEstudio(estudio.archivoUrl!);

  await withTenantContext(session.tenantId, (tx) =>
    auditView(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      entidad: "Estudio",
      entidadId: id,
      detalle: { accion: "descarga" },
    })
  );

  return url;
}
