-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "numeroAutorizacionOS" TEXT;

-- CreateTable
CREATE TABLE "ObraSocial" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ObraSocial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Afiliacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "obraSocialId" TEXT NOT NULL,
    "numeroAfiliado" TEXT NOT NULL,
    "plan" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Afiliacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ObraSocial_tenantId_idx" ON "ObraSocial"("tenantId");

-- CreateIndex
CREATE INDEX "Afiliacion_tenantId_pacienteId_idx" ON "Afiliacion"("tenantId", "pacienteId");

-- AddForeignKey
ALTER TABLE "ObraSocial" ADD CONSTRAINT "ObraSocial_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Afiliacion" ADD CONSTRAINT "Afiliacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Afiliacion" ADD CONSTRAINT "Afiliacion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Afiliacion" ADD CONSTRAINT "Afiliacion_obraSocialId_fkey" FOREIGN KEY ("obraSocialId") REFERENCES "ObraSocial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: mismo patron que el resto de las tablas tenant-scoped.
ALTER TABLE "ObraSocial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ObraSocial" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ObraSocial"
  USING ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Afiliacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Afiliacion" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Afiliacion"
  USING ("tenantId" = current_setting('app.tenant_id', true));
