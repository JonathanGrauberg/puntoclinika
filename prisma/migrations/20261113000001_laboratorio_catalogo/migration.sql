-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "catalogoLabCargadoEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Laboratorio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "especialidades" TEXT[],
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Laboratorio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TipoTrabajo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "laboratorioId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoTrabajo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Laboratorio_tenantId_idx" ON "Laboratorio"("tenantId");
CREATE INDEX "TipoTrabajo_tenantId_categoria_idx" ON "TipoTrabajo"("tenantId", "categoria");

-- AddForeignKey
ALTER TABLE "Laboratorio" ADD CONSTRAINT "Laboratorio_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TipoTrabajo" ADD CONSTRAINT "TipoTrabajo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TipoTrabajo" ADD CONSTRAINT "TipoTrabajo_laboratorioId_fkey" FOREIGN KEY ("laboratorioId") REFERENCES "Laboratorio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS
ALTER TABLE "Laboratorio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Laboratorio" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Laboratorio"
  USING ("tenantId" = current_setting('app.tenant_id', true));
ALTER TABLE "TipoTrabajo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TipoTrabajo" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "TipoTrabajo"
  USING ("tenantId" = current_setting('app.tenant_id', true));

-- Los consultorios dentales que ya existen reciben el módulo.
INSERT INTO "TenantModule" ("id", "tenantId", "modulo", "habilitado", "activadoEn")
SELECT 'lab_' || t."id", t."id", 'LABORATORIO', true, NOW()
FROM "Tenant" t WHERE t."tipo" = 'ODONTOLOGIA'
ON CONFLICT ("tenantId", "modulo") DO NOTHING;
