"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ModuloKey, TipoCentro } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withTenantContext } from "@/lib/tenant-context";
import { audit } from "@/lib/audit";
import { obtenerDueno, totalMensual, withDueno, type Dueno } from "@/lib/dueno";

const NO_ES_DUENO = { error: "No tenés permiso para hacer esto." };
type Resultado = { error?: string };

const MODULOS: ModuloKey[] = [
  "PACIENTES",
  "TURNOS",
  "ESTUDIOS",
  "FACTURACION",
  "OBRAS_SOCIALES",
  "PORTAL_PACIENTE",
  "ODONTOGRAMA",
  "RECETAS_INFORMES",
  "REPORTES",
  "INTEGRACIONES_DICOM",
  "LABORATORIO",
];
const moduloSchema = z.enum(MODULOS as [ModuloKey, ...ModuloKey[]]);

// --- Lectura ---------------------------------------------------------------

export interface CuentaResumen {
  id: string;
  nombre: string;
  tipo: TipoCentro;
  activo: boolean;
  creadoEn: Date;
  trialHasta: Date | null;
  plan: { id: string; nombre: string } | null;
  usuarios: number;
  modulos: ModuloKey[];
  totalMensual: number;
}

export interface CatalogoModulo {
  modulo: ModuloKey;
  nombre: string;
  descripcion: string;
  precioMensual: number;
  vendible: boolean;
}

export interface PlanVista {
  id: string;
  nombre: string;
  tipo: TipoCentro;
  descripcion: string;
  precioMensual: number;
  modulos: ModuloKey[];
  activo: boolean;
  orden: number;
  cuentas: number;
}

async function cargarCatalogo() {
  const [modulos, planes] = await Promise.all([
    prisma.moduloCatalogo.findMany({ orderBy: { nombre: "asc" } }),
    prisma.plan.findMany({ orderBy: [{ tipo: "asc" }, { orden: "asc" }], include: { _count: { select: { tenants: true } } } }),
  ]);
  return {
    modulos: modulos.map<CatalogoModulo>((m) => ({ ...m, precioMensual: Number(m.precioMensual) })),
    planes: planes.map<PlanVista>((p) => ({
      id: p.id,
      nombre: p.nombre,
      tipo: p.tipo,
      descripcion: p.descripcion,
      precioMensual: Number(p.precioMensual),
      modulos: p.modulos,
      activo: p.activo,
      orden: p.orden,
      cuentas: p._count.tenants,
    })),
  };
}

export async function obtenerCatalogoDueno() {
  if (!(await obtenerDueno())) return null;
  return cargarCatalogo();
}

export async function listarCuentas(): Promise<CuentaResumen[] | null> {
  if (!(await obtenerDueno())) return null;
  const catalogo = await cargarCatalogo();
  const precios = Object.fromEntries(catalogo.modulos.map((m) => [m.modulo, m.precioMensual]));

  const [tenants, modulos, membresias] = await Promise.all([
    prisma.tenant.findMany({ orderBy: { createdAt: "desc" }, include: { plan: true } }),
    withDueno((tx) =>
      tx.tenantModule.findMany({ where: { habilitado: true }, select: { tenantId: true, modulo: true, precioOverride: true } })
    ),
    withDueno((tx) => tx.membership.groupBy({ by: ["tenantId"], _count: { _all: true } })),
  ]);

  return tenants.map((t) => {
    const habilitados = modulos.filter((m) => m.tenantId === t.id);
    const { total } = totalMensual({
      plan: t.plan ? { precioMensual: Number(t.plan.precioMensual), modulos: t.plan.modulos } : null,
      habilitados: habilitados.map((m) => ({ modulo: m.modulo, precioOverride: m.precioOverride ? Number(m.precioOverride) : null })),
      precios,
    });
    return {
      id: t.id,
      nombre: t.nombre,
      tipo: t.tipo,
      activo: t.activo,
      creadoEn: t.createdAt,
      trialHasta: t.trialHasta,
      plan: t.plan ? { id: t.plan.id, nombre: t.plan.nombre } : null,
      usuarios: membresias.find((m) => m.tenantId === t.id)?._count._all ?? 0,
      modulos: habilitados.map((m) => m.modulo),
      totalMensual: total,
    };
  });
}

