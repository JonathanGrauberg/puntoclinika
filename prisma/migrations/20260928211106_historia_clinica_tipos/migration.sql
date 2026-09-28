/*
  Warnings:

  - Changed the type of `tipo` on the `HistoriaClinicaEntry` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TipoHistoriaClinica" AS ENUM ('NOTA', 'DIAGNOSTICO', 'INDICACION', 'RECETA', 'ORDEN_MEDICA');

-- AlterTable
ALTER TABLE "HistoriaClinicaEntry" ADD COLUMN     "visibleEnPortal" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoHistoriaClinica" NOT NULL;

-- CreateTable
CREATE TABLE "DocumentoCompartido" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "historiaClinicaEntryId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoCompartido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoCompartido_historiaClinicaEntryId_key" ON "DocumentoCompartido"("historiaClinicaEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoCompartido_token_key" ON "DocumentoCompartido"("token");

-- AddForeignKey
ALTER TABLE "DocumentoCompartido" ADD CONSTRAINT "DocumentoCompartido_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoCompartido" ADD CONSTRAINT "DocumentoCompartido_historiaClinicaEntryId_fkey" FOREIGN KEY ("historiaClinicaEntryId") REFERENCES "HistoriaClinicaEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
