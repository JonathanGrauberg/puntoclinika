-- CreateTable
CREATE TABLE "PacientePortal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PacientePortal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PacientePortal_pacienteId_key" ON "PacientePortal"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "PacientePortal_username_key" ON "PacientePortal"("username");

-- AddForeignKey
ALTER TABLE "PacientePortal" ADD CONSTRAINT "PacientePortal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacientePortal" ADD CONSTRAINT "PacientePortal_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A propósito SIN RLS acá (ver comentario en schema.prisma): esta tabla no
-- tiene datos clínicos, solo credenciales de login del portal. El login
-- necesita poder buscar por username sin tener todavía un tenant activo
-- seteado -- mismo motivo por el que User tampoco tiene policy.
