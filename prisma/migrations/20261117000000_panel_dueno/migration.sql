-- Dueño de la plataforma
ALTER TABLE "User" ADD COLUMN "esDueno" BOOLEAN NOT NULL DEFAULT false;

-- Catálogo comercial (global, sin RLS)
CREATE TABLE "ModuloCatalogo" (
    "modulo" "ModuloKey" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precioMensual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vendible" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ModuloCatalogo_pkey" PRIMARY KEY ("modulo")
);

CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCentro" NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "precioMensual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "modulos" "ModuloKey"[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Tenant" ADD COLUMN "planId" TEXT, ADD COLUMN "notasInternas" TEXT;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- El dueño ve los módulos y los usuarios de todas las cuentas (solo lectura; las escrituras
-- siguen entrando con el contexto de la cuenta). Policy extra: se suma a tenant_isolation.
CREATE POLICY dueno_lectura ON "TenantModule" FOR SELECT USING (current_setting('app.es_dueno', true) = 'on');
CREATE POLICY dueno_lectura ON "Membership" FOR SELECT USING (current_setting('app.es_dueno', true) = 'on');

-- Catálogo inicial. Los precios arrancan en 0: los define el dueño desde el panel.
INSERT INTO "ModuloCatalogo" ("modulo", "nombre", "descripcion") VALUES
  ('PACIENTES', 'Pacientes', 'Fichas de pacientes y búsqueda rápida'),
  ('TURNOS', 'Turnos y agenda', 'Agenda, sala de espera y recordatorios de turnos'),
  ('ESTUDIOS', 'Estudios e informes', 'Carga de estudios, informes con firma y archivos'),
  ('FACTURACION', 'Facturación y cobros', 'Cobros por turno y resumen del día'),
  ('OBRAS_SOCIALES', 'Obras sociales', 'Catálogo de obras sociales y afiliaciones'),
  ('PORTAL_PACIENTE', 'Portal del paciente', 'Acceso del paciente a sus turnos e historia'),
  ('ODONTOGRAMA', 'Odontograma', 'Odontograma por pieza e historia clínica dental'),
  ('RECETAS_INFORMES', 'Recetas e informes', 'Recetas y órdenes imprimibles o por WhatsApp'),
  ('REPORTES', 'Reportes', 'Reportes y estadísticas'),
  ('INTEGRACIONES_DICOM', 'Integración DICOM', 'Imágenes médicas DICOM (futuro)'),
  ('LABORATORIO', 'Pedidos a laboratorio', 'Pedidos con archivos, seguimiento y link para el laboratorio');

INSERT INTO "Plan" ("id", "nombre", "tipo", "descripcion", "modulos", "orden") VALUES
  ('plan_medico', 'Centro médico', 'MEDICO', 'Pacientes, turnos, estudios y cobros', ARRAY['PACIENTES','TURNOS','ESTUDIOS','FACTURACION']::"ModuloKey"[], 1),
  ('plan_odonto_basico', 'Odontólogo Básico', 'ODONTOLOGIA', 'Pacientes, turnos, odontograma y cobros', ARRAY['PACIENTES','TURNOS','ODONTOGRAMA','FACTURACION']::"ModuloKey"[], 1),
  ('plan_odonto_completo', 'Odontólogo Completo', 'ODONTOLOGIA', 'Todo lo del básico más obras sociales y pedidos a laboratorio', ARRAY['PACIENTES','TURNOS','ODONTOGRAMA','FACTURACION','OBRAS_SOCIALES','LABORATORIO']::"ModuloKey"[], 2);
