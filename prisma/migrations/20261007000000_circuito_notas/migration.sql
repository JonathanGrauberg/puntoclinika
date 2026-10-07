-- CreateTable
CREATE TABLE "CircuitoNota" (
    "id" TEXT NOT NULL,
    "seccion" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircuitoNota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CircuitoNota_seccion_createdAt_idx" ON "CircuitoNota"("seccion", "createdAt");
