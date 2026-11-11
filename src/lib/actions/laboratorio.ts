"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { withTenantContext, type TenantClient } from "@/lib/tenant-context";
import { audit } from "@/lib/audit";
import { permisosDe } from "@/lib/permissions";
import { hasModule } from "@/lib/modules";
import { CATALOGO_LAB_EJEMPLO } from "@/lib/laboratorio-catalogo";

const SIN_PERMISO = { error: "No tenés permiso para hacer esto." };
const SIN_MODULO = { error: "El módulo de laboratorio no está activo." };

export interface TrabajoVista {
  id: string;
  nombre: string;
  categoria: string;
  laboratorioId: string | null;
  activo: boolean;
}

export interface LaboratorioVisto {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  especialidades: string[];
  notas: string | null;
  activo: boolean;
  trabajos: number;
}

/** Carga los ejemplos la primera vez que el consultorio entra (una sola vez: si después los borra, no vuelven). */
async function asegurarCatalogo(tx: TenantClient, tenantId: string) {
  const reclamo = await tx.tenant.updateMany({
    where: { id: tenantId, catalogoLabCargadoEn: null },
    data: { catalogoLabCargadoEn: new Date() },
  });
  if (reclamo.count === 0) return;
  await tx.tipoTrabajo.createMany({
    data: CATALOGO_LAB_EJEMPLO.flatMap((c) =>
      c.trabajos.map((nombre) => ({ tenantId, nombre, categoria: c.categoria }))
    ),
  });
}

export async function obtenerCatalogoLaboratorio() {
  const session = await requireSession();
  if (!permisosDe(session.rol).verLaboratorio) return null;
  return withTenantContext(session.tenantId, async (tx) => {
    if (!(await hasModule(tx, session.tenantId, "LABORATORIO"))) return null;
    await asegurarCatalogo(tx, session.tenantId);
    const [trabajos, laboratorios] = await Promise.all([
      tx.tipoTrabajo.findMany({ orderBy: [{ categoria: "asc" }, { nombre: "asc" }] }),
      tx.laboratorio.findMany({
        orderBy: { nombre: "asc" },
        include: { _count: { select: { tiposTrabajo: true } } },
      }),
    ]);
    return {
      trabajos: trabajos.map<TrabajoVista>((t) => ({
        id: t.id,
        nombre: t.nombre,
        categoria: t.categoria,
        laboratorioId: t.laboratorioId,
        activo: t.activo,
      })),
      laboratorios: laboratorios.map<LaboratorioVisto>((l) => ({
        id: l.id,
        nombre: l.nombre,
        contacto: l.contacto,
        telefono: l.telefono,
        email: l.email,
        especialidades: l.especialidades,
        notas: l.notas,
        activo: l.activo,
        trabajos: l._count.tiposTrabajo,
      })),
    };
  });
}

type Sesion = Awaited<ReturnType<typeof requireSession>>;
type Resultado = { error?: string; id?: string };

/** Permiso + módulo + tenant para las acciones que modifican. */
async function conPermiso(fn: (tx: TenantClient, s: Sesion) => Promise<Resultado>): Promise<Resultado> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarLaboratorio) return SIN_PERMISO;
  return withTenantContext(session.tenantId, async (tx) => {
    if (!(await hasModule(tx, session.tenantId, "LABORATORIO"))) return SIN_MODULO;
    return fn(tx, session);
  });
}

// --- Trabajos --------------------------------------------------------------

const trabajoSchema = z.object({
  nombre: z.string().trim().min(1, "Escribí el nombre del trabajo").max(120),
  categoria: z.string().trim().min(1, "Elegí una categoría").max(60),
  laboratorioId: z.string().min(1).nullable().optional(),
});

async function laboratorioValido(tx: TenantClient, id: string | null | undefined) {
  if (!id) return true;
  return (await tx.laboratorio.count({ where: { id } })) === 1; // RLS limita al consultorio
}

