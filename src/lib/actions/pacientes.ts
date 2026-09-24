"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { audit, auditView } from "@/lib/audit";
import { permisosDe } from "@/lib/permissions";

const pacienteSchema = z.object({
  dni: z
    .string()
    .trim()
    .min(6, "El DNI tiene que tener al menos 6 dígitos")
    .max(15, "DNI demasiado largo")
    .regex(/^[0-9.]+$/, "El DNI solo puede tener números"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  apellido: z.string().trim().min(1, "El apellido es obligatorio").max(100),
  fechaNacimiento: z.string().optional(),
  telefono: z.string().trim().max(30).optional(),
  email: z.union([z.string().trim().email("Email inválido"), z.literal("")]).optional(),
  alergias: z.string().trim().max(500).optional(),
  obraSocialTexto: z.string().trim().max(150).optional(),
});

export interface PacienteFormState {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof pacienteSchema>, string>>;
}

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return pacienteSchema.safeParse(raw);
}

function toFieldErrors(error: z.ZodError<z.infer<typeof pacienteSchema>>) {
  const fieldErrors: PacienteFormState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof z.infer<typeof pacienteSchema>;
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** Dedupe: se llama al perder foco del campo DNI, antes de enviar el form. */
export async function checkDniDuplicado(dni: string) {
  const session = await requireSession();
  const clean = dni.trim();
  if (clean.length < 6) return null;

  return withTenantContext(session.tenantId, (tx) =>
    tx.paciente.findUnique({
      where: { tenantId_dni: { tenantId: session.tenantId, dni: clean } },
      select: { id: true, nombre: true, apellido: true },
    })
  );
}

export async function crearPaciente(formData: FormData): Promise<PacienteFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarPacientes) {
    return { error: "No tenés permiso para hacer esto." };
  }
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  let pacienteId: string;
  try {
    pacienteId = await withTenantContext(session.tenantId, async (tx) => {
      const created = await tx.paciente.create({
        data: {
          tenantId: session.tenantId,
          dni: data.dni,
          nombre: data.nombre,
          apellido: data.apellido,
          fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
          telefono: data.telefono || null,
          email: data.email || null,
          alergias: data.alergias || null,
          obraSocialTexto: data.obraSocialTexto || null,
        },
      });
      await audit(tx, {
        tenantId: session.tenantId,
        userId: session.userId,
        accion: "CREATE",
        entidad: "Paciente",
        entidadId: created.id,
      });
      return created.id;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ya existe un paciente con ese DNI en este centro." };
    }
    throw error;
  }

  revalidatePath("/pacientes");
  redirect(`/pacientes/${pacienteId}`);
}

export async function actualizarPaciente(id: string, formData: FormData): Promise<PacienteFormState | void> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarPacientes) {
    return { error: "No tenés permiso para hacer esto." };
  }
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  try {
    await withTenantContext(session.tenantId, async (tx) => {
      await tx.paciente.update({
        where: { id },
        data: {
          dni: data.dni,
          nombre: data.nombre,
          apellido: data.apellido,
          fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
          telefono: data.telefono || null,
          email: data.email || null,
          alergias: data.alergias || null,
          obraSocialTexto: data.obraSocialTexto || null,
        },
      });
      await audit(tx, {
        tenantId: session.tenantId,
        userId: session.userId,
        accion: "UPDATE",
        entidad: "Paciente",
        entidadId: id,
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ya existe un paciente con ese DNI en este centro." };
    }
    throw error;
  }

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
  redirect(`/pacientes/${id}`);
}

export async function listarPacientes(query?: string) {
  const session = await requireSession();
  const q = query?.trim();

  return withTenantContext(session.tenantId, (tx) =>
    tx.paciente.findMany({
      where: q
        ? {
            OR: [
              { dni: { contains: q } },
              { nombre: { contains: q, mode: "insensitive" } },
              { apellido: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { apellido: "asc" },
      take: 100,
    })
  );
}

// Sin 0/O/1/l/I — caracteres que se confunden fácil al copiar a mano.
const ALFABETO_PASSWORD = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generarPassword(longitud = 10) {
  const bytes = randomBytes(longitud);
  return Array.from(bytes, (b) => ALFABETO_PASSWORD[b % ALFABETO_PASSWORD.length]).join("");
}

export interface AccesoPortalResult {
  error?: string;
  username?: string;
  password?: string;
}

/**
 * Genera (o regenera) el acceso al Portal del Paciente: usuario memorable
 * (inicial + DNI, para que no se lo olviden) + contraseña aleatoria segura
 * (no se puede volver a ver después de este llamado — solo queda el hash).
 */
export async function generarAccesoPortal(pacienteId: string): Promise<AccesoPortalResult> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarPacientes) {
    return { error: "No tenés permiso para hacer esto." };
  }

  return withTenantContext(session.tenantId, async (tx) => {
    const paciente = await tx.paciente.findUniqueOrThrow({ where: { id: pacienteId } });

    const inicial = paciente.nombre.trim().charAt(0).toLowerCase() || "p";
    let username = `${inicial}${paciente.dni}`;
    let intento = 0;
    while (await tx.pacientePortal.findUnique({ where: { username } })) {
      intento++;
      if (intento === 1) {
        const inicialApellido = paciente.apellido.trim().charAt(0).toLowerCase();
        username = `${inicial}${inicialApellido}${paciente.dni}`;
      } else {
        username = `${inicial}${paciente.dni}${intento}`;
      }
      if (intento > 5) break;
    }

    const password = generarPassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await tx.pacientePortal.upsert({
      where: { pacienteId },
      update: { username, passwordHash, activo: true },
      create: { tenantId: session.tenantId, pacienteId, username, passwordHash },
    });

    await audit(tx, {
      tenantId: session.tenantId,
      userId: session.userId,
      accion: "CREATE",
      entidad: "PacientePortal",
      entidadId: pacienteId,
    });

    return { username, password };
  });
}

export async function obtenerAccesoPortal(pacienteId: string) {
  const session = await requireSession();
  return withTenantContext(session.tenantId, (tx) =>
    tx.pacientePortal.findUnique({ where: { pacienteId }, select: { username: true, activo: true } })
  );
}

export async function obtenerPaciente(id: string) {
  const session = await requireSession();

  return withTenantContext(session.tenantId, async (tx) => {
    const paciente = await tx.paciente.findUnique({ where: { id } });
    if (paciente) {
      await auditView(tx, {
        tenantId: session.tenantId,
        userId: session.userId,
        entidad: "Paciente",
        entidadId: id,
      });
    }
    return paciente;
  });
}
