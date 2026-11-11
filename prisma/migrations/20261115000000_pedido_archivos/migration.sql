-- CreateTable
CREATE TABLE "PedidoArchivo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "subidoPor" TEXT NOT NULL,
    "autorTipo" "AutorMensaje" NOT NULL DEFAULT 'CONSULTORIO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoArchivo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PedidoArchivo_pedidoId_creadoEn_idx" ON "PedidoArchivo"("pedidoId", "creadoEn");

ALTER TABLE "PedidoArchivo" ADD CONSTRAINT "PedidoArchivo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PedidoArchivo" ADD CONSTRAINT "PedidoArchivo_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoLaboratorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PedidoArchivo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PedidoArchivo" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PedidoArchivo" USING ("tenantId" = current_setting('app.tenant_id', true));
