-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "consultorioId" TEXT;

-- CreateTable
CREATE TABLE "Consultorio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "piso" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Consultorio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consultorio_tenantId_idx" ON "Consultorio"("tenantId");

-- AddForeignKey
ALTER TABLE "Consultorio" ADD CONSTRAINT "Consultorio_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "Consultorio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: mismo patron que el resto de las tablas tenant-scoped.
ALTER TABLE "Consultorio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consultorio" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Consultorio"
  USING ("tenantId" = current_setting('app.tenant_id', true));
