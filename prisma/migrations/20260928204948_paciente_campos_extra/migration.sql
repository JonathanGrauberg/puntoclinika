-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DNI', 'PASAPORTE', 'OTRO');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');

-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "contactoEmergenciaNombre" TEXT,
ADD COLUMN     "contactoEmergenciaTelefono" TEXT,
ADD COLUMN     "domicilio" TEXT,
ADD COLUMN     "sexo" "Sexo",
ADD COLUMN     "tipoDocumento" "TipoDocumento" NOT NULL DEFAULT 'DNI';
