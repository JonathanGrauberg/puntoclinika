import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export type AutorCircuito = "Jona" | "Papá";

const COOKIE = "circuito";

function firmar(autor: string) {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`circuito:${autor}`).digest("hex");
}

function iguales(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Qué autor corresponde a la clave ingresada (claves en variables de entorno). */
export function autorPorClave(clave: string): AutorCircuito | null {
  const jona = process.env.CIRCUITO_CLAVE_JONA;
  const papa = process.env.CIRCUITO_CLAVE_PAPA;
  if (jona && iguales(clave, jona)) return "Jona";
  if (papa && iguales(clave, papa)) return "Papá";
  return null;
}

export async function iniciarSesionCircuito(autor: AutorCircuito) {
  const store = await cookies();
  store.set(COOKIE, `${autor}.${firmar(autor)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/circuito",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function cerrarSesionCircuito() {
  const store = await cookies();
  store.delete({ name: COOKIE, path: "/circuito" });
}

export async function autorActual(): Promise<AutorCircuito | null> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return null;
  const [autor, firma] = valor.split(".");
  if (autor !== "Jona" && autor !== "Papá") return null;
  return iguales(firma ?? "", firmar(autor)) ? autor : null;
}

export function circuitoConfigurado() {
  return Boolean(process.env.CIRCUITO_CLAVE_JONA && process.env.CIRCUITO_CLAVE_PAPA);
}