export interface CuentaDetalle {
  id: string;
  nombre: string;
  tipo: TipoCentro;
  activo: boolean;
  creadoEn: Date;
  trialHasta: Date | null;
  notasInternas: string | null;
  plan: PlanVista | null;
  usuarios: { email: string; nombre: string; rol: string; activo: boolean }[];
  /** Una fila por módulo del catálogo, con su estado en esta cuenta. */
  modulos: {
    modulo: ModuloKey;
    nombre: string;
    descripcion: string;
    habilitado: boolean;
    enPlan: boolean;
    precioCatalogo: number;
    precioEspecial: number | null;
  }[];
  planesDisponibles: PlanVista[];
  totalMensual: number;
}

export async function obtenerCuenta(id: string): Promise<CuentaDetalle | null> {
  if (!(await obtenerDueno())) return null;
  const t = await prisma.tenant.findUnique({ where: { id }, include: { plan: true } });
  if (!t) return null;
  const catalogo = await cargarCatalogo();
  const precios = Object.fromEntries(catalogo.modulos.map((m) => [m.modulo, m.precioMensual]));

  const { filas, miembros } = await withDueno(async (tx) => ({
    filas: await tx.tenantModule.findMany({ where: { tenantId: id } }),
    miembros: await tx.membership.findMany({ where: { tenantId: id }, include: { user: { select: { email: true, nombre: true, activo: true } } } }),
  }));

  const enPlan = new Set<ModuloKey>(t.plan?.modulos ?? []);
  const modulos = catalogo.modulos.map((c) => {
    const fila = filas.find((f) => f.modulo === c.modulo);
    return {
      modulo: c.modulo,
      nombre: c.nombre,
      descripcion: c.descripcion,
      habilitado: fila?.habilitado ?? false,
      enPlan: enPlan.has(c.modulo),
      precioCatalogo: c.precioMensual,
      precioEspecial: fila?.precioOverride ? Number(fila.precioOverride) : null,
    };
  });
  const { total } = totalMensual({
    plan: t.plan ? { precioMensual: Number(t.plan.precioMensual), modulos: t.plan.modulos } : null,
    habilitados: modulos.filter((m) => m.habilitado).map((m) => ({ modulo: m.modulo, precioOverride: m.precioEspecial })),
    precios,
  });

  return {
    id: t.id,
    nombre: t.nombre,
    tipo: t.tipo,
    activo: t.activo,
    creadoEn: t.createdAt,
    trialHasta: t.trialHasta,
    notasInternas: t.notasInternas,
    plan: catalogo.planes.find((p) => p.id === t.planId) ?? null,
    usuarios: miembros.map((m) => ({ email: m.user.email, nombre: m.user.nombre, rol: m.rol, activo: m.user.activo && m.activo })),
    modulos,
    planesDisponibles: catalogo.planes.filter((p) => p.tipo === t.tipo && (p.activo || p.id === t.planId)),
    totalMensual: total,
  };
}

// --- Escritura sobre una cuenta ---------------------------------------------

/**
 * Valida al dueño y corre el cambio con el contexto de la cuenta afectada.
 * Cada cambio queda en el registro de auditoría de esa cuenta, con el dueño como autor.
 */
