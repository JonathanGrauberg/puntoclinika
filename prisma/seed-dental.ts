import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { cargarDemoDental, borrarDemo } from "../src/lib/demo-dental";
import { VERTICALES, DIAS_PRUEBA_GRATIS } from "../src/lib/verticales";

// Crea (o recrea) un "Consultorio demo" dental listo para mostrar:
// usuario odonto@demo.clinika, con pacientes y turnos de ejemplo.
// Se puede correr las veces que haga falta: borra y vuelve a cargar el ejemplo.
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL } },
});

const EMAIL = "odonto@demo.clinika";
const PASSWORD = "Demo2026!";

async function main() {
  const vertical = VERTICALES.ODONTOLOGIA;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: EMAIL },
      update: {},
      create: { email: EMAIL, nombre: "Ana Demo", passwordHash, emailVerificadoEn: new Date() },
    });

    let tenant = await tx.tenant.findUnique({ where: { slug: "consultorio-demo" } });
    if (!tenant) {
      tenant = await tx.tenant.create({
        data: {
          slug: "consultorio-demo",
          nombre: "Consultorio demo",
          tipo: "ODONTOLOGIA",
          trialHasta: new Date(Date.now() + DIAS_PRUEBA_GRATIS * 86_400_000),
        },
      });
    }
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;

    await tx.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: {},
      create: { userId: user.id, tenantId: tenant.id, rol: "ADMIN" },
    });
    await tx.tenantModule.createMany({
      data: vertical.modulos.map((modulo) => ({
        tenantId: tenant.id,
        modulo,
        habilitado: true,
        activadoEn: new Date(),
      })),
      skipDuplicates: true,
    });

    let profesional = await tx.profesional.findUnique({ where: { userId: user.id } });
    if (!profesional) {
      profesional = await tx.profesional.create({
        data: { tenantId: tenant.id, userId: user.id, nombre: "Ana", apellido: "Demo", especialidad: "Odontología general" },
      });
    }

    if ((await tx.practica.count({ where: { tenantId: tenant.id } })) === 0) {
      await tx.practica.createMany({
        data: vertical.practicasIniciales.map((p) => ({
          tenantId: tenant.id,
          nombre: p.nombre,
          duracionMin: p.duracionMin,
          precioParticular: 0,
        })),
      });
    }

    await borrarDemo(tx, tenant.id);
    const practicas = await tx.practica.findMany({ where: { tenantId: tenant.id }, select: { id: true, nombre: true, duracionMin: true } });
    const r = await cargarDemoDental(tx, { tenantId: tenant.id, profesionalId: profesional.id, practicas });
    console.log(`Consultorio demo listo: ${r.pacientes} pacientes y ${r.turnos} turnos de ejemplo.`);
  }, { timeout: 60_000, maxWait: 20_000 });

  console.log(`Ingresá con ${EMAIL} / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
