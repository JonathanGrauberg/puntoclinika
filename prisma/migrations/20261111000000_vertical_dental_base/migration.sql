-- CreateEnum
CREATE TYPE "TipoCentro" AS ENUM ('MEDICO', 'ODONTOLOGIA', 'LABORATORIO');

-- AlterTable Tenant
ALTER TABLE "Tenant" ADD COLUMN "tipo" "TipoCentro" NOT NULL DEFAULT 'MEDICO',
ADD COLUMN "trialHasta" TIMESTAMP(3),
ADD COLUMN "terminosAceptadosEn" TIMESTAMP(3),
ADD COLUMN "terminosVersion" TEXT;

-- AlterTable User: los usuarios existentes ya estan en uso, se consideran verificados.
ALTER TABLE "User" ADD COLUMN "emailVerificadoEn" TIMESTAMP(3);
UPDATE "User" SET "emailVerificadoEn" = NOW();

-- AlterTable Paciente: DNI opcional + marca de dato de ejemplo
ALTER TABLE "Paciente" ALTER COLUMN "dni" DROP NOT NULL,
ADD COLUMN "esDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Turno
ALTER TABLE "Turno" ADD COLUMN "esDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable EmailVerificacionToken
CREATE TABLE "EmailVerificacionToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificacionToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificacionToken_tokenHash_key" ON "EmailVerificacionToken"("tokenHash");
CREATE INDEX "EmailVerificacionToken_userId_createdAt_idx" ON "EmailVerificacionToken"("userId", "createdAt");
ALTER TABLE "EmailVerificacionToken" ADD CONSTRAINT "EmailVerificacionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable RegistroIntento
CREATE TABLE "RegistroIntento" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroIntento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegistroIntento_ip_createdAt_idx" ON "RegistroIntento"("ip", "createdAt");