async function sobreCuenta(
  tenantId: string,
  accion: string,
  detalle: Record<string, string | number | boolean | null>,
  fn: (tx: Parameters<Parameters<typeof withTenantContext>[1]>[0], dueno: Dueno) => Promise<Resultado | void>
): Promise<Resultado> {
  const dueno = await obtenerDueno();
  if (!dueno) return NO_ES_DUENO;
  const existe = await prisma.tenant.count({ where: { id: tenantId } });
  if (!existe) return { error: "No encontré esa cuenta." };

  const r = await withTenantContext(tenantId, async (tx) => {
    const res = await fn(tx, dueno);
    if (res && res.error) return res;
    await audit(tx, {
      tenantId,
      userId: dueno.userId,
      accion: "UPDATE",
      entidad: "Cuenta",
      entidadId: tenantId,
      detalle: { accion, via: "dueno", ...detalle },
    });
    return {};
  });
  revalidatePath("/dueno", "layout");
  return r;
}

export async function activarModuloCuenta(tenantId: string, modulo: ModuloKey, habilitado: boolean): Promise<Resultado> {
  if (!moduloSchema.safeParse(modulo).success) return { error: "Módulo inválido." };
  return sobreCuenta(tenantId, "modulo", { modulo, habilitado }, async (tx) => {
    await tx.tenantModule.upsert({
      where: { tenantId_modulo: { tenantId, modulo } },
      update: { habilitado, activadoEn: habilitado ? new Date() : undefined },
      create: { tenantId, modulo, habilitado, activadoEn: habilitado ? new Date() : null },
    });
  });
}

/** Precio especial de un módulo en esta cuenta (null = usa el del catálogo). */
export async function fijarPrecioEspecial(tenantId: string, modulo: ModuloKey, precio: number | null): Promise<Resultado> {
  if (!moduloSchema.safeParse(modulo).success) return { error: "Módulo inválido." };
  if (precio !== null && (!Number.isFinite(precio) || precio < 0 || precio > 100_000_000)) return { error: "El precio no es válido." };
  return sobreCuenta(tenantId, "precio_especial", { modulo, precio }, async (tx) => {
    await tx.tenantModule.upsert({
      where: { tenantId_modulo: { tenantId, modulo } },
      update: { precioOverride: precio },
      create: { tenantId, modulo, habilitado: false, precioOverride: precio },
    });
  });
}

/** Asigna el plan y prende sus módulos. No apaga ninguno que ya tuviera: lo extra se cobra suelto. */
export async function aplicarPlanCuenta(tenantId: string, planId: string | null): Promise<Resultado> {
  const dueno = await obtenerDueno();
  if (!dueno) return NO_ES_DUENO;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { tipo: true } });
  if (!tenant) return { error: "No encontré esa cuenta." };
  const plan = planId ? await prisma.plan.findUnique({ where: { id: planId } }) : null;
  if (planId && (!plan || plan.tipo !== tenant.tipo)) return { error: "Ese plan no es para este tipo de cuenta." };

  return sobreCuenta(tenantId, "plan", { plan: plan?.nombre ?? null }, async (tx) => {
    await tx.tenant.update({ where: { id: tenantId }, data: { planId } });
    for (const modulo of plan?.modulos ?? []) {
      await tx.tenantModule.upsert({
        where: { tenantId_modulo: { tenantId, modulo } },
        update: { habilitado: true },
        create: { tenantId, modulo, habilitado: true, activadoEn: new Date() },
      });
    }
  });
}

export async function extenderPrueba(tenantId: string, dias: number): Promise<Resultado> {
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) return { error: "Cantidad de días inválida." };
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { trialHasta: true } });
  if (!t) return { error: "No encontré esa cuenta." };
  const base = t.trialHasta && t.trialHasta.getTime() > Date.now() ? t.trialHasta.getTime() : Date.now();
  const nueva = new Date(base + dias * 86_400_000);
  return sobreCuenta(tenantId, "extender_prueba", { dias, hasta: nueva.toISOString() }, async (tx) => {
    await tx.tenant.update({ where: { id: tenantId }, data: { trialHasta: nueva } });
  });
}

