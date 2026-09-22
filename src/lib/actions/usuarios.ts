"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { permisosDe } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import type { RolTenant } from "@prisma/client";

const usuarioSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  password: z.string().min(8, "Mínimo 8 caracteres").optional().or(z.literal("")),
  rol: z.enum(["ADMIN", "SECRETARIA", "MEDICO", "AUDITOR"]),
  profesionalId: z.string().optional(),
});

export interface UsuarioFormState {
  error?: string;
}

export async function crearUsuario(formData: FormData): Promise<UsuarioFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    return { error: "No tenés permiso para hacer esto." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = usuarioSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  try {
    await withTenantContext(session.tenantId, async (tx) => {
      let user = await tx.user.findUnique({ where: { email: data.email } });

      if (user) {
        // Ya existe (puede trabajar en otro centro) — solo se le agrega
        // membresía acá, no se toca su password ni nombre.
        const yaEsMiembro = await tx.membership.findUnique({
          where: { userId_tenantId: { userId: user.id, tenantId: session.tenantId } },
        });
        if (yaEsMiembro) {
          throw new Error("YA_ES_MIEMBRO");
        }
      } else {
        if (!data.password || data.password.length < 8) {
          throw new Error("PASSWORD_REQUERIDO");
        }
        const passwordHash = await bcrypt.hash(data.password, 10);
        user = await tx.user.create({
          data: { email: data.email, nombre: data.nombre, passwordHash },
        });
      }

      await tx.membership.create({
        data: { userId: user.id, tenantId: session.tenantId, rol: data.rol as RolTenant },
      });

      if (data.profesionalId) {
        await tx.profesional.update({
          where: { id: data.profesionalId },
          data: { userId: user.id },
        });
      }

      await audit(tx, {
        tenantId: session.tenantId,
        userId: session.userId,
        accion: "CREATE",
        entidad: "Membership",
        entidadId: user.id,
        detalle: { rol: data.rol, email: data.email },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "YA_ES_MIEMBRO") {
      return { error: "Ese usuario ya pertenece a este centro." };
    }
    if (error instanceof Error && error.message === "PASSWORD_REQUERIDO") {
      return { error: "Falta la contraseña para crear el usuario nuevo." };
    }
    throw error;
  }

  revalidatePath("/configuracion/usuarios");
}

export async function listarUsuarios() {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarConfiguracion) return [];

  return withTenantContext(session.tenantId, async (tx) => {
    const memberships = await tx.membership.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "asc" },
    });
    const users = await tx.user.findMany({
      where: { id: { in: memberships.map((m) => m.userId) } },
    });
    const userById = new Map(users.map((u) => [u.id, u]));
    return memberships.map((m) => ({
      membershipId: m.id,
      rol: m.rol,
      activo: m.activo,
      email: userById.get(m.userId)?.email ?? "—",
      nombre: userById.get(m.userId)?.nombre ?? "—",
    }));
  });
}
