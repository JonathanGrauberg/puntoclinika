import "server-only";
import { randomBytes } from "crypto";
import type { TenantClient } from "./tenant-context";

/** Cuánto vale el link del laboratorio desde que se crea o se renueva. */
export const DIAS_ENLACE = 30;

/** 256 bits al azar: imposible de adivinar. Va en la URL, así que se guarda tal cual (como los documentos compartidos). */
export function nuevoToken() {
  return randomBytes(32).toString("base64url");
}

export function vencimientoDesdeHoy() {
  return new Date(Date.now() + DIAS_ENLACE * 86_400_000);
}

export function urlEnlace(token: string) {
  return `${process.env.AUTH_URL ?? ""}/l/${token}`;
}

export type EstadoEnlace = "vigente" | "vencido" | "revocado";

export function estadoDeEnlace(e: { revocadoEn: Date | null; venceEn: Date }): EstadoEnlace {
  if (e.revocadoEn) return "revocado";
  return e.venceEn.getTime() < Date.now() ? "vencido" : "vigente";
}

export async function crearEnlaceParaPedido(tx: TenantClient, tenantId: string, pedidoId: string) {
  return tx.pedidoEnlace.create({
    data: { tenantId, pedidoId, token: nuevoToken(), venceEn: vencimientoDesdeHoy() },
  });
}
