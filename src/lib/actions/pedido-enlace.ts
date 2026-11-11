"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { withTenantContext, type TenantClient } from "@/lib/tenant-context";
import { audit } from "@/lib/audit";
import { permisosDe } from "@/lib/permissions";
import { hasModule } from "@/lib/modules";
import { sendEnlaceLaboratorioEmail } from "@/lib/email";
import {
  crearEnlaceParaPedido,
  estadoDeEnlace,
  urlEnlace,
  vencimientoDesdeHoy,
  type EstadoEnlace,
} from "@/lib/pedido-enlace";

type Sesion = Awaited<ReturnType<typeof requireSession>>;
type Resultado = { error?: string };

export interface EnlaceVista {
  url: string;
  estado: EstadoEnlace;
  venceEn: Date;
  usos: number;
  ultimoUsoEn: Date | null;
}

async function conPermiso(fn: (tx: TenantClient, s: Sesion) => Promise<Resultado>): Promise<Resultado> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarLaboratorio) return { error: "No tenés permiso para hacer esto." };
  return withTenantContext(session.tenantId, async (tx) => {
    if (!(await hasModule(tx, session.tenantId, "LABORATORIO"))) {
      return { error: "El módulo de laboratorio no está activo." };
    }
    return fn(tx, session);
  });
}

function aVista(e: { token: string; revocadoEn: Date | null; venceEn: Date; usos: number; ultimoUsoEn: Date | null }): EnlaceVista {
  return {
    url: urlEnlace(e.token),
    estado: estadoDeEnlace(e),
    venceEn: e.venceEn,
    usos: e.usos,
    ultimoUsoEn: e.ultimoUsoEn,
  };
}

/** El link más reciente del pedido (vigente, vencido o revocado), o null si nunca tuvo. */
export async function obtenerEnlacePedido(pedidoId: string): Promise<EnlaceVista | null> {
  const session = await requireSession();
  if (!permisosDe(session.rol).verLaboratorio) return null;
  return withTenantContext(session.tenantId, async (tx) => {
    const e = await tx.pedidoEnlace.findFirst({
      where: { pedidoId, tenantId: session.tenantId },
      orderBy: { creadoEn: "desc" },
    });
    return e ? aVista(e) : null;
  });
}

/** Crea un link nuevo (si ya hay uno vigente no hace nada). */
export async function crearEnlacePedido(pedidoId: string): Promise<Resultado> {
  const r = await conPermiso(async (tx, s) => {
    const pedido = await tx.pedidoLaboratorio.findUnique({ where: { id: pedidoId }, select: { id: true } });
    if (!pedido) return { error: "No encontré el pedido." };
    const ultimo = await tx.pedidoEnlace.findFirst({ where: { pedidoId }, orderBy: { creadoEn: "desc" } });
    if (ultimo && estadoDeEnlace(ultimo) === "vigente") return {};
    const e = await crearEnlaceParaPedido(tx, s.tenantId, pedidoId);
    await audit(tx, { tenantId: s.tenantId, userId: s.userId, accion: "CREATE", entidad: "PedidoEnlace", entidadId: e.id });
    return {};
  });
  revalidatePath(`/laboratorio/pedidos/${pedidoId}`);
  return r;
}

/** Suma otros 30 días. Si estaba revocado, genera un link nuevo (el viejo queda muerto). */
export async function renovarEnlacePedido(pedidoId: string): Promise<Resultado> {
  const r = await conPermiso(async (tx, s) => {
    const ultimo = await tx.pedidoEnlace.findFirst({ where: { pedidoId }, orderBy: { creadoEn: "desc" } });
    if (!ultimo || ultimo.revocadoEn) {
      const e = await crearEnlaceParaPedido(tx, s.tenantId, pedidoId);
      await audit(tx, { tenantId: s.tenantId, userId: s.userId, accion: "CREATE", entidad: "PedidoEnlace", entidadId: e.id });
      return {};
    }
    await tx.pedidoEnlace.update({ where: { id: ultimo.id }, data: { venceEn: vencimientoDesdeHoy() } });
    await audit(tx, { tenantId: s.tenantId, userId: s.userId, accion: "UPDATE", entidad: "PedidoEnlace", entidadId: ultimo.id, detalle: { accion: "renovar" } });
    return {};
  });
  revalidatePath(`/laboratorio/pedidos/${pedidoId}`);
  return r;
}

/** Desactiva el link: el que ya se mandó deja de funcionar al instante. */
export async function revocarEnlacePedido(pedidoId: string): Promise<Resultado> {
  const r = await conPermiso(async (tx, s) => {
    const res = await tx.pedidoEnlace.updateMany({
      where: { pedidoId, tenantId: s.tenantId, revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
    if (res.count === 0) return { error: "No hay un link activo." };
    await audit(tx, { tenantId: s.tenantId, userId: s.userId, accion: "UPDATE", entidad: "PedidoEnlace", entidadId: pedidoId, detalle: { accion: "revocar" } });
    return {};
  });
  revalidatePath(`/laboratorio/pedidos/${pedidoId}`);
  return r;
}

/** Manda el link al mail del laboratorio (solo si lo tiene cargado). */
export async function enviarEnlacePorMail(pedidoId: string): Promise<Resultado> {
  const session = await requireSession();
  return conPermiso(async (tx) => {
    const pedido = await tx.pedidoLaboratorio.findUnique({
      where: { id: pedidoId },
      select: { trabajo: true, numero: true, laboratorio: { select: { nombre: true, email: true } } },
    });
    if (!pedido) return { error: "No encontré el pedido." };
    if (!pedido.laboratorio.email) return { error: "Este laboratorio no tiene un email cargado." };
    const e = await tx.pedidoEnlace.findFirst({ where: { pedidoId }, orderBy: { creadoEn: "desc" } });
    if (!e || estadoDeEnlace(e) !== "vigente") return { error: "El link no está vigente. Renovalo primero." };
    await sendEnlaceLaboratorioEmail({
      to: pedido.laboratorio.email,
      laboratorio: pedido.laboratorio.nombre,
      consultorio: session.tenantName,
      trabajo: pedido.trabajo,
      numero: pedido.numero,
      url: urlEnlace(e.token),
    });
    return {};
  });
}
