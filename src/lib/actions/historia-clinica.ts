"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, obtenerMiProfesionalId } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { audit, auditView } from "@/lib/audit";
import { permisosDe } from "@/lib/permissions";

const TIPOS_DOCUMENTO = ["RECETA", "ORDEN_MEDICA"] as const;

const entradaSchema = z.object({
  pacienteId: z.string().min(1),
  tipo: z.enum(["NOTA", "DIAGNOSTICO", "INDICACION", "RECETA", "ORDEN_MEDICA"]),
  contenido: z.string().trim().min(1, "El contenido no puede estar vacío").max(3000),
});

export interface EntradaFormState {
  error?: string;
}

/** Timeline clínico completo del paciente — médico/admin, auditor en solo lectura. */
export async function listarHistoriaClinica(pacienteId: string) {
  const session = await requireSession();
  if (!permisosDe(session.rol).verHistoriaClinica) return [];

  return withTenantContext(session.tenantId, (tx) =>
    tx.historiaClinicaEntry.findMany({
      where: { pacienteId },
      include: { profesional: true, compartido: true },
      orderBy: { fecha: "desc" },
    })
  );
}

export async function crearEntradaHistoriaClinica(formData: FormData): Promise<EntradaFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarHistoriaClinica) {
    return { error: "No tenés permiso para hacer esto." };
  }

  const parsed = entradaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const miProfesionalId = await obtenerMiProfesionalId(session.userId, session.tenantId);
  if (!miProfesionalId) {
    return { error: "Tu usuario todavía no está vinculado a un profesional." };
  }

  await withTenantContext(session.tenantId, async (tx) => {
    const created = await tx.historiaClinicaEntry.create({
      data: {
        tenantId: session.tenantId,
        pacienteId: data.pacienteId,
        profesionalId: miProfesionalId,
        tipo: data.tipo,
        contenido: data.contenido,
      },
    });

    // Receta y orden médica son documentos pensados para entregarse — se
    // les genera de una el link público (ver DocumentoCompartido).
    if (TIPOS_DOCUMENTO.includes(data.tipo as (typeof TIPOS_DOCUMENTO)[number])) {
      const token = randomBytes(24).toString("hex");
      await tx.documentoCompartido.create({
        data: { tenantId: session.tenantId, historiaClinicaEntryId: created.id, token },
      });
    }

    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "CREATE",
      entidad: "HistoriaClinicaEntry",
      entidadId: created.id,
      detalle: { tipo: data.tipo },
    });
  });

  revalidatePath(`/pacientes/${data.pacienteId}/consulta`);
}

export async function toggleVisibleEnPortal(id: string, visible: boolean) {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarHistoriaClinica) {
    return { error: "No tenés permiso para hacer esto." };
  }

  const pacienteId = await withTenantContext(session.tenantId, async (tx) => {
    const entrada = await tx.historiaClinicaEntry.update({
      where: { id },
      data: { visibleEnPortal: visible },
    });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "UPDATE",
      entidad: "HistoriaClinicaEntry",
      entidadId: id,
      detalle: { visibleEnPortal: visible },
    });
    return entrada.pacienteId;
  });

  revalidatePath(`/pacientes/${pacienteId}/consulta`);
}

/**
 * Solo Receta y Orden médica, para la pantalla acotada de secretaría —
 * no el resto del historial clínico (ver permisos.verDocumentosPaciente).
 */
export async function listarDocumentosPaciente(pacienteId: string) {
  const session = await requireSession();
  if (!permisosDe(session.rol).verDocumentosPaciente) return [];

  return withTenantContext(session.tenantId, (tx) =>
    tx.historiaClinicaEntry.findMany({
      where: { pacienteId, tipo: { in: [...TIPOS_DOCUMENTO] } },
      include: { profesional: true, compartido: true },
      orderBy: { fecha: "desc" },
    })
  );
}

/**
 * Público, sin sesión (el paciente/secretaría abre el link para imprimir o
 * mandar por WhatsApp). Igual que el kiosco: primero resuelve el tenant a
 * través de la tabla puente (sin RLS), después entra con contexto real.
 */
export async function obtenerDocumentoPorToken(token: string) {
  const puente = await prisma.documentoCompartido.findUnique({ where: { token } });
  if (!puente) return null;

  // Tenant no lleva policy de RLS (ver schema.prisma) — se busca directo.
  const tenant = await prisma.tenant.findUnique({ where: { id: puente.tenantId } });
  if (!tenant) return null;

  return withTenantContext(puente.tenantId, async (tx) => {
    const entrada = await tx.historiaClinicaEntry.findUnique({
      where: { id: puente.historiaClinicaEntryId },
      include: { paciente: true, profesional: true },
    });
    if (!entrada) return null;

    await auditView(tx, {
      tenantId: puente.tenantId,
      entidad: "HistoriaClinicaEntry",
      entidadId: entrada.id,
      detalle: { accion: "vista_documento_compartido", pacienteId: entrada.pacienteId },
    });

    return { ...entrada, tenantNombre: tenant.nombre };
  });
}
