"use server";

import crypto from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { sendVerificationEmail } from "@/lib/email";
import { DIAS_PRUEBA_GRATIS, TERMINOS_VERSION, TIPOS_REGISTRABLES, VERTICALES } from "@/lib/verticales";

const MAX_INTENTOS_POR_HORA = 5;
const VERIFICACION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const registroSchema = z.object({
  tipoCuenta: z.string(),
  nombre: z.string().trim().min(1, "Falta tu nombre").max(80),
  apellido: z.string().trim().min(1, "Falta tu apellido").max(80),
  email: z.string().trim().toLowerCase().email("Ese email no parece válido"),
  password: z.string().min(8, "La contraseña tiene que tener al menos 8 caracteres").max(100),
  nombreCentro: z.string().trim().min(2, "Poné el nombre de tu consultorio").max(100),
  terminos: z.literal("on", { message: "Tenés que aceptar los términos para continuar" }),
});

export interface RegistroState {
  error?: string;
}

function slugificar(texto: string) {
  const base = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return `${base || "consultorio"}-${crypto.randomBytes(2).toString("hex")}`;
}

async function ipDelPedido() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "desconocida").trim();
}

async function crearTokenVerificacion(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prisma.emailVerificacionToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + VERIFICACION_TTL_MS) },
  });
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3100";
  return `${baseUrl}/verificar-email?token=${token}`;
}

/**
 * Alta propia: crea usuario + centro + módulos + profesional + prácticas en una
 * sola transacción, y deja a la persona adentro. Sin intervención de nadie.
 */
export async function registrarCuenta(formData: FormData): Promise<RegistroState | void> {
  // Campo trampa: un humano no lo ve ni lo completa.
  if (formData.get("sitioWeb")) return { error: "No pudimos crear la cuenta. Probá de nuevo." };

  const parsed = registroSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const data = parsed.data;

  const tipo = TIPOS_REGISTRABLES.find((t) => t === data.tipoCuenta);
  if (!tipo) return { error: "Elegí cómo vas a usar .clinika." };

  const ip = await ipDelPedido();
  const intentos = await prisma.registroIntento.count({
    where: { ip, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (intentos >= MAX_INTENTOS_POR_HORA) {
    return { error: "Hiciste muchos intentos seguidos. Esperá un rato y probá de nuevo." };
  }
  await prisma.registroIntento.create({ data: { ip } });

  if (await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } })) {
    return { error: "Ya hay una cuenta con ese email. Ingresá con tu contraseña." };
  }

  const vertical = VERTICALES[tipo];
  const passwordHash = await bcrypt.hash(data.password, 10);
  const ahora = new Date();
  const trialHasta = new Date(ahora.getTime() + DIAS_PRUEBA_GRATIS * 86_400_000);

  let userId: string;
  try {
    userId = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, nombre: `${data.nombre} ${data.apellido}`, passwordHash },
      });
      const tenant = await tx.tenant.create({
        data: {
          slug: slugificar(data.nombreCentro),
          nombre: data.nombreCentro,
          tipo,
          trialHasta,
          terminosAceptadosEn: ahora,
          terminosVersion: TERMINOS_VERSION,
        },
      });

      // Desde acá todo lo que se crea es del centro nuevo (RLS).
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;

      await tx.membership.create({ data: { userId: user.id, tenantId: tenant.id, rol: "ADMIN" } });
      await tx.tenantModule.createMany({
        data: vertical.modulos.map((modulo) => ({
          tenantId: tenant.id,
          modulo,
          habilitado: true,
          activadoEn: ahora,
        })),
      });
      // Quien se registra es también quien atiende: queda como profesional para
      // poder tener turnos y fichas a su nombre desde el primer minuto.
      await tx.profesional.create({
        data: { tenantId: tenant.id, userId: user.id, nombre: data.nombre, apellido: data.apellido },
      });
      await tx.practica.createMany({
        data: vertical.practicasIniciales.map((p) => ({
          tenantId: tenant.id,
          nombre: p.nombre,
          duracionMin: p.duracionMin,
          precioParticular: 0,
        })),
      });
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          accion: "CREATE",
          entidad: "Tenant",
          entidadId: tenant.id,
          detalle: { tipo, origen: "registro" },
          ip,
        },
      });
      return user.id;
    }, { timeout: 20_000, maxWait: 10_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ya hay una cuenta con ese email. Ingresá con tu contraseña." };
    }
    throw error;
  }

  // El mail no bloquea el uso: se manda y listo.
  try {
    const url = await crearTokenVerificacion(userId);
    await sendVerificationEmail(data.email, data.nombre, url);
  } catch (error) {
    console.error("[registro] no se pudo mandar la confirmación de email", error);
  }

  try {
    await signIn("credentials", { email: data.email, password: data.password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }
}

/** Link del mail: marca el email como confirmado (un solo uso). */
export async function confirmarEmail(token: string): Promise<{ ok: boolean }> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const registro = await prisma.emailVerificacionToken.findUnique({ where: { tokenHash } });
  if (!registro || registro.usedAt || registro.expiresAt.getTime() < Date.now()) return { ok: false };

  await prisma.$transaction([
    prisma.emailVerificacionToken.update({ where: { id: registro.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: registro.userId }, data: { emailVerificadoEn: new Date() } }),
  ]);
  return { ok: true };
}

/** Botón "Reenviar" del aviso. Un envío por minuto como máximo. */
export async function reenviarVerificacion(): Promise<{ error?: string }> {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.emailVerificadoEn) return {};

  const ultimo = await prisma.emailVerificacionToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (ultimo && Date.now() - ultimo.createdAt.getTime() < 60_000) {
    return { error: "Ya te lo mandamos hace un momento. Revisá tu bandeja (y el spam)." };
  }

  const url = await crearTokenVerificacion(user.id);
  await sendVerificationEmail(user.email, user.nombre.split(" ")[0], url);
  return {};
}
