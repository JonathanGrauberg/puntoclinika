"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { EstadoHallazgo, SuperficieDental, TipoHallazgo } from "@prisma/client";
import { requireSession, obtenerMiProfesionalId } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { hasModule } from "@/lib/modules";
import { audit } from "@/lib/audit";
import { permisosDe } from "@/lib/permissions";
import {
  HALLAZGOS,
  TRATAMIENTOS,
  esPiezaValida,
  loCierra,
  resumenSuperficies,
  type TipoTratamiento,
} from "@/lib/odontograma";

export interface HallazgoVista {
  id: string;
  pieza: number;
  superficies: SuperficieDental[];
  tipo: TipoHallazgo;
  estado: EstadoHallazgo;
  nota: string | null;
  fecha: string;
  anuladoEn: string | null;
  profesional: string;
}

export interface OdontogramaResultado {
  error?: string;
}

const SUPERFICIES = ["VESTIBULAR", "LINGUAL", "MESIAL", "DISTAL", "OCLUSAL"] as const;
const TIPOS = [
  "CARIES",
  "OBTURACION",
  "CORONA",
  "ENDODONCIA",
  "EXTRACCION",
  "AUSENTE",
  "IMPLANTE",
  "PROTESIS_FIJA",
  "PROTESIS_REMOVIBLE",
  "FRACTURA",
  "SELLADOR",
  "OTRO",
] as const;

const baseSchema = z.object({
  pacienteId: z.string().min(1),
  pieza: z.number().int().refine(esPiezaValida, "Pieza inválida"),
  superficies: z.array(z.enum(SUPERFICIES)).max(5),
  nota: z.string().trim().max(500).optional(),
});

const hallazgoSchema = baseSchema.extend({
  tipo: z.enum(TIPOS),
  estado: z.enum(["A_REALIZAR", "EXISTENTE"]),
});

const tratamientoSchema = baseSchema.extend({
  tratamiento: z.enum([
    "OBTURACION",
    "ENDODONCIA",
    "CORONA",
    "EXTRACCION",
    "IMPLANTE",
    "SELLADOR",
    "PROTESIS_FIJA",
    "PROTESIS_REMOVIBLE",
    "OTRO",
  ]),
});

/** Todos los hallazgos del paciente (vigentes y resueltos); el cliente arma la vista y el historial. */
export async function listarHallazgos(pacienteId: string): Promise<HallazgoVista[]> {
  const session = await requireSession();
  if (!permisosDe(session.rol).verHistoriaClinica) return [];

  const filas = await withTenantContext(session.tenantId, (tx) =>
    tx.hallazgoDental.findMany({
      where: { pacienteId },
      include: { profesional: { select: { nombre: true, apellido: true } } },
      orderBy: { fecha: "desc" },
    })
  );
  return filas.map((h) => ({
    id: h.id,
    pieza: h.pieza,
    superficies: h.superficies,
    tipo: h.tipo,
    estado: h.estado,
    nota: h.nota,
    fecha: h.fecha.toISOString(),
    anuladoEn: h.anuladoEn?.toISOString() ?? null,
    profesional: `${h.profesional.nombre} ${h.profesional.apellido}`,
  }));
}

async function contextoEscritura() {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarHistoriaClinica) {
    return { error: "No tenés permiso para hacer esto." } as const;
  }
  const profesionalId = await obtenerMiProfesionalId(session.userId, session.tenantId);
  if (!profesionalId) {
    return { error: "Tu usuario todavía no está vinculado a un profesional." } as const;
  }
  return { session, profesionalId } as const;
}

const mismasCaras = (a: SuperficieDental[], b: SuperficieDental[]) =>
  a.length === b.length && a.every((s) => b.includes(s));

