"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withTenantContext } from "@/lib/tenant-context";
import { audit } from "@/lib/audit";

const dniSchema = z.string().trim().min(6, "DNI inválido").max(12, "DNI inválido");

export interface CheckinKioscoResult {
  error?: string;
  ok?: {
    hora: string;
    profesional: string;
    practica: string;
    consultorio: string | null;
    yaEstabaEnEspera: boolean;
  };
}

const MENSAJE_GENERICO = "No encontramos un turno para hoy con ese DNI. Consultá en recepción.";

/**
 * Público, sin sesión de ningún tipo (pantalla física en sala de espera).
 * Por eso el mensaje de error es siempre el mismo genérico, exista o no el
 * DNI/turno — no hay que darle a un desconocido pistas sobre quién es
 * paciente de este centro.
 */
export async function registrarLlegadaKiosco(
  slug: string,
  dniInput: string
): Promise<CheckinKioscoResult> {
  const parsedDni = dniSchema.safeParse(dniInput);
  if (!parsedDni.success) {
    return { error: MENSAJE_GENERICO };
  }
  const dni = parsedDni.data;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || !tenant.activo) {
    return { error: MENSAJE_GENERICO };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  return withTenantContext(tenant.id, async (tx) => {
    const paciente = await tx.paciente.findUnique({ where: { tenantId_dni: { tenantId: tenant.id, dni } } });
    if (!paciente) {
      return { error: MENSAJE_GENERICO };
    }

    const turno = await tx.turno.findFirst({
      where: {
        pacienteId: paciente.id,
        fechaHora: { gte: hoy, lt: manana },
        estado: { in: ["RESERVADO", "CONFIRMADO", "EN_ESPERA"] },
      },
      include: { profesional: true, practica: true, consultorio: true },
      orderBy: { fechaHora: "asc" },
    });
    if (!turno) {
      return { error: MENSAJE_GENERICO };
    }

    const yaEstabaEnEspera = turno.estado === "EN_ESPERA";
    if (!yaEstabaEnEspera) {
      await tx.turno.update({ where: { id: turno.id }, data: { estado: "EN_ESPERA" } });
      await audit(tx, {
        tenantId: tenant.id,
        userId: null,
        accion: "UPDATE",
        entidad: "Turno",
        entidadId: turno.id,
        detalle: { accion: "checkin_kiosco", pacienteId: paciente.id },
      });
    }

    return {
      ok: {
        hora: turno.fechaHora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        profesional: `${turno.profesional.apellido}, ${turno.profesional.nombre}`,
        practica: turno.practica.nombre,
        consultorio: turno.consultorio ? turno.consultorio.nombre : null,
        yaEstabaEnEspera,
      },
    };
  });
}
