"use server";

import crypto from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const MAX_REQUESTS_PER_HOUR = 3; // límite anti-spam por usuario
const MIN_RESPONSE_MS = 400;

const GENERIC_MESSAGE = "Si existe una cuenta con ese email, te enviamos un link para restablecer la contraseña.";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface PedirResetState {
  ok?: boolean;
  message?: string;
}

/**
 * Siempre responde EXACTAMENTE lo mismo, exista o no una cuenta con ese
 * email (y con un tiempo de respuesta parejo) — así nadie puede usar esto
 * para averiguar qué emails están registrados en el sistema.
 */
export async function pedirResetPassword(formData: FormData): Promise<PedirResetState> {
  const startedAt = Date.now();
  const respond = async () => {
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_RESPONSE_MS) await sleep(MIN_RESPONSE_MS - elapsed);
    return { ok: true, message: GENERIC_MESSAGE };
  };

  const rawEmail = formData.get("email");
  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return respond();
  }
  const email = rawEmail.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.activo) {
    return respond();
  }

  const recentCount = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - TOKEN_TTL_MS) } },
  });
  if (recentCount >= MAX_REQUESTS_PER_HOUR) {
    return respond();
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3100";
  const resetUrl = `${baseUrl}/login/restablecer?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return respond();
}

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export interface ResetPasswordState {
  ok?: boolean;
  error?: string;
}

export async function restablecerPassword(formData: FormData): Promise<ResetPasswordState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  const isExpiredOrUsed =
    !resetToken || !!resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now();
  if (isExpiredOrUsed) {
    return { error: "Este link venció o ya fue usado. Pedí uno nuevo." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const usedAt = new Date();

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt } }),
    prisma.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, usedAt: null, id: { not: resetToken.id } },
      data: { usedAt },
    }),
  ]);

  return { ok: true };
}
