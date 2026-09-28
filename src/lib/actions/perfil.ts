"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  passwordActual: z.string().min(1, "Ingresá tu contraseña actual"),
  passwordNueva: z.string().min(8, "La contraseña nueva tiene que tener al menos 8 caracteres"),
});

export interface CambiarPasswordState {
  ok?: boolean;
  error?: string;
}

export async function cambiarMiPassword(formData: FormData): Promise<CambiarPasswordState> {
  const session = await requireSession();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // User es global (sin RLS) — se busca directo, no hace falta withTenantContext.
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const valido = await bcrypt.compare(parsed.data.passwordActual, user.passwordHash);
  if (!valido) {
    return { error: "La contraseña actual no es correcta." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.passwordNueva, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { ok: true };
}
