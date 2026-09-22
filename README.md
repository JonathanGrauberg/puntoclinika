# .clinika

Sistema de gestión médica multi-tenant y modular. Stack: Next.js 15 (App
Router) + TypeScript + Prisma + PostgreSQL (Neon) + NextAuth v5.

## Arquitectura (resumen)

- **Multi-tenancy**: dominio único, sin subdominio por cliente. Un `User`
  puede tener `Membership` en varios `Tenant` (centros médicos); tras el
  login se selecciona el centro activo.
- **Feature flags por módulo**: `TenantModule` habilita/deshabilita cada
  módulo (`PACIENTES`, `OBRAS_SOCIALES`, `ODONTOGRAMA`, etc.) por tenant, sin
  migraciones ni downtime al activar uno nuevo.
- **Aislamiento de datos**: dos capas.
  1. App-level: todas las queries corren dentro de `withTenantContext`
     (`src/lib/tenant-context.ts`), que abre una transacción y filtra por
     `tenantId`.
  2. Postgres RLS: cada tabla tenant-scoped tiene una policy que compara
     contra `current_setting('app.tenant_id', true)`, seteado con
     `set_config(..., true)` **local a la transacción** — no persiste entre
     requests aunque el pool de Neon reuse la conexión física. Ver el
     comentario completo en `prisma/migrations/20260922000001_rls/migration.sql`.
- **Auditoría**: `AuditLog` desde el día uno. Mutaciones sobre entidades
  sensibles (`Paciente`, `HistoriaClinicaEntry`, `Estudio`, `Factura`) se
  auditan junto con la operación; los accesos de lectura relevantes
  (abrir una ficha, ver un estudio) se auditan explícitamente con
  `auditView()` (`src/lib/audit.ts`).

## Setup local

### 1. Base de datos (Neon)

Se necesitan **dos roles** de Postgres, no uno:

- `clinika_owner`: dueño de las tablas, corre las migraciones. Puede
  bypassear RLS (todo owner lo hace por default) — **nunca se usa en
  runtime**.
- `clinika_app`: el que usa la app en producción. Sin `BYPASSRLS`, sin ser
  owner. Si este rol tuviera permisos de owner, las policies de RLS
  quedarían decorativas.

```sql
-- Como owner/admin de la base:
CREATE ROLE clinika_owner LOGIN PASSWORD '...' CREATEDB;
CREATE ROLE clinika_app LOGIN PASSWORD '...' NOSUPERUSER NOBYPASSRLS;
```

En Neon, generá dos connection strings (una por rol) y completá:

```bash
cp .env.example .env
```

- `DATABASE_URL` → rol `clinika_app` (runtime)
- `DIRECT_DATABASE_URL` → rol `clinika_owner` (migraciones)

### 2. Migraciones

```bash
npx prisma migrate deploy
```

Esto corre `20260922000000_init` (schema) y `20260922000001_rls` (roles +
policies). La migración de RLS crea `clinika_app` si no existe — igual
conviene setear la password real por fuera del script en producción.

### 3. Seed (datos demo)

```bash
npm run db:seed
```

Crea un tenant `demo` con los módulos base activados y un usuario
`admin@demo.clinika` / `changeme123`.

### 4. Dev server

```bash
npm run dev
```

## Roadmap de fases

Ver la conversación de arquitectura para el detalle completo. Resumen:

- **Fase 0** (esta): infraestructura, multi-tenancy, RLS, auditoría.
- **Fase 1**: Pacientes + Turnos + Estudios + Facturación básica (particular).
- **Fase 2**: Portal del Paciente + recordatorios WhatsApp + kiosco.
- **Fase 3**: Obras Sociales (padrón, autorización, liquidación).
- **Fase 4**: AFIP, reparto de honorarios, caja diaria, Reportes.
- **Fase 5**: Odontograma.
- **Fase 6**: Recetas/Informes con firma digital + integraciones DICOM/Worklist.