/** "Anotar lo que tiene": agrega un hallazgo (rojo o azul) a una pieza. */
export async function anotarHallazgo(input: z.input<typeof hallazgoSchema>): Promise<OdontogramaResultado> {
  const parsed = hallazgoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const data = parsed.data;

  const ctx = await contextoEscritura();
  if ("error" in ctx) return { error: ctx.error };
  const { session, profesionalId } = ctx;

  const superficies = HALLAZGOS[data.tipo].porCara ? data.superficies : [];
  if (HALLAZGOS[data.tipo].porCara && data.tipo !== "OTRO" && superficies.length === 0) {
    return { error: "Elegí en qué cara está." };
  }

  const res = await withTenantContext(session.tenantId, async (tx) => {
    if (!(await hasModule(tx, session.tenantId, "ODONTOGRAMA"))) return { error: "El odontograma no está activo." };

    const abiertos = await tx.hallazgoDental.findMany({
      where: { pacienteId: data.pacienteId, pieza: data.pieza, anuladoEn: null, tipo: data.tipo, estado: data.estado },
      select: { superficies: true },
    });
    if (abiertos.some((h) => mismasCaras(h.superficies, superficies))) return { error: "Eso ya está anotado." };

    const creado = await tx.hallazgoDental.create({
      data: {
        tenantId: session.tenantId,
        pacienteId: data.pacienteId,
        profesionalId,
        pieza: data.pieza,
        superficies,
        tipo: data.tipo,
        estado: data.estado,
        nota: data.nota || null,
      },
    });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "CREATE",
      entidad: "HallazgoDental",
      entidadId: creado.id,
      detalle: { pieza: data.pieza, tipo: data.tipo, estado: data.estado },
    });
    return {};
  });

  if (res.error) return res;
  revalidatePath(`/pacientes/${data.pacienteId}`);
  return {};
}

/**
 * "Registré un tratamiento hoy": deja lo hecho en azul, cierra lo que quedaba por
 * hacer de esa pieza y lo escribe en la historia clínica con fecha y profesional.
 */
export async function registrarTratamiento(input: z.input<typeof tratamientoSchema>): Promise<OdontogramaResultado> {
  const parsed = tratamientoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const data = parsed.data;
  const meta = TRATAMIENTOS[data.tratamiento as TipoTratamiento];

  const ctx = await contextoEscritura();
  if ("error" in ctx) return { error: ctx.error };
  const { session, profesionalId } = ctx;

  const superficies = meta.porCara ? data.superficies : [];
  if (meta.porCara && superficies.length === 0) return { error: "Elegí en qué cara hiciste el tratamiento." };
  if (data.tratamiento === "OTRO" && !data.nota) return { error: "Contanos brevemente qué hiciste." };

  const res = await withTenantContext(session.tenantId, async (tx) => {
    if (!(await hasModule(tx, session.tenantId, "ODONTOGRAMA"))) return { error: "El odontograma no está activo." };

    const abiertos = await tx.hallazgoDental.findMany({
      where: { pacienteId: data.pacienteId, pieza: data.pieza, anuladoEn: null },
      select: { id: true, tipo: true, estado: true, superficies: true },
    });
    const aCerrar = abiertos.filter((h) => loCierra(meta, h, superficies)).map((h) => h.id);
    if (aCerrar.length > 0) {
      await tx.hallazgoDental.updateMany({ where: { id: { in: aCerrar } }, data: { anuladoEn: new Date() } });
    }

    if (meta.deja) {
      await tx.hallazgoDental.create({
        data: {
          tenantId: session.tenantId,
          pacienteId: data.pacienteId,
          profesionalId,
          pieza: data.pieza,
          superficies: meta.deja === "AUSENTE" ? [] : superficies,
          tipo: meta.deja,
          estado: "EXISTENTE",
          nota: data.nota || null,
        },
      });
    }

    const caras = superficies.length > 0 ? ` (${resumenSuperficies(superficies, data.pieza)})` : "";
    const entrada = await tx.historiaClinicaEntry.create({
      data: {
        tenantId: session.tenantId,
        pacienteId: data.pacienteId,
        profesionalId,
        tipo: "PRESTACION",
        contenido: `${meta.label} — pieza ${data.pieza}${caras}${data.nota ? `. ${data.nota}` : ""}`,
        piezas: [data.pieza],
      },
    });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "CREATE",
      entidad: "HistoriaClinicaEntry",
      entidadId: entrada.id,
      detalle: { tipo: "PRESTACION", pieza: data.pieza, tratamiento: data.tratamiento, cerrados: aCerrar.length },
    });
    return {};
  });

  if (res.error) return res;
  revalidatePath(`/pacientes/${data.pacienteId}`);
  return {};
}

/** "Me equivoqué": cierra un hallazgo sin tocar nada más. Queda en el historial. */
export async function anularHallazgo(id: string): Promise<OdontogramaResultado> {
  const ctx = await contextoEscritura();
  if ("error" in ctx) return { error: ctx.error };
  const { session } = ctx;

  const pacienteId = await withTenantContext(session.tenantId, async (tx) => {
    const h = await tx.hallazgoDental.update({ where: { id }, data: { anuladoEn: new Date() } });
    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "UPDATE",
      entidad: "HallazgoDental",
      entidadId: id,
      detalle: { anulado: true, pieza: h.pieza, tipo: h.tipo },
    });
    return h.pacienteId;
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  return {};
}