export async function crearTrabajo(input: z.input<typeof trabajoSchema>): Promise<Resultado> {
  const parsed = trabajoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const r = await conPermiso(async (tx, s) => {
    if (!(await laboratorioValido(tx, parsed.data.laboratorioId))) return { error: "Ese laboratorio no existe." };
    const t = await tx.tipoTrabajo.create({
      data: {
        tenantId: s.tenantId,
        nombre: parsed.data.nombre,
        categoria: parsed.data.categoria,
        laboratorioId: parsed.data.laboratorioId ?? null,
      },
    });
    await audit(tx, { tenantId: s.tenantId, userId: s.userId, accion: "CREATE", entidad: "TipoTrabajo", entidadId: t.id });
    return { id: t.id };
  });
  revalidatePath("/laboratorio", "layout");
  return r;
}

export async function actualizarTrabajo(id: string, input: z.input<typeof trabajoSchema>): Promise<Resultado> {
  const parsed = trabajoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const r = await conPermiso(async (tx, s) => {
    if (!(await laboratorioValido(tx, parsed.data.laboratorioId))) return { error: "Ese laboratorio no existe." };
    const res = await tx.tipoTrabajo.updateMany({
      where: { id, tenantId: s.tenantId },
      data: {
        nombre: parsed.data.nombre,
        categoria: parsed.data.categoria,
        laboratorioId: parsed.data.laboratorioId ?? null,
      },
    });
    if (res.count === 0) return { error: "No encontré ese trabajo." };
    await audit(tx, { tenantId: s.tenantId, userId: s.userId, accion: "UPDATE", entidad: "TipoTrabajo", entidadId: id });
    return {};
  });
  revalidatePath("/laboratorio", "layout");
  return r;
}

export async function eliminarTrabajo(id: string): Promise<Resultado> {
  const r = await conPermiso(async (tx, s) => {
    const res = await tx.tipoTrabajo.deleteMany({ where: { id, tenantId: s.tenantId } });
    if (res.count === 0) return { error: "No encontré ese trabajo." };
    await audit(tx, { tenantId: s.tenantId, userId: s.userId, accion: "DELETE", entidad: "TipoTrabajo", entidadId: id });
    return {};
  });
  revalidatePath("/laboratorio", "layout");
  return r;
}

// --- Laboratorios ----------------------------------------------------------

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const laboratorioSchema = z.object({
  nombre: z.string().trim().min(1, "Escribí el nombre del laboratorio").max(120),
  contacto: textoOpcional(120),
  telefono: textoOpcional(40),
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "El email no parece válido"),
  especialidades: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  notas: textoOpcional(500),
  activo: z.boolean().default(true),
});

export async function crearLaboratorio(input: z.input<typeof laboratorioSchema>): Promise<Resultado> {
  const parsed = laboratorioSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const r = await conPermiso(async (tx, s) => {
    const l = await tx.laboratorio.create({ data: { tenantId: s.tenantId, ...parsed.data } });
    await audit(tx, { tenantId: s.tenantId, userId: s.userId, accion: "CREATE", entidad: "Laboratorio", entidadId: l.id });
    return { id: l.id };
  });
  revalidatePath("/laboratorio", "layout");
  return r;
}

export async function actualizarLaboratorio(id: string, input: z.input<typeof laboratorioSchema>): Promise<Resultado> {
  const parsed = laboratorioSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const r = await conPermiso(async (tx, s) => {
    const res = await tx.laboratorio.updateMany({ where: { id, tenantId: s.tenantId }, data: parsed.data });
    if (res.count === 0) return { error: "No encontré ese laboratorio." };
    await audit(tx, { tenantId: s.tenantId, userId: s.userId, accion: "UPDATE", entidad: "Laboratorio", entidadId: id });
    return {};
  });
  revalidatePath("/laboratorio", "layout");
  return r;
}

export async function eliminarLaboratorio(id: string): Promise<Resultado> {
  const r = await conPermiso(async (tx, s) => {
    const conPedidos = await tx.pedidoLaboratorio.count({ where: { laboratorioId: id } });
    if (conPedidos > 0) {
      return { error: "Ya tiene pedidos, así que no se puede borrar. Desmarcá “Lo sigo usando” y deja de aparecer." };
    }
    const res = await tx.laboratorio.deleteMany({ where: { id, tenantId: s.tenantId } });
    if (res.count === 0) return { error: "No encontré ese laboratorio." };
    await audit(tx, { tenantId: s.tenantId, userId: s.userId, accion: "DELETE", entidad: "Laboratorio", entidadId: id });
    return {};
  });
  revalidatePath("/laboratorio", "layout");
  return r;
}
