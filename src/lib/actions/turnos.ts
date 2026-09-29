"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { EstadoTurno } from "@prisma/client";
import { requireSession, obtenerMiProfesionalId, type ActiveSession } from "@/lib/session";
import { withTenantContext, type TenantClient } from "@/lib/tenant-context";
import { audit } from "@/lib/audit";
import { permisosDe, PermisoDenegadoError } from "@/lib/permissions";
import { combinarFechaHoraArgentina, inicioDiaArgentina, hoyArgentina, addDays, toISODate } from "@/lib/date-utils";

const turnoSchema = z.object({
  pacienteId: z.string().min(1, "Elegí un paciente"),
  profesionalId: z.string().min(1, "Elegí un profesional"),
  practicaId: z.string().min(1, "Elegí una práctica"),
  consultorioId: z.string().optional().or(z.literal("")),
  fecha: z.string().min(1, "Falta la fecha"),
  hora: z.string().min(1, "Falta la hora"),
  notas: z.string().trim().max(500).optional(),
  numeroAutorizacionOS: z.string().trim().max(50).optional(),
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
  const dayStart = inicioDiaArgentina(toISODate(params.fechaHora));
  const dayEnd = addDays(dayStart, 1);

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
  const fechaHora = combinarFechaHoraArgentina(data.fecha, data.hora);
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
          numeroAutorizacionOS: data.numeroAutorizacionOS || null,
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
  const fechaHora = combinarFechaHoraArgentina(data.fecha, data.hora);
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
          numeroAutorizacionOS: data.numeroAutorizacionOS || null,
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

/**
 * Turnos de hoy para la pantalla de sala de espera. MEDICO ve solo los
 * propios; ADMIN/SECRETARIA pueden filtrar por profesional o ver todos.
 */
export async function listarSalaDeEspera(profesionalId?: string) {
  const session = await requireSession();
  const permisos = permisosDe(session.rol);
  if (!permisos.gestionarTurnos) return [];

  let filtroProfesionalId = profesionalId;
  if (!permisos.verTodosLosTurnos) {
    filtroProfesionalId = (await obtenerMiProfesionalId(session.userId, session.tenantId)) ?? undefined;
    if (!filtroProfesionalId) return [];
  }

  const hoy = hoyArgentina();
  const manana = addDays(hoy, 1);

  return withTenantContext(session.tenantId, (tx) =>
    tx.turno.findMany({
      where: {
        fechaHora: { gte: hoy, lt: manana },
        estado: { not: "CANCELADO" },
        ...(filtroProfesionalId ? { profesionalId: filtroProfesionalId } : {}),
      },
      include: { paciente: true, profesional: true, practica: true, consultorio: true },
      orderBy: { fechaHora: "asc" },
    })
  );
}

const VENTANA_PROXIMO_MIN = 15;

/**
 * Para la campanita del topbar: qué necesita atención AHORA — pacientes ya
 * en espera, o turnos que arrancan dentro de los próximos 15 minutos.
 * Mismo alcance que listarSalaDeEspera (propio para médico, todos para
 * admin/secretaría), liviano a propósito porque esto se consulta con
 * polling desde cualquier pantalla.
 */
export async function obtenerNotificacionesTurnos() {
  const turnos = await listarSalaDeEspera();
  const ahora = Date.now();

  const urgentes = turnos
    .filter((t) => {
      if (t.estado === "EN_ESPERA") return true;
      if (t.estado === "RESERVADO" || t.estado === "CONFIRMADO") {
        const inicio = new Date(t.fechaHora).getTime();
        return inicio - ahora <= VENTANA_PROXIMO_MIN * 60_000 && inicio - ahora > -30 * 60_000;
      }
      return false;
    })
    .map((t) => ({
      id: t.id,
      pacienteId: t.pacienteId,
      fechaHora: t.fechaHora,
      estado: t.estado,
      paciente: { nombre: t.paciente.nombre, apellido: t.paciente.apellido },
      profesional: { nombre: t.profesional.nombre, apellido: t.profesional.apellido },
    }));

  return urgentes;
}

async function cambiarEstadoTurno(turnoId: string, estado: EstadoTurno) {
  const session = await requireSession();

  const turno = await withTenantContext(session.tenantId, (tx) =>
    tx.turno.findUniqueOrThrow({ where: { id: turnoId } })
  );
  await assertPuedeGestionarTurno(session, turno.profesionalId);

  await withTenantContext(session.tenantId, async (tx) => {
    await tx.turno.update({ where: { id: turnoId }, data: { estado } });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "UPDATE",
      entidad: "Turno",
      entidadId: turnoId,
      detalle: { estado },
    });
  });

  revalidatePath("/sala-espera");
  revalidatePath("/turnos");
}

/** Secretaría marca que el paciente llegó (por si no pasó por el kiosco). */
export async function marcarEnEspera(turnoId: string) {
  return cambiarEstadoTurno(turnoId, "EN_ESPERA");
}

/** El médico "llama" al paciente — abre el panel de consulta desde acá. */
export async function marcarEnAtencion(turnoId: string) {
  return cambiarEstadoTurno(turnoId, "EN_ATENCION");
}

/** "Cerrar consulta" — libera el turno para que sepan que ya se puede llamar al siguiente. */
export async function marcarAtendido(turnoId: string) {
  return cambiarEstadoTurno(turnoId, "ATENDIDO");
}

export async function marcarAusente(turnoId: string) {
  return cambiarEstadoTurno(turnoId, "AUSENTE");
}

/** Para el banner "Cerrar consulta" en el panel del paciente, cuando se llega desde sala de espera. */
export async function obtenerTurnoActivo(turnoId: string) {
  const session = await requireSession();
  return withTenantContext(session.tenantId, (tx) =>
    tx.turno.findFirst({
      where: { id: turnoId, estado: "EN_ATENCION" },
      include: { practica: true },
    })
  );
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

  const weekStart = inicioDiaArgentina(weekStartISO);
  const weekEnd = addDays(weekStart, 7);

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
