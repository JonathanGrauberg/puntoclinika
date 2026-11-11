-- AlterEnum
ALTER TYPE "TipoHistoriaClinica" ADD VALUE 'PRESTACION';

-- AlterTable HistoriaClinicaEntry
ALTER TABLE "HistoriaClinicaEntry" ADD COLUMN "piezas" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "esDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "SuperficieDental" AS ENUM ('VESTIBULAR', 'LINGUAL', 'MESIAL', 'DISTAL', 'OCLUSAL');
CREATE TYPE "TipoHallazgo" AS ENUM ('CARIES', 'OBTURACION', 'CORONA', 'ENDODONCIA', 'EXTRACCION', 'AUSENTE', 'IMPLANTE', 'PROTESIS_FIJA', 'PROTESIS_REMOVIBLE', 'FRACTURA', 'SELLADOR', 'OTRO');
CREATE TYPE "EstadoHallazgo" AS ENUM ('A_REALIZAR', 'EXISTENTE');

-- CreateTable
CREATE TABLE "HallazgoDental" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "pieza" INTEGER NOT NULL,
    "superficies" "SuperficieDental"[],
    "tipo" "TipoHallazgo" NOT NULL,
    "estado" "EstadoHallazgo" NOT NULL,
    "nota" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anuladoEn" TIMESTAMP(3),
    "esDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HallazgoDental_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HallazgoDental_tenantId_pacienteId_pieza_idx" ON "HallazgoDental"("tenantId", "pacienteId", "pieza");

-- AddForeignKey
ALTER TABLE "HallazgoDental" ADD CONSTRAINT "HallazgoDental_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HallazgoDental" ADD CONSTRAINT "HallazgoDental_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HallazgoDental" ADD CONSTRAINT "HallazgoDental_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: mismo patron que el resto de las tablas tenant-scoped.
ALTER TABLE "HallazgoDental" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HallazgoDental" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "HallazgoDental"
  USING ("tenantId" = current_setting('app.tenant_id', true));
