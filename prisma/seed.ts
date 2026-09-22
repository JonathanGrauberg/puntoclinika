import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Seed corre explícitamente contra DIRECT_DATABASE_URL (rol owner, que
// Postgres exceptúa de RLS) porque necesita crear filas en tablas con
// policy antes de que exista contexto de tenant seteado. Solo para
// bootstrap local — nunca se corre así contra producción con datos reales.
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL } },
});

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: { slug: "demo", nombre: "Centro Demo" },
  });

  await prisma.tenantModule.createMany({
    data: [
      { tenantId: tenant.id, modulo: "PACIENTES", habilitado: true, activadoEn: new Date() },
      { tenantId: tenant.id, modulo: "TURNOS", habilitado: true, activadoEn: new Date() },
      { tenantId: tenant.id, modulo: "ESTUDIOS", habilitado: true, activadoEn: new Date() },
      { tenantId: tenant.id, modulo: "FACTURACION", habilitado: true, activadoEn: new Date() },
    ],
    skipDuplicates: true,
  });

  const passwordHash = await bcrypt.hash("changeme123", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@demo.clinika" },
    update: {},
    create: { email: "admin@demo.clinika", nombre: "Admin Demo", passwordHash },
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: {},
    create: { userId: user.id, tenantId: tenant.id, rol: "ADMIN" },
  });

  console.log("Seed listo: admin@demo.clinika / changeme123 (tenant: demo)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
