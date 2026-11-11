"use server";

import type { EstadoPedidoLab } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withTenantContext, type TenantClient } from "@/lib/tenant-context";
import { audit, auditView } from "@/lib/audit";
import { estadoDeEnlace } from "@/lib/pedido-enlace";
import {
  EXTENSIONES_ARCHIVO_PEDIDO,
  MAX_BYTES_ARCHIVO_PEDIDO,
  extensionDe,
} from "@/lib/pedidos-lab";
import {
  borrarObjeto,
  crearUrlDescargaEstudio,
  crearUrlSubidaPedido,
  prefijoArchivosPedido,
  tamanoDeObjeto,
} from "@/lib/storage";

/**
 * Todo lo que puede hacer el laboratorio desde el link mágico. No hay sesión:
 * el token resuelve el consultorio y el pedido (tabla puente sin RLS) y recién
 * ahí se entra con contexto de ese consultorio. Un token da acceso a UN pedido.
 */

const LINK_INVALIDO = "Este link no es válido, venció o fue desactivado. Pedile al consultorio uno nuevo.";
/** Estados que el laboratorio puede marcar. "Entregado" lo confirma el consultorio. */
const ESTADOS_DEL_LAB: EstadoPedidoLab[] = ["RECIBIDO", "EN_PROCESO", "EN_PRUEBA", "TERMINADO"];
const MAX_ARCHIVOS_DEL_LAB = 40;
const MAX_MENSAJES_DEL_LAB = 200;

type Acceso = { tenantId: string; pedidoId: string; enlaceId: string };

async function resolver(token: string): Promise<Acceso | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const e = await prisma.pedidoEnlace.findUnique({ where: { token } });
  if (!e || estadoDeEnlace(e) !== "vigente") return null;
  return { tenantId: e.tenantId, pedidoId: e.pedidoId, enlaceId: e.id };
}

function limpiarNombre(nombre: string, porDefecto: string) {
  return nombre.trim().slice(0, 60) || porDefecto;
}

type Resultado = { error?: string };

export interface PedidoPublico {
  consultorio: string;
  numero: number;
  trabajo: string;
  piezas: number[];
  color: string | null;
  notas: string | null;
  fechaEntrega: Date | null;
  estado: EstadoPedidoLab;
  creadoEn: Date;
  venceEn: Date;
  paciente: { nombre: string; apellido: string };
  laboratorio: { nombre: string; numeroCliente: string | null };
  /** Falso cuando ya está entregado: se puede mirar y bajar archivos, pero no cambiar nada. */
  puedeActuar: boolean;
  estados: { id: string; estado: EstadoPedidoLab; nota: string | null; autor: string; autorTipo: string; creadoEn: Date }[];
  mensajes: { id: string; autorTipo: string; autorNombre: string; texto: string; creadoEn: Date }[];
  archivos: { id: string; nombre: string; tamano: number; subidoPor: string; autorTipo: string }[];
}

export async function obtenerPedidoPublico(token: string): Promise<PedidoPublico | { error: string }> {
  const acc = await resolver(token);
  if (!acc) return { error: LINK_INVALIDO };

  const datos = await withTenantContext(acc.tenantId, async (tx) => {
    const p = await tx.pedidoLaboratorio.findUnique({
      where: { id: acc.pedidoId },
      select: {
        numero: true,
        trabajo: true,
        piezas: true,
        color: true,
        notas: true,
        fechaEntrega: true,
        estado: true,
        creadoEn: true,
        // Solo lo que el laboratorio necesita: nada de DNI, teléfono ni historia clínica.
        paciente: { select: { nombre: true, apellido: true } },
        laboratorio: { select: { nombre: true, numeroCliente: true } },
        estados: { orderBy: { creadoEn: "asc" } },
        mensajes: { orderBy: { creadoEn: "asc" } },
        archivos: {
          orderBy: { creadoEn: "asc" },
          select: { id: true, nombre: true, tamano: true, subidoPor: true, autorTipo: true },
        },
      },
    });
    if (!p) return null;
    await auditView(tx, {
      tenantId: acc.tenantId,
      entidad: "PedidoLaboratorio",
      entidadId: acc.pedidoId,
      detalle: { via: "enlace" },
    });
    return p;
  });
  if (!datos) return { error: LINK_INVALIDO };

  const [tenant, enlace] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: acc.tenantId }, select: { nombre: true } }),
    prisma.pedidoEnlace.update({
      where: { id: acc.enlaceId },
      data: { usos: { increment: 1 }, ultimoUsoEn: new Date() },
      select: { venceEn: true },
    }),
  ]);

  return {
    ...datos,
    consultorio: tenant?.nombre ?? "Consultorio",
    venceEn: enlace.venceEn,
    puedeActuar: datos.estado !== "ENTREGADO",
  };
}

/** Corre una acción de escritura sobre el pedido: valida el link y que el pedido siga abierto. */
async function escribir(
  token: string,
  fn: (tx: TenantClient, acc: Acceso, pedido: { estado: EstadoPedidoLab; laboratorioNombre: string }) => Promise<Resultado>
): Promise<Resultado> {
  const acc = await resolver(token);
  if (!acc) return { error: LINK_INVALIDO };
  return withTenantContext(acc.tenantId, async (tx) => {
    const p = await tx.pedidoLaboratorio.findUnique({
      where: { id: acc.pedidoId },
      select: { estado: true, laboratorio: { select: { nombre: true } } },
    });
    if (!p) return { error: LINK_INVALIDO };
    if (p.estado === "ENTREGADO") return { error: "El trabajo ya está entregado, no se puede modificar." };
    return fn(tx, acc, { estado: p.estado, laboratorioNombre: p.laboratorio.nombre });
  });
}

