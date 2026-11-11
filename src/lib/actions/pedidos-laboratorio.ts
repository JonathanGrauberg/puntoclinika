"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { EstadoPedidoLab } from "@prisma/client";
import { requireSession } from "@/lib/session";
import { withTenantContext, type TenantClient } from "@/lib/tenant-context";
import { audit } from "@/lib/audit";
import { permisosDe } from "@/lib/permissions";
import { hasModule } from "@/lib/modules";
import { inicioDiaArgentina } from "@/lib/date-utils";
import { ORDEN_ESTADOS } from "@/lib/pedidos-lab";

type Sesion = Awaited<ReturnType<typeof requireSession>>;
type Resultado = { error?: string; id?: string };

export interface PedidoResumen {
  id: string;
  numero: number;
  trabajo: string;
  piezas: number[];
  estado: EstadoPedidoLab;
  fechaEntrega: Date | null;
  creadoEn: Date;
  paciente: { id: string; nombre: string; apellido: string };
  laboratorio: { id: string; nombre: string };
}

export interface PedidoDetalle extends PedidoResumen {
  color: string | null;
  notas: string | null;
  entregadoEn: Date | null;
  paciente: { id: string; nombre: string; apellido: string; telefono: string | null };
  laboratorio: { id: string; nombre: string; telefono: string | null; email: string | null };
  estados: { id: string; estado: EstadoPedidoLab; nota: string | null; autor: string; autorTipo: string; creadoEn: Date }[];
  mensajes: { id: string; autorTipo: string; autorNombre: string; texto: string; creadoEn: Date }[];
}

const resumenSelect = {
  id: true,
  numero: true,
  trabajo: true,
  piezas: true,
  estado: true,
  fechaEntrega: true,
  creadoEn: true,
  paciente: { select: { id: true, nombre: true, apellido: true } },
  laboratorio: { select: { id: true, nombre: true } },
} as const;

/** Ver pedidos: permiso + módulo. Devuelve null si no corresponde. */
async function paraVer<T>(fn: (tx: TenantClient, s: Sesion) => Promise<T>): Promise<T | null> {
  const session = await requireSession();
  if (!permisosDe(session.rol).verLaboratorio) return null;
  return withTenantContext(session.tenantId, async (tx) => {
    if (!(await hasModule(tx, session.tenantId, "LABORATORIO"))) return null;
    return fn(tx, session);
  });
}

async function paraGestionar(fn: (tx: TenantClient, s: Sesion) => Promise<Resultado>): Promise<Resultado> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarLaboratorio) return { error: "No tenés permiso para hacer esto." };
  return withTenantContext(session.tenantId, async (tx) => {
    if (!(await hasModule(tx, session.tenantId, "LABORATORIO"))) {
      return { error: "El módulo de laboratorio no está activo." };
    }
    return fn(tx, session);
  });
}

export async function listarPedidos(): Promise<PedidoResumen[] | null> {
  return paraVer((tx) =>
    tx.pedidoLaboratorio.findMany({
      select: resumenSelect,
      orderBy: [{ creadoEn: "desc" }],
      take: 500,
    })
  );
}

export async function listarPedidosDePaciente(pacienteId: string): Promise<PedidoResumen[]> {
  const r = await paraVer((tx) =>
    tx.pedidoLaboratorio.findMany({
      where: { pacienteId },
      select: resumenSelect,
      orderBy: { creadoEn: "desc" },
      take: 50,
    })
  );
  return r ?? [];
}

export async function obtenerPedido(id: string): Promise<PedidoDetalle | null> {
  return paraVer(async (tx) => {
    const p = await tx.pedidoLaboratorio.findUnique({
      where: { id },
      select: {
        ...resumenSelect,
        color: true,
        notas: true,
        entregadoEn: true,
        paciente: { select: { id: true, nombre: true, apellido: true, telefono: true } },
        laboratorio: { select: { id: true, nombre: true, telefono: true, email: true } },
        estados: { orderBy: { creadoEn: "asc" } },
        mensajes: { orderBy: { creadoEn: "asc" } },
      },
    });
    return p;
  });
}

export async function datosNuevoPedido() {
  return paraVer(async (tx) => {
    const [trabajos, laboratorios] = await Promise.all([
      tx.tipoTrabajo.findMany({
        where: { activo: true },
        orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
        select: { id: true, nombre: true, categoria: true, laboratorioId: true },
      }),
      tx.laboratorio.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true },
      }),
    ]);
    return { trabajos, laboratorios };
  });
}

