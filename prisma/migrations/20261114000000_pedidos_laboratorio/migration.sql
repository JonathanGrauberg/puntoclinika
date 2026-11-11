-- CreateEnum
CREATE TYPE "EstadoPedidoLab" AS ENUM ('ENVIADO', 'RECIBIDO', 'EN_PROCESO', 'EN_PRUEBA', 'TERMINADO', 'ENTREGADO', 'DEVUELTO');
CREATE TYPE "AutorMensaje" AS ENUM ('CONSULTORIO', 'LABORATORIO');

-- CreateTable
CREATE TABLE "PedidoLaboratorio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "laboratorioId" TEXT NOT NULL,
    "tipoTrabajoId" TEXT,
    "trabajo" TEXT NOT NULL,
    "piezas" INTEGER[],
    "color" TEXT,
    "notas" TEXT,
    "fechaEntrega" TIMESTAMP(3),
    "estado" "EstadoPedidoLab" NOT NULL DEFAULT 'ENVIADO',
    "creadoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "entregadoEn" TIMESTAMP(3),
    "esDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PedidoLaboratorio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PedidoEstado" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "estado" "EstadoPedidoLab" NOT NULL,
    "nota" TEXT,
    "autor" TEXT NOT NULL,
    "autorTipo" "AutorMensaje" NOT NULL DEFAULT 'CONSULTORIO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoEstado_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PedidoMensaje" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "autorTipo" "AutorMensaje" NOT NULL,
    "autorNombre" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoMensaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PedidoLaboratorio_tenantId_numero_key" ON "PedidoLaboratorio"("tenantId", "numero");
CREATE INDEX "PedidoLaboratorio_tenantId_estado_idx" ON "PedidoLaboratorio"("tenantId", "estado");
CREATE INDEX "PedidoLaboratorio_tenantId_pacienteId_idx" ON "PedidoLaboratorio"("tenantId", "pacienteId");
CREATE INDEX "PedidoEstado_pedidoId_creadoEn_idx" ON "PedidoEstado"("pedidoId", "creadoEn");
CREATE INDEX "PedidoMensaje_pedidoId_creadoEn_idx" ON "PedidoMensaje"("pedidoId", "creadoEn");

-- AddForeignKey
ALTER TABLE "PedidoLaboratorio" ADD CONSTRAINT "PedidoLaboratorio_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PedidoLaboratorio" ADD CONSTRAINT "PedidoLaboratorio_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PedidoLaboratorio" ADD CONSTRAINT "PedidoLaboratorio_laboratorioId_fkey" FOREIGN KEY ("laboratorioId") REFERENCES "Laboratorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PedidoLaboratorio" ADD CONSTRAINT "PedidoLaboratorio_tipoTrabajoId_fkey" FOREIGN KEY ("tipoTrabajoId") REFERENCES "TipoTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PedidoEstado" ADD CONSTRAINT "PedidoEstado_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PedidoEstado" ADD CONSTRAINT "PedidoEstado_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoLaboratorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PedidoMensaje" ADD CONSTRAINT "PedidoMensaje_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PedidoMensaje" ADD CONSTRAINT "PedidoMensaje_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoLaboratorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
ALTER TABLE "PedidoLaboratorio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PedidoLaboratorio" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PedidoLaboratorio" USING ("tenantId" = current_setting('app.tenant_id', true));
ALTER TABLE "PedidoEstado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PedidoEstado" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PedidoEstado" USING ("tenantId" = current_setting('app.tenant_id', true));
ALTER TABLE "PedidoMensaje" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PedidoMensaje" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PedidoMensaje" USING ("tenantId" = current_setting('app.tenant_id', true));
