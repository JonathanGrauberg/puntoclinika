"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession, obtenerMiProfesionalId, type ActiveSession } from "@/lib/session";
import { withTenantContext, type TenantClient } from "@/lib/tenant-context";
import { audit } from "@/lib/audit";
import { permisosDe, PermisoDenegadoError } from "@/lib/permissions";

const turnoSchema = z.object({
  pacienteId: z.string().min(1, "Elegí un paciente"),
  profesionalId: z.string().min(1, "Elegí un profesional"),
  practicaId: z.string().min(1, "Elegí una práctica"),
  consultorioId: z.string().optional().or(z.literal("")),
  fecha: z.string().min(1, "Falta la fecha"),
  hora: z.string().min(1, "Falta la hora"),
  notas: z.string().trim().max(500).optional(),
});

export interface TurnoFormState {
  error?: string;
}

/**
 * ADMIN/SECRETARIA gestionan la agenda de cualquier profesional. MEDICO solo
 * la propia (spec: "cada profesional ve solo sus pacientes/turnos, salvo
 * permisos ampliados"). AUDITOR no gestiona ninguna.
 */
async function assertPuedeGestionarTurno(session: ActiveSession, profesionalId: string) {
  const permisos = permisosDe(session.rol);
  if (!permisos.gestionarTurnos) throw new PermisoDenegadoError();
  if (!permisos.verTodosLosTurnos) {
    const miId = await obtenerMiProfesionalId(session.userId, session.tenantId);
    if (miId !== profesionalId) throw new PermisoDenegadoError("Solo podés gestionar tu propia agenda.");
  }
}

async function hayOtroTurno(
  tx: TenantClient,
  params: { profesionalId: string; fechaHora: Date; duracionMin: number; excludeId?: string }
) {
  const dayStart = new Date(params.fechaHora);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const candidatos = await tx.turno.findMany({
    where: {
      profesionalId: params.profesionalId,
      estado: { not: "CANCELADO" },
      fechaHora: { gte: dayStart, lt: dayEnd },
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
    },
  });

  const nuevoInicio = params.fechaHora.getTime();
  const nuevoFin = nuevoInicio + params.duracionMin * 60_000;

  return candidatos.some((t) => {
    const inicio = t.fechaHora.getTime();
    const fin = inicio + t.duracionMin * 60_000;
    return inicio < nuevoFin && fin > nuevoInicio;
  });
}

export async function crearTurno(formData: FormData): Promise<TurnoFormState | void> {
  const session = await requireSession();
  const raw = Object.fromEntries(formData.entries());
  const parsed = turnoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;
  const fechaHora = new Date(`${data.fecha}T${data.hora}:00`);
  if (isNaN(fechaHora.getTime())) {
    return { error: "Fecha u hora inválida" };
  }

  try {
    await assertPuedeGestionarTurno(session, data.profesionalId);
  } catch (error) {
    if (error instanceof PermisoDenegadoError) return { error: error.message };
    throw error;
  }

  try {
    await withTenantContext(session.tenantId, async (tx) => {
      const practica = await tx.practica.findUniqueOrThrow({ where: { id: data.practicaId } });

      if (
        await hayOtroTurno(tx, {
          profesionalId: data.profesionalId,
          fechaHora,
          duracionMin: practica.duracionMin,
        })
      ) {
        throw new Error("SUPERPOSICION");
      }

      const created = await tx.turno.create({
        data: {
          tenantId: session.tenantId,
          pacienteId: data.pacienteId,
          profesionalId: data.profesionalId,
          practicaId: data.practicaId,
          consultorioId: data.consultorioId || null,
          fechaHora,
          duracionMin: practica.duracionMin,
          notas: data.notas || null,
          origen: "secretaria",
        },
      });
      await audit(tx, {
        tenantId: session.tenantId,
        userId: session.userId,
        accion: "CREATE",
        entidad: "Turno",
        entidadId: created.id,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPERPOSICION") {
      return { error: "El profesional ya tiene otro turno en ese horario." };
    }
    throw error;
  }

  revalidatePath("/turnos");
}

export async function actualizarTurno(id: string, formData: FormData): Promise<TurnoFormState | void> {
  const session = await requireSession();
  const raw = Object.fromEntries(formData.entries());
  const parsed = turnoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;
  const fechaHora = new Date(`${data.fecha}T${data.hora}:00`);
  if (isNaN(fechaHora.getTime())) {
    return { error: "Fecha u hora inválida" };
  }

  try {
    await assertPuedeGestionarTurno(session, data.profesionalId);
  } catch (error) {
    if (error instanceof PermisoDenegadoError) return { error: error.message };
    throw error;
  }

  try {
    await withTenantContext(session.tenantId, async (tx) => {
      const practica = await tx.practica.findUniqueOrThrow({ where: { id: data.practicaId } });

      if (
        await hayOtroTurno(tx, {
          profesionalId: data.profesionalId,
          fechaHora,
          duracionMin: practica.duracionMin,
          excludeId: id,
        })
      ) {
        throw new Error("SUPERPOSICION");
      }

      await tx.turno.update({
        where: { id },
        data: {
          pacienteId: data.pacienteId,
          profesionalId: data.profesionalId,
          practicaId: data.practicaId,
          consultorioId: data.consultorioId || null,
          fechaHora,
          duracionMin: practica.duracionMin,
          notas: data.notas || null,
        },
      });
      await audit(tx, {
        tenantId: session.tenantId,
        userId: session.userId,
        accion: "UPDATE",
        entidad: "Turno",
        entidadId: id,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPERPOSICION") {
      return { error: "El profesional ya tiene otro turno en ese horario." };
    }
    throw error;
  }

  revalidatePath("/turnos");
}

export async function cancelarTurno(id: string): Promise<void> {
  const session = await requireSession();

  const turno = await withTenantContext(session.tenantId, (tx) =>
    tx.turno.findUniqueOrThrow({ where: { id } })
  );
  await assertPuedeGestionarTurno(session, turno.profesionalId);

  await withTenantContext(session.tenantId, async (tx) => {
    await tx.turno.update({ where: { id }, data: { estado: "CANCELADO" } });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "UPDATE",
      entidad: "Turno",
      entidadId: id,
      detalle: { estado: "CANCELADO" },
    });
  });
  revalidatePath("/turnos");
}

export async function listarTurnosSemana(profesionalId: string, weekStartISO: string) {
  const session = await requireSession();

  const permisos = permisosDe(session.rol);
  if (!permisos.verTodosLosTurnos) {
    const miId = await obtenerMiProfesionalId(session.userId, session.tenantId);
    if (miId !== profesionalId) {
      throw new PermisoDenegadoError("Solo podés ver tu propia agenda.");
    }
  }

  const weekStart = new Date(`${weekStartISO}T00:00:00`);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return withTenantContext(session.tenantId, (tx) =>
    tx.turno.findMany({
      where: {
        profesionalId,
        estado: { not: "CANCELADO" },
        fechaHora: { gte: weekStart, lt: weekEnd },
      },
      include: { paciente: true, practica: true },
      orderBy: { fechaHora: "asc" },
    })
  );
}
