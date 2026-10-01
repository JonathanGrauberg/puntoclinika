-- AlterTable
ALTER TABLE "Practica" ADD COLUMN "camposSugeridosInforme" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