export async function cambiarEstadoCuenta(tenantId: string, activo: boolean): Promise<Resultado> {
  return sobreCuenta(tenantId, activo ? "reactivar" : "suspender", { activo }, async (tx) => {
    await tx.tenant.update({ where: { id: tenantId }, data: { activo } });
  });
}

export async function guardarNotasCuenta(tenantId: string, notas: string): Promise<Resultado> {
  return sobreCuenta(tenantId, "notas", {}, async (tx) => {
    await tx.tenant.update({ where: { id: tenantId }, data: { notasInternas: notas.trim().slice(0, 2000) || null } });
  });
}

// --- Catálogo y planes -------------------------------------------------------

const precioSchema = z.number().finite().min(0).max(100_000_000);

export async function guardarModuloCatalogo(
  modulo: ModuloKey,
  datos: { nombre: string; descripcion: string; precioMensual: number; vendible: boolean }
): Promise<Resultado> {
  if (!(await obtenerDueno())) return NO_ES_DUENO;
  if (!moduloSchema.safeParse(modulo).success) return { error: "Módulo inválido." };
  const p = precioSchema.safeParse(datos.precioMensual);
  if (!p.success) return { error: "El precio no es válido." };
  if (!datos.nombre.trim()) return { error: "Escribí el nombre del módulo." };
  await prisma.moduloCatalogo.update({
    where: { modulo },
    data: {
      nombre: datos.nombre.trim().slice(0, 80),
      descripcion: datos.descripcion.trim().slice(0, 300),
      precioMensual: p.data,
      vendible: datos.vendible,
    },
  });
  revalidatePath("/dueno", "layout");
  return {};
}

const planSchema = z.object({
  nombre: z.string().trim().min(1, "Escribí el nombre del plan").max(80),
  tipo: z.enum(["MEDICO", "ODONTOLOGIA", "LABORATORIO"]),
  descripcion: z.string().trim().max(300).default(""),
  precioMensual: precioSchema,
  modulos: z.array(moduloSchema).max(20),
  activo: z.boolean().default(true),
});

export async function crearPlan(input: z.input<typeof planSchema>): Promise<Resultado> {
  if (!(await obtenerDueno())) return NO_ES_DUENO;
  const p = planSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Datos inválidos" };
  const ultimo = await prisma.plan.aggregate({ where: { tipo: p.data.tipo }, _max: { orden: true } });
  await prisma.plan.create({ data: { ...p.data, orden: (ultimo._max.orden ?? 0) + 1 } });
  revalidatePath("/dueno", "layout");
  return {};
}

export async function actualizarPlan(id: string, input: z.input<typeof planSchema>): Promise<Resultado> {
  if (!(await obtenerDueno())) return NO_ES_DUENO;
  const p = planSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Datos inválidos" };
  const actual = await prisma.plan.findUnique({ where: { id }, select: { tipo: true, _count: { select: { tenants: true } } } });
  if (!actual) return { error: "No encontré ese plan." };
  if (actual.tipo !== p.data.tipo && actual._count.tenants > 0) {
    return { error: "No se puede cambiar el tipo de un plan que ya tiene cuentas." };
  }
  await prisma.plan.update({ where: { id }, data: p.data });
  revalidatePath("/dueno", "layout");
  return {};
}

/** Un plan con cuentas no se borra: se desactiva para que no se ofrezca más. */
export async function eliminarPlan(id: string): Promise<Resultado> {
  if (!(await obtenerDueno())) return NO_ES_DUENO;
  const p = await prisma.plan.findUnique({ where: { id }, select: { _count: { select: { tenants: true } } } });
  if (!p) return { error: "No encontré ese plan." };
  if (p._count.tenants > 0) {
    await prisma.plan.update({ where: { id }, data: { activo: false } });
  } else {
    await prisma.plan.delete({ where: { id } });
  }
  revalidatePath("/dueno", "layout");
  return {};
}