const pedidoSchema = z.object({
  pacienteId: z.string().min(1, "Elegí el paciente"),
  tipoTrabajoId: z.string().min(1, "Elegí el trabajo"),
  laboratorioId: z.string().min(1, "Elegí el laboratorio"),
  piezas: z
    .array(z.number().int().min(11).max(85))
    .max(32)
    .default([]),
  color: z.string().trim().max(60).optional(),
  notas: z.string().trim().max(1000).optional(),
  // YYYY-MM-DD, opcional
  fechaEntrega: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida")
    .optional()
    .or(z.literal("")),
});

export async function crearPedido(input: z.input<typeof pedidoSchema>): Promise<Resultado> {
  const parsed = pedidoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const d = parsed.data;

  const r = await paraGestionar(async (tx, s) => {
    // RLS limita todo al consultorio: si no los ve, no son suyos.
    const [paciente, trabajo, laboratorio] = await Promise.all([
      tx.paciente.findUnique({ where: { id: d.pacienteId }, select: { id: true } }),
      tx.tipoTrabajo.findUnique({ where: { id: d.tipoTrabajoId }, select: { nombre: true } }),
      tx.laboratorio.findUnique({ where: { id: d.laboratorioId }, select: { id: true } }),
    ]);
    if (!paciente) return { error: "No encontré al paciente." };
    if (!trabajo) return { error: "No encontré ese trabajo." };
    if (!laboratorio) return { error: "No encontré ese laboratorio." };

    const ultimo = await tx.pedidoLaboratorio.aggregate({ _max: { numero: true } });
    const pedido = await tx.pedidoLaboratorio.create({
      data: {
        tenantId: s.tenantId,
        numero: (ultimo._max.numero ?? 0) + 1,
        pacienteId: d.pacienteId,
        laboratorioId: d.laboratorioId,
        tipoTrabajoId: d.tipoTrabajoId,
        trabajo: trabajo.nombre,
        piezas: [...new Set(d.piezas)].sort((a, b) => a - b),
        color: d.color || null,
        notas: d.notas || null,
        fechaEntrega: d.fechaEntrega ? inicioDiaArgentina(d.fechaEntrega) : null,
        creadoPorId: s.userId,
        estados: {
          create: { tenantId: s.tenantId, estado: "ENVIADO", autor: s.userName, autorTipo: "CONSULTORIO" },
        },
      },
      select: { id: true },
    });
    await audit(tx, {
      tenantId: s.tenantId,
      userId: s.userId,
      accion: "CREATE",
      entidad: "PedidoLaboratorio",
      entidadId: pedido.id,
    });
    return { id: pedido.id };
  });
  revalidatePath("/laboratorio", "layout");
  if (!r.error) revalidatePath(`/pacientes/${d.pacienteId}`);
  return r;
}

export async function cambiarEstadoPedido(id: string, estado: EstadoPedidoLab, nota?: string): Promise<Resultado> {
  if (!ORDEN_ESTADOS.includes(estado)) return { error: "Estado inválido." };
  const textoNota = (nota ?? "").trim().slice(0, 500) || null;

  const r = await paraGestionar(async (tx, s) => {
    const actual = await tx.pedidoLaboratorio.findUnique({ where: { id }, select: { estado: true } });
    if (!actual) return { error: "No encontré el pedido." };
    if (actual.estado === estado) return { error: "El pedido ya está en ese estado." };

    await tx.pedidoLaboratorio.update({
      where: { id },
      data: {
        estado,
        entregadoEn: estado === "ENTREGADO" ? new Date() : null,
        estados: {
          create: { tenantId: s.tenantId, estado, nota: textoNota, autor: s.userName, autorTipo: "CONSULTORIO" },
        },
      },
    });
    await audit(tx, {
      tenantId: s.tenantId,
      userId: s.userId,
      accion: "UPDATE",
      entidad: "PedidoLaboratorio",
      entidadId: id,
      detalle: { estado },
    });
    return {};
  });
  revalidatePath("/laboratorio", "layout");
  return r;
}

export async function enviarMensajePedido(id: string, texto: string): Promise<Resultado> {
  const limpio = texto.trim();
  if (!limpio) return { error: "Escribí el mensaje." };
  if (limpio.length > 2000) return { error: "El mensaje es demasiado largo." };

  const r = await paraGestionar(async (tx, s) => {
    const existe = await tx.pedidoLaboratorio.findUnique({ where: { id }, select: { id: true } });
    if (!existe) return { error: "No encontré el pedido." };
    await tx.pedidoMensaje.create({
      data: { tenantId: s.tenantId, pedidoId: id, autorTipo: "CONSULTORIO", autorNombre: s.userName, texto: limpio },
    });
    return {};
  });
  revalidatePath(`/laboratorio/pedidos/${id}`);
  return r;
}
