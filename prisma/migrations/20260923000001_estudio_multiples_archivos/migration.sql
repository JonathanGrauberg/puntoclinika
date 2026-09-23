-- AlterTable
ALTER TABLE "Estudio" DROP COLUMN "archivoUrl";

-- CreateTable
CREATE TABLE "EstudioArchivo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "estudioId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstudioArchivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstudioArchivo_tenantId_estudioId_idx" ON "EstudioArchivo"("tenantId", "estudioId");

-- AddForeignKey
ALTER TABLE "EstudioArchivo" ADD CONSTRAINT "EstudioArchivo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstudioArchivo" ADD CONSTRAINT "EstudioArchivo_estudioId_fkey" FOREIGN KEY ("estudioId") REFERENCES "Estudio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: mismo patron que el resto de las tablas tenant-scoped.
ALTER TABLE "EstudioArchivo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EstudioArchivo" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "EstudioArchivo"
  USING ("tenantId" = current_setting('app.tenant_id', true));
