"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withTenantContext } from "@/lib/tenant-context";
import { auditView } from "@/lib/audit";
import { crearSesionPortal, cerrarSesionPortal, requireSesionPortal } from "@/lib/portal-auth";
import { crearUrlDescargaEstudio } from "@/lib/storage";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Ingresá tu usuario"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export async function loginPortal(formData: FormData): Promise<void> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect("/portal/login?error=1");
  }

  // PacientePortal no tiene policy de RLS (ver schema.prisma) — se puede
  // buscar por username sin tener todavía un tenant activo, igual que User
  // para el login de staff.
  const cuenta = await prisma.pacientePortal.findUnique({
    where: { username: parsed.data.username.trim().toLowerCase() },
  });
  if (!cuenta || !cuenta.activo) {
    redirect("/portal/login?error=1");
  }

  const valido = await bcrypt.compare(parsed.data.password, cuenta.passwordHash);
  if (!valido) {
    redirect("/portal/login?error=1");
  }

  await crearSesionPortal({ pacienteId: cuenta.pacienteId, tenantId: cuenta.tenantId });
  redirect("/portal");
}

export async function logoutPortal() {
  await cerrarSesionPortal();
  redirect("/portal/login");
}

export async function obtenerMiPaciente() {
  const sesion = await requireSesionPortal();
  return withTenantContext(sesion.tenantId, (tx) =>
    tx.paciente.findUniqueOrThrow({ where: { id: sesion.pacienteId } })
  );
}

export async function listarMisTurnos() {
  const sesion = await requireSesionPortal();
  return withTenantContext(sesion.tenantId, (tx) =>
    tx.turno.findMany({
      where: { pacienteId: sesion.pacienteId, estado: { not: "CANCELADO" } },
      include: { profesional: true, practica: true },
      orderBy: { fechaHora: "desc" },
    })
  );
}

/** Solo estudios ya INFORMADOS — el paciente no ve nada pendiente de revisión médica. */
export async function listarMisEstudiosInformados() {
  const sesion = await requireSesionPortal();
  return withTenantContext(sesion.tenantId, (tx) =>
    tx.estudio.findMany({
      where: { pacienteId: sesion.pacienteId, estado: "INFORMADO" },
      include: { practica: true, archivos: { select: { id: true } } },
      orderBy: { informadoEn: "desc" },
    })
  );
}

export async function obtenerMiEstudio(id: string) {
  const sesion = await requireSesionPortal();

  return withTenantContext(sesion.tenantId, async (tx) => {
    const estudio = await tx.estudio.findFirst({
      where: { id, pacienteId: sesion.pacienteId, estado: "INFORMADO" },
      include: { practica: true, archivos: { orderBy: { orden: "asc" } } },
    });
    if (estudio) {
      await auditView(tx, {
        tenantId: sesion.tenantId,
        entidad: "Estudio",
        entidadId: id,
        detalle: { accion: "vista_portal", pacienteId: sesion.pacienteId },
      });
    }
    return estudio;
  });
}

export async function obtenerUrlDescargaArchivoPortal(archivoId: string) {
  const sesion = await requireSesionPortal();

  const archivo = await withTenantContext(sesion.tenantId, (tx) =>
    tx.estudioArchivo.findFirstOrThrow({
      where: { id: archivoId, estudio: { pacienteId: sesion.pacienteId, estado: "INFORMADO" } },
    })
  );

  const url = await crearUrlDescargaEstudio(archivo.key);

  await withTenantContext(sesion.tenantId, (tx) =>
    auditView(tx, {
      tenantId: sesion.tenantId,
      entidad: "Estudio",
      entidadId: archivo.estudioId,
      detalle: { accion: "descarga_portal", pacienteId: sesion.pacienteId, archivoId },
    })
  );

  return url;
}
