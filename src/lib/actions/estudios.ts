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
  informeKey: z.string().optional(),
  turnoId: z.string().optional(),
});

export async function crearEstudio(formData: FormData): Promise<EstudioFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarEstudios) {
    return { error: "No tenés permiso para hacer esto." };
  }

  // Las keys de las imágenes viajan como múltiples entries "archivoKeys"
  // (una radiografía/ecografía trae varias) — no entran en el
  // Object.fromEntries de abajo porque eso colapsa valores repetidos.
  const archivoKeys = formData.getAll("archivoKeys").filter((v): v is string => typeof v === "string" && v.length > 0);
  if (archivoKeys.length === 0) {
    return { error: "Subí al menos un archivo del estudio." };
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
        informeArchivoUrl: data.informeKey || null,
        archivos: {
          create: archivoKeys.map((key, orden) => ({ tenantId: session.tenantId, key, orden })),
        },
      },
    });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "CREATE",
      entidad: "Estudio",
      entidadId: created.id,
      detalle: { cantidadArchivos: archivoKeys.length },
    });
    return created.id;
  });

  revalidatePath("/estudios");
  redirect(`/estudios/${estudioId}`);
}

/** Para "ir agregando" imágenes a un estudio ya creado. */
export async function agregarArchivosEstudio(estudioId: string, keys: string[]): Promise<EstudioFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarEstudios) {
    return { error: "No tenés permiso para hacer esto." };
  }
  if (keys.length === 0) return;

  await withTenantContext(session.tenantId, async (tx) => {
    const yaExistentes = await tx.estudioArchivo.count({ where: { estudioId } });
    await tx.estudioArchivo.createMany({
      data: keys.map((key, i) => ({
        tenantId: session.tenantId,
        estudioId,
        key,
        orden: yaExistentes + i,
      })),
    });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "UPDATE",
      entidad: "Estudio",
      entidadId: estudioId,
      detalle: { agregoArchivos: keys.length },
    });
  });

  revalidatePath(`/estudios/${estudioId}`);
}

const informeSchema = z.object({
  informeTexto: z.string().trim().min(1, "El informe no puede estar vacío").max(5000),
  informeKey: z.string().optional(),
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
        ...(parsed.data.informeKey ? { informeArchivoUrl: parsed.data.informeKey } : {}),
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
      include: { paciente: true, practica: true, archivos: { select: { id: true } } },
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
      include: {
        paciente: true,
        practica: true,
        informadoPor: true,
        archivos: { orderBy: { orden: "asc" } },
      },
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

/** URL firmada para una imagen puntual del estudio (hay varias por estudio). */
export async function obtenerUrlDescargaArchivo(archivoId: string) {
  const session = await requireSession();

  const archivo = await withTenantContext(session.tenantId, (tx) =>
    tx.estudioArchivo.findUniqueOrThrow({ where: { id: archivoId } })
  );

  const url = await crearUrlDescargaEstudio(archivo.key);

  await withTenantContext(session.tenantId, (tx) =>
    auditView(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      entidad: "Estudio",
      entidadId: archivo.estudioId,
      detalle: { accion: "descarga", archivoId },
    })
  );

  return url;
}

/** URL firmada para el informe adjunto (uno solo por estudio). */
export async function obtenerUrlDescargaInforme(estudioId: string) {
  const session = await requireSession();

  const estudio = await withTenantContext(session.tenantId, (tx) =>
    tx.estudio.findUniqueOrThrow({ where: { id: estudioId } })
  );
  if (!estudio.informeArchivoUrl) throw new Error("Ese archivo no existe.");

  const url = await crearUrlDescargaEstudio(estudio.informeArchivoUrl);

  await withTenantContext(session.tenantId, (tx) =>
    auditView(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      entidad: "Estudio",
      entidadId: estudioId,
      detalle: { accion: "descarga", tipo: "informe" },
    })
  );

  return url;
}
