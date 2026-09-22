import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Ejecuta `callback` dentro de una única transacción con el tenant activo
 * seteado vía `set_config(..., true)` (scope LOCAL a la transacción).
 *
 * Por qué así y no `SET` de sesión: Neon reutiliza conexiones físicas entre
 * requests de tenants distintos (pooling). `set_config` con is_local=true
 * muere al hacer COMMIT/ROLLBACK, así que nunca puede filtrarse al próximo
 * request que tome esa misma conexión. Las policies RLS en Postgres leen
 * `current_setting('app.tenant_id', true)` — si no está seteado, devuelve
 * '' y ninguna fila matchea (fail-closed).
 *
 * Todas las queries de un mismo request deben pasar por el `tx` recibido acá,
 * no por `prisma` directo, para garantizar que corren sobre la misma
 * conexión/transacción donde se seteó el tenant.
 */
export async function withTenantContext<T>(
  tenantId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return callback(tx);
  });
}

export type TenantClient = Prisma.TransactionClient;
