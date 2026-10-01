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
  turnoId: z.string().optional(),
});

export async function crearEstudio(formData: FormData): Promise<EstudioFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarEstudios) {
    return { error: "No tenés permiso para hacer esto." };
  }

  // Las keys de las imágenes y de los informes viajan como múltiples
  // entries ("archivoKeys"/"informeKeys") — no entran en el
  // Object.fromEntries de abajo porque eso colapsa valores repetidos.
  // Subir imágenes es opcional: una consulta general no siempre trae un
  // estudio adjunto, y el médico tiene que poder escribir el informe
  // igual (independientemente de cómo esté configurada la práctica).
  const archivoKeys = formData.getAll("archivoKeys").filter((v): v is string => typeof v === "string" && v.length > 0);
  const informeKeys = formData.getAll("informeKeys").filter((v): v is string => typeof v === "string" && v.length > 0);

  const raw = Object.fromEntries(formData.entries());
  const parsed = estudioSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  // Si ya se adjunta el PDF del informe al crear el estudio y quien lo
  // sube puede firmar (médico/admin), directamente queda INFORMADO — no
  // tiene sentido hacerlo pasar por el formulario de firma de nuevo para
  // algo que ya está resuelto. Si lo sube secretaría (no puede firmar),
  // el PDF queda adjunto pero el estudio sigue PENDIENTE hasta que un
  // médico lo confirme.
  const puedeFirmar = permisosDe(session.rol).informarEstudios;
  const miProfesionalId = puedeFirmar ? await obtenerMiProfesionalId(session.userId, session.tenantId) : null;
  const seFirmaDeUna = informeKeys.length > 0 && puedeFirmar;

  const estudioId = await withTenantContext(session.tenantId, async (tx) => {
    const created = await tx.estudio.create({
      data: {
        tenantId: session.tenantId,
        pacienteId: data.pacienteId,
        practicaId: data.practicaId,
        turnoId: data.turnoId || null,
        modalidad: data.modalidad || null,
        archivos: {
          create: archivoKeys.map((key, orden) => ({ tenantId: session.tenantId, key, orden })),
        },
        informes: {
          create: informeKeys.map((key, orden) => ({ tenantId: session.tenantId, key, orden })),
        },
        ...(seFirmaDeUna
          ? { estado: "INFORMADO", informadoPorId: miProfesionalId, informadoEn: new Date() }
          : {}),
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
  // Si no se adjuntó ningún archivo, lo más probable es que el médico haya
  // entrado acá directo para escribir el informe (sin imágenes/PDF) — lo
  // llevamos de una a esa pantalla en vez de al detalle vacío.
  if (archivoKeys.length === 0 && informeKeys.length === 0 && puedeFirmar && !seFirmaDeUna) {
    redirect(`/estudios/${estudioId}/informe`);
  }
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

/** Para "ir agregando" PDFs de informe a un estudio ya creado (firmado o no). */
export async function agregarInformesEstudio(estudioId: string, keys: string[]): Promise<EstudioFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarEstudios) {
    return { error: "No tenés permiso para hacer esto." };
  }
  if (keys.length === 0) return;

  await withTenantContext(session.tenantId, async (tx) => {
    const yaExistentes = await tx.estudioInforme.count({ where: { estudioId } });
    await tx.estudioInforme.createMany({
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
      detalle: { agregoInformes: keys.length },
    });
  });

  revalidatePath(`/estudios/${estudioId}`);
}

const informeSchema = z.object({
  informeTexto: z.string().trim().max(5000).optional(),
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

  const informeKeys = formData.getAll("informeKeys").filter((v): v is string => typeof v === "string" && v.length > 0);
  const parsed = informeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  // Con un PDF adjunto (nuevo o ya existente) alcanza para firmar — el
  // texto estructurado es la alternativa cuando no hay PDF, no un
  // requisito aparte.
  const yaTeniaInformes = await withTenantContext(session.tenantId, (tx) =>
    tx.estudioInforme.count({ where: { estudioId: id } })
  );
  const hayPdf = informeKeys.length > 0 || yaTeniaInformes > 0;
  if (!parsed.data.informeTexto && !hayPdf) {
    return { error: "Completá el informe o adjuntá un PDF." };
  }

  await withTenantContext(session.tenantId, async (tx) => {
    const yaExistentes = await tx.estudioInforme.count({ where: { estudioId: id } });
    await tx.estudio.update({
      where: { id },
      data: {
        ...(parsed.data.informeTexto ? { informeTexto: parsed.data.informeTexto } : {}),
        ...(informeKeys.length > 0
          ? {
              informes: {
                create: informeKeys.map((key, i) => ({
                  tenantId: session.tenantId,
                  key,
                  orden: yaExistentes + i,
                })),
              },
            }
          : {}),
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

/** Para el panel de consulta del médico — estudios de un paciente puntual. */
export async function listarEstudiosDePaciente(pacienteId: string) {
  const session = await requireSession();
  return withTenantContext(session.tenantId, (tx) =>
    tx.estudio.findMany({
      where: { pacienteId },
      include: { practica: true, archivos: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
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
        informes: { orderBy: { orden: "asc" } },
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

/** URL firmada para un PDF de informe puntual (puede haber varios por estudio). */
export async function obtenerUrlDescargaInformeArchivo(archivoId: string) {
  const session = await requireSession();

  const archivo = await withTenantContext(session.tenantId, (tx) =>
    tx.estudioInforme.findUniqueOrThrow({ where: { id: archivoId } })
  );

  const url = await crearUrlDescargaEstudio(archivo.key);

  await withTenantContext(session.tenantId, (tx) =>
    auditView(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      entidad: "Estudio",
      entidadId: archivo.estudioId,
      detalle: { accion: "descarga", tipo: "informe", archivoId },
    })
  );

  return url;
}
