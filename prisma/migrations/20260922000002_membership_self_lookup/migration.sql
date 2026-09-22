-- Permite que, en el momento del login (antes de tener un tenant activo
-- seteado), un usuario pueda ver SUS PROPIAS filas de Membership para
-- resolver a qué centros pertenece. Las policies RLS "permissive" del mismo
-- comando se combinan con OR, así que esto no debilita la policy existente
-- (tenant_isolation, que sigue exigiendo app.tenant_id para cualquier otra
-- lectura) — solo agrega una segunda forma válida de ver una fila: ser el
-- dueño de esa membresía. Ninguna otra tabla tiene una policy así; Paciente,
-- Turno, etc. siguen exigiendo app.tenant_id sin excepción.
CREATE POLICY own_memberships ON "Membership"
  USING ("userId" = current_setting('app.user_id', true));
