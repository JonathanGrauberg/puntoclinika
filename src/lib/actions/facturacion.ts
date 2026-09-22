"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession, obtenerMiProfesionalId } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { audit } from "@/lib/audit";
import { permisosDe } from "@/lib/permissions";
import { METODOS_PAGO } from "@/lib/metodos-pago";

export interface CobroFormState {
  error?: string;
}

// Métodos de cobro en el momento (ver lib/metodos-pago.ts). Nada de esto
// todavía habla con AFIP/ARCA (factura electrónica queda para más
// adelante — cuando llegue esa fase vamos a necesitar CUIT del centro,
// condición fiscal, punto de venta y tipo de comprobante). Por ahora esto
// es solo el registro interno de cuánto entró y por qué medio, para que
// el profesional sepa qué retirar.

const cobroSchema = z.object({
  turnoId: z.string().min(1),
  monto: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
  metodo: z.enum(METODOS_PAGO),
});

export async function crearCobro(formData: FormData): Promise<CobroFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarFacturacion) {
    return { error: "No tenés permiso para hacer esto." };
  }

  const parsed = cobroSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  try {
    await withTenantContext(session.tenantId, async (tx) => {
      const turno = await tx.turno.findUniqueOrThrow({ where: { id: data.turnoId } });

      const yaTieneFactura = await tx.factura.findFirst({ where: { turnoId: turno.id } });
      if (yaTieneFactura) throw new Error("YA_COBRADO");

      const factura = await tx.factura.create({
        data: {
          tenantId: session.tenantId,
          pacienteId: turno.pacienteId,
          turnoId: turno.id,
          montoTotal: data.monto,
          estado: "PAGADA",
          items: {
            create: { practicaId: turno.practicaId, monto: data.monto },
          },
          pagos: {
            create: { metodo: data.metodo, monto: data.monto },
          },
        },
      });

      await audit(tx, {
        tenantId: session.tenantId,
        userId: session.userId,
        accion: "CREATE",
        entidad: "Factura",
        entidadId: factura.id,
        detalle: { monto: data.monto, metodo: data.metodo },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "YA_COBRADO") {
      return { error: "Ese turno ya tiene un cobro registrado." };
    }
    throw error;
  }

  revalidatePath("/facturacion");
  revalidatePath("/facturacion/nuevo");
}

/** Turnos de un día que todavía no tienen cobro registrado, para elegir cuál cobrar. */
export async function listarTurnosParaCobrar(fechaISO: string) {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarFacturacion) return [];

  const dayStart = new Date(`${fechaISO}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return withTenantContext(session.tenantId, (tx) =>
    tx.turno.findMany({
      where: {
        tenantId: session.tenantId,
        estado: { not: "CANCELADO" },
        fechaHora: { gte: dayStart, lt: dayEnd },
        facturas: { none: {} },
      },
      include: { paciente: true, profesional: true, practica: true },
      orderBy: { fechaHora: "asc" },
    })
  );
}

export async function listarFacturas(fechaDesdeISO?: string) {
  const session = await requireSession();
  const permisos = permisosDe(session.rol);

  const miProfesionalId = !permisos.verTodaFacturacion
    ? await obtenerMiProfesionalId(session.userId, session.tenantId)
    : null;

  return withTenantContext(session.tenantId, (tx) =>
    tx.factura.findMany({
      where: {
        estado: "PAGADA",
        ...(fechaDesdeISO ? { createdAt: { gte: new Date(`${fechaDesdeISO}T00:00:00`) } } : {}),
        ...(miProfesionalId ? { turno: { profesionalId: miProfesionalId } } : {}),
      },
      include: {
        paciente: true,
        pagos: true,
        turno: { include: { profesional: true, practica: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
  );
}
