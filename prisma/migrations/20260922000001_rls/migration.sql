-- ============================================================================
-- Aislamiento multi-tenant vía Row Level Security.
--
-- Contexto: la app abre siempre una transacción por request y setea
-- `set_config('app.tenant_id', <tenantId>, true)` (scope LOCAL, ver
-- src/lib/tenant-context.ts) antes de correr cualquier query. Las policies
-- de abajo comparan contra `current_setting('app.tenant_id', true)`, que
-- devuelve '' si no está seteado -> ninguna fila matchea -> fail-closed.
--
-- CRÍTICO: Postgres ignora RLS para el owner de la tabla y para roles con
-- BYPASSRLS. Por eso el rol de runtime (clinika_app) NO puede ser el owner
-- de las tablas ni tener BYPASSRLS. Las migraciones corren con un rol
-- separado (owner, vía DIRECT_DATABASE_URL) que sí puede crear/alterar
-- tablas, pero la app en runtime usa DATABASE_URL -> clinika_app.
-- ============================================================================

-- Rol de runtime, sin privilegios de owner, sin BYPASSRLS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'clinika_app') THEN
    CREATE ROLE clinika_app LOGIN PASSWORD 'CHANGE_ME_EN_PRODUCCION';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO clinika_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinika_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO clinika_app;

-- Habilitar RLS + policy por tabla tenant-scoped.
-- FORCE ROW LEVEL SECURITY además aplica la policy incluso si en algún
-- momento se ejecuta como owner de la tabla desde otro contexto.

ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Membership"
  USING ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "TenantModule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantModule" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "TenantModule"
  USING ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AuditLog"
  USING ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Paciente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Paciente" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Paciente"
  USING ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Profesional" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profesional" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Profesional"
  USING ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Practica" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Practica" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Practica"
  USING ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Turno" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Turno"
  USING ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Estudio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Estudio" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Estudio"
  USING ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "HistoriaClinicaEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HistoriaClinicaEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "HistoriaClinicaEntry"
  USING ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Factura" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Factura" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Factura"
  USING ("tenantId" = current_setting('app.tenant_id', true));

-- FacturaItem y Pago no tienen tenantId propio (cuelgan de Factura), se
-- aíslan por join implícito vía la FK -> factura ya filtrada por su policy.
-- Igual forzamos RLS habilitado para que ninguna query directa a estas
-- tablas bypasee el aislamiento si en el futuro se accede sin pasar por Factura.
ALTER TABLE "FacturaItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FacturaItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "FacturaItem"
  USING (EXISTS (
    SELECT 1 FROM "Factura" f
    WHERE f.id = "FacturaItem"."facturaId"
      AND f."tenantId" = current_setting('app.tenant_id', true)
  ));

ALTER TABLE "Pago" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pago" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Pago"
  USING (EXISTS (
    SELECT 1 FROM "Factura" f
    WHERE f.id = "Pago"."facturaId"
      AND f."tenantId" = current_setting('app.tenant_id', true)
  ));

-- Tenant, User y Membership merecen nota aparte:
-- - "Tenant" no lleva policy: se resuelve fuera del contexto tenant-scoped
--   (ej: pantalla de selección de centro post-login lista los tenants del
--   usuario vía Membership, no filtra la tabla Tenant por RLS).
-- - "User" tampoco: es intencionalmente global (un mismo login para varios
--   centros), así que no aplica aislamiento por tenant a nivel de fila.
