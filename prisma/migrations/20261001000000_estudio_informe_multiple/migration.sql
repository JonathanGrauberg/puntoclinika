-- CreateTable
CREATE TABLE "EstudioInforme" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "estudioId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstudioInforme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstudioInforme_tenantId_estudioId_idx" ON "EstudioInforme"("tenantId", "estudioId");

-- AddForeignKey
ALTER TABLE "EstudioInforme" ADD CONSTRAINT "EstudioInforme_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstudioInforme" ADD CONSTRAINT "EstudioInforme_estudioId_fkey" FOREIGN KEY ("estudioId") REFERENCES "Estudio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single informeArchivoUrl into the new table, one row each.
-- Tiene que pasar ANTES de activar RLS: FORCE ROW LEVEL SECURITY aplica la
-- policy incluso al dueño de la tabla, y durante la migración no hay
-- app.tenant_id seteado, asi que el INSERT se rechazaria.
INSERT INTO "EstudioInforme" ("id", "tenantId", "estudioId", "key", "orden", "createdAt")
SELECT
    'mig_' || substr(md5(random()::text || "id"), 1, 20),
    "tenantId",
    "id",
    "informeArchivoUrl",
    0,
    "createdAt"
FROM "Estudio"
WHERE "informeArchivoUrl" IS NOT NULL;

-- DropColumn
ALTER TABLE "Estudio" DROP COLUMN "informeArchivoUrl";

-- RLS: mismo patron que el resto de las tablas tenant-scoped.
ALTER TABLE "EstudioInforme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EstudioInforme" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "EstudioInforme"
  USING ("tenantId" = current_setting('app.tenant_id', true));
