-- CreateTable
CREATE TABLE "EstudioFirma" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "estudioId" TEXT NOT NULL,
    "imagen" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstudioFirma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstudioFirma_estudioId_key" ON "EstudioFirma"("estudioId");

-- AddForeignKey
ALTER TABLE "EstudioFirma" ADD CONSTRAINT "EstudioFirma_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstudioFirma" ADD CONSTRAINT "EstudioFirma_estudioId_fkey" FOREIGN KEY ("estudioId") REFERENCES "Estudio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: mismo patron que el resto de las tablas tenant-scoped.
ALTER TABLE "EstudioFirma" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EstudioFirma" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "EstudioFirma"
  USING ("tenantId" = current_setting('app.tenant_id', true));
