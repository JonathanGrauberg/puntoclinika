-- AlterTable
ALTER TABLE "Laboratorio" ADD COLUMN "numeroCliente" TEXT;

-- CreateTable (sin RLS a propósito: es la tabla puente que resuelve el consultorio a partir del token)
CREATE TABLE "PedidoEnlace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "revocadoEn" TIMESTAMP(3),
    "usos" INTEGER NOT NULL DEFAULT 0,
    "ultimoUsoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoEnlace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PedidoEnlace_token_key" ON "PedidoEnlace"("token");
CREATE INDEX "PedidoEnlace_pedidoId_idx" ON "PedidoEnlace"("pedidoId");

ALTER TABLE "PedidoEnlace" ADD CONSTRAINT "PedidoEnlace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PedidoEnlace" ADD CONSTRAINT "PedidoEnlace_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoLaboratorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
