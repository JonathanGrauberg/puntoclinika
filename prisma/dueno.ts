/**
 * Marca (o desmarca) a un usuario como dueño de la plataforma: es quien puede entrar al panel /dueno.
 * No hay forma de hacerlo desde la app a propósito: solo con acceso a la base, desde acá.
 *
 *   npm run dueno -- tu@email.com           da el permiso
 *   npm run dueno -- tu@email.com --quitar  lo retira
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2];
  const quitar = process.argv.includes("--quitar");
  if (!email || email.startsWith("--")) {
    console.error("Falta el email. Uso: npm run dueno -- tu@email.com [--quitar]");
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL });
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    console.error(`No hay ningún usuario con el email ${email}.`);
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { esDueno: !quitar } });
  console.log(quitar ? `${user.email} ya no es dueño.` : `${user.email} ahora es dueño. Entrá a /dueno.`);
  await prisma.$disconnect();
}

main();
