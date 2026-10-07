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
  // Solo cuando profesionalId === "__nuevo__": datos para crear el profesional
  // en el mismo paso (en vez de cargarlo antes en Profesionales).
  apellidoProfesional: z.string().trim().max(100).optional(),
  matricula: z.string().trim().max(50).optional(),
  especialidad: z.string().trim().max(100).optional(),
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
  const creaProfesional = data.rol === "MEDICO" && data.profesionalId === "__nuevo__";
  if (creaProfesional && !data.apellidoProfesional) {
    return { error: "Falta el apellido del profesional." };
  }

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

      if (creaProfesional) {
        await tx.profesional.create({
          data: {
            tenantId: session.tenantId,
            userId: user.id,
            nombre: data.nombre,
            apellido: data.apellidoProfesional!,
            matricula: data.matricula || null,
            especialidad: data.especialidad || null,
          },
        });
      } else if (data.profesionalId) {
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
      userId: m.userId,
      rol: m.rol,
      activo: m.activo,
      email: userById.get(m.userId)?.email ?? "—",
      nombre: userById.get(m.userId)?.nombre ?? "—",
    }));
  });
}

export interface ToggleUsuarioState {
  error?: string;
}

/**
 * Desactiva/reactiva el acceso de un usuario a ESTE centro (no su cuenta
 * global — puede seguir teniendo membership activa en otro tenant). Al no
 * poder reconstruir el token en cada request (sesión JWT, sin DB hit por
 * request — ver session.ts), esto recién surte efecto en el próximo login
 * del usuario afectado, no corta una sesión ya abierta al instante.
 */
export async function toggleMembershipActivo(
  membershipId: string,
  activo: boolean
): Promise<ToggleUsuarioState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    return { error: "No tenés permiso para hacer esto." };
  }

  try {
    await withTenantContext(session.tenantId, async (tx) => {
      const membership = await tx.membership.findUniqueOrThrow({ where: { id: membershipId } });
      if (membership.userId === session.userId && !activo) {
        throw new Error("NO_AUTODESACTIVAR");
      }

      await tx.membership.update({ where: { id: membershipId }, data: { activo } });
      await audit(tx, {
        tenantId: session.tenantId,
        userId: session.userId,
        accion: "UPDATE",
        entidad: "Membership",
        entidadId: membershipId,
        detalle: { activo },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_AUTODESACTIVAR") {
      return { error: "No te podés desactivar a vos mismo." };
    }
    throw error;
  }

  revalidatePath("/configuracion/usuarios");
}