export async function cambiarEstadoPublico(
  token: string,
  estado: EstadoPedidoLab,
  nota: string,
  nombre: string
): Promise<Resultado> {
  if (!ESTADOS_DEL_LAB.includes(estado)) return { error: "Ese estado no lo puede marcar el laboratorio." };
  return escribir(token, async (tx, acc, p) => {
    if (p.estado === estado) return { error: "El pedido ya está en ese estado." };
    const autor = limpiarNombre(nombre, p.laboratorioNombre);
    await tx.pedidoLaboratorio.update({
      where: { id: acc.pedidoId },
      data: {
        estado,
        estados: {
          create: {
            tenantId: acc.tenantId,
            estado,
            nota: nota.trim().slice(0, 500) || null,
            autor,
            autorTipo: "LABORATORIO",
          },
        },
      },
    });
    await audit(tx, {
      tenantId: acc.tenantId,
      accion: "UPDATE",
      entidad: "PedidoLaboratorio",
      entidadId: acc.pedidoId,
      detalle: { estado, via: "enlace" },
    });
    return {};
  });
}

export async function enviarMensajePublico(token: string, texto: string, nombre: string): Promise<Resultado> {
  const limpio = texto.trim();
  if (!limpio) return { error: "Escribí el mensaje." };
  if (limpio.length > 2000) return { error: "El mensaje es demasiado largo." };
  return escribir(token, async (tx, acc, p) => {
    const hechos = await tx.pedidoMensaje.count({ where: { pedidoId: acc.pedidoId, autorTipo: "LABORATORIO" } });
    if (hechos >= MAX_MENSAJES_DEL_LAB) return { error: "Se llegó al máximo de mensajes de este pedido." };
    await tx.pedidoMensaje.create({
      data: {
        tenantId: acc.tenantId,
        pedidoId: acc.pedidoId,
        autorTipo: "LABORATORIO",
        autorNombre: limpiarNombre(nombre, p.laboratorioNombre),
        texto: limpio,
      },
    });
    return {};
  });
}

export async function prepararSubidaPublica(
  token: string,
  nombre: string,
  contentType: string,
  tamano: number
): Promise<{ error: string } | { key: string; url: string }> {
  const ext = extensionDe(nombre);
  if (!EXTENSIONES_ARCHIVO_PEDIDO.includes(ext)) {
    return { error: `Ese tipo de archivo no se puede subir (.${ext || "?"}). Probá con foto, PDF, STL, PLY, OBJ o ZIP.` };
  }
  if (tamano > MAX_BYTES_ARCHIVO_PEDIDO) return { error: "El archivo pesa más de 50 MB." };

  let acceso: Acceso | null = null;
  const r = await escribir(token, async (tx, acc) => {
    const n = await tx.pedidoArchivo.count({ where: { pedidoId: acc.pedidoId, autorTipo: "LABORATORIO" } });
    if (n >= MAX_ARCHIVOS_DEL_LAB) return { error: "Se llegó al máximo de archivos de este pedido." };
    acceso = acc;
    return {};
  });
  if (r.error || !acceso) return { error: r.error ?? LINK_INVALIDO };

  const a: Acceso = acceso;
  return crearUrlSubidaPedido({
    tenantId: a.tenantId,
    pedidoId: a.pedidoId,
    nombreArchivo: nombre,
    contentType: contentType || "application/octet-stream",
  });
}

export async function registrarArchivoPublico(
  token: string,
  key: string,
  nombre: string,
  contentType: string,
  quien: string
): Promise<Resultado> {
  return escribir(token, async (tx, acc, p) => {
    if (!key.startsWith(prefijoArchivosPedido(acc.tenantId, acc.pedidoId))) return { error: "Archivo inválido." };
    if (!EXTENSIONES_ARCHIVO_PEDIDO.includes(extensionDe(nombre))) return { error: "Tipo de archivo no permitido." };

    const tamano = await tamanoDeObjeto(key);
    if (tamano === null) return { error: "No se terminó de subir el archivo. Probá de nuevo." };
    if (tamano > MAX_BYTES_ARCHIVO_PEDIDO) {
      await borrarObjeto(key);
      return { error: "El archivo pesa más de 50 MB." };
    }
    const a = await tx.pedidoArchivo.create({
      data: {
        tenantId: acc.tenantId,
        pedidoId: acc.pedidoId,
        key,
        nombre: nombre.slice(-120),
        contentType: contentType || "application/octet-stream",
        tamano,
        subidoPor: limpiarNombre(quien, p.laboratorioNombre),
        autorTipo: "LABORATORIO",
      },
    });
    await audit(tx, {
      tenantId: acc.tenantId,
      accion: "CREATE",
      entidad: "PedidoArchivo",
      entidadId: a.id,
      detalle: { pedidoId: acc.pedidoId, via: "enlace" },
    });
    return {};
  });
}

/** Descargar sigue permitido aunque el pedido ya esté entregado. */
export async function urlDescargaPublica(token: string, archivoId: string): Promise<{ error: string } | { url: string }> {
  const acc = await resolver(token);
  if (!acc) return { error: LINK_INVALIDO };
  const archivo = await withTenantContext(acc.tenantId, async (tx) => {
    const a = await tx.pedidoArchivo.findFirst({ where: { id: archivoId, pedidoId: acc.pedidoId } });
    if (a) {
      await auditView(tx, {
        tenantId: acc.tenantId,
        entidad: "PedidoArchivo",
        entidadId: a.id,
        detalle: { pedidoId: acc.pedidoId, via: "enlace" },
      });
    }
    return a;
  });
  if (!archivo) return { error: "No encontré el archivo." };
  return { url: await crearUrlDescargaEstudio(archivo.key) };
}
