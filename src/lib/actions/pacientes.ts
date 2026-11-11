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
import { inicioDiaArgentina } from "@/lib/date-utils";
import { VERTICALES } from "@/lib/verticales";

const pacienteSchema = z
  .object({
    tipoDocumento: z.enum(["DNI", "PASAPORTE", "OTRO"]).default("DNI"),
    // La obligatoriedad depende del tipo de centro y se controla en la acción.
    dni: z.string().trim().max(15, "Demasiado largo").optional(),
    nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
    apellido: z.string().trim().min(1, "El apellido es obligatorio").max(100),
    fechaNacimiento: z.string().optional(),
    sexo: z.enum(["MASCULINO", "FEMENINO", "OTRO"]).optional().or(z.literal("")),
    domicilio: z.string().trim().max(200).optional(),
    telefono: z.string().trim().max(30).optional(),
    email: z.union([z.string().trim().email("Email inválido"), z.literal("")]).optional(),
    contactoEmergenciaNombre: z.string().trim().max(100).optional(),
    contactoEmergenciaTelefono: z.string().trim().max(30).optional(),
    alergias: z.string().trim().max(500).optional(),
    obraSocialTexto: z.string().trim().max(150).optional(),
  })
  .refine((data) => !data.dni || data.tipoDocumento !== "DNI" || /^[0-9.]+$/.test(data.dni), {
    message: "El DNI solo puede tener números",
    path: ["dni"],
  });

export interface PacienteFormState {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof pacienteSchema>, string>>;
}

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return pacienteSchema.safeParse(raw);
}

/** Valida el documento según el tipo de centro (obligatorio en medicina, opcional en odontología). */
function errorDocumento(dni: string | undefined, obligatorio: boolean): PacienteFormState | null {
  if (!dni) {
    return obligatorio ? { fieldErrors: { dni: "El documento es obligatorio" } } : null;
  }
  if (dni.length < 6) return { fieldErrors: { dni: "Tiene que tener al menos 6 caracteres" } };
  return null;
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
  const errDoc = errorDocumento(data.dni, VERTICALES[session.tenantTipo].dniObligatorio);
  if (errDoc) return errDoc;

  let pacienteId: string;
  try {
    pacienteId = await withTenantContext(session.tenantId, async (tx) => {
      const created = await tx.paciente.create({
        data: {
          tenantId: session.tenantId,
          tipoDocumento: data.tipoDocumento,
          dni: data.dni || null,
          nombre: data.nombre,
          apellido: data.apellido,
          fechaNacimiento: data.fechaNacimiento ? inicioDiaArgentina(data.fechaNacimiento) : null,
          sexo: data.sexo || null,
          domicilio: data.domicilio || null,
          telefono: data.telefono || null,
          email: data.email || null,
          contactoEmergenciaNombre: data.contactoEmergenciaNombre || null,
          contactoEmergenciaTelefono: data.contactoEmergenciaTelefono || null,
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
  const errDoc = errorDocumento(data.dni, VERTICALES[session.tenantTipo].dniObligatorio);
  if (errDoc) return errDoc;

  try {
    await withTenantContext(session.tenantId, async (tx) => {
      await tx.paciente.update({
        where: { id },
        data: {
          tipoDocumento: data.tipoDocumento,
          dni: data.dni || null,
          nombre: data.nombre,
          apellido: data.apellido,
          fechaNacimiento: data.fechaNacimiento ? inicioDiaArgentina(data.fechaNacimiento) : null,
          sexo: data.sexo || null,
          domicilio: data.domicilio || null,
          telefono: data.telefono || null,
          email: data.email || null,
          contactoEmergenciaNombre: data.contactoEmergenciaNombre || null,
          contactoEmergenciaTelefono: data.contactoEmergenciaTelefono || null,
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
              { telefono: { contains: q } },
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

export interface PacienteRapido {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  dni: string | null;
}

/** Búsqueda en vivo del inicio: nombre, apellido, teléfono o documento. Máximo 6 resultados. */
export async function buscarPacientesRapido(query: string): Promise<PacienteRapido[]> {
  const session = await requireSession();
  const q = query.trim();
  if (q.length < 2) return [];

  // "Juan Pérez": cada palabra tiene que aparecer en nombre, apellido, teléfono o documento.
  const palabras = q.split(/\s+/).filter(Boolean).slice(0, 4);
  return withTenantContext(session.tenantId, (tx) =>
    tx.paciente.findMany({
      where: {
        AND: palabras.map((p) => ({
          OR: [
            { nombre: { contains: p, mode: "insensitive" as const } },
            { apellido: { contains: p, mode: "insensitive" as const } },
            { telefono: { contains: p } },
            { dni: { contains: p } },
          ],
        })),
      },
      select: { id: true, nombre: true, apellido: true, telefono: true, dni: true },
      orderBy: { apellido: "asc" },
      take: 6,
    })
  );
}

const pacienteRapidoSchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre").max(100),
  apellido: z.string().trim().min(1, "Falta el apellido").max(100),
  telefono: z.string().trim().max(30).optional(),
});

/** Alta rápida: nombre, apellido y teléfono. El resto se completa después desde la ficha. */
export async function crearPacienteRapido(formData: FormData): Promise<{ error?: string; id?: string }> {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarPacientes) {
    return { error: "No tenés permiso para hacer esto." };
  }
  // En medicina el documento es obligatorio: ahí se usa el formulario completo.
  if (VERTICALES[session.tenantTipo].dniObligatorio) {
    return { error: "Usá el formulario completo para cargar este paciente." };
  }
  const parsed = pacienteRapidoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const data = parsed.data;

  const id = await withTenantContext(session.tenantId, async (tx) => {
    const created = await tx.paciente.create({
      data: {
        tenantId: session.tenantId,
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono || null,
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

  revalidatePath("/pacientes");
  revalidatePath("/dashboard");
  return { id };
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
    if (!paciente.dni) {
      return { error: "Cargá el documento del paciente para darle acceso al portal." };
    }

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
