import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Sesión del Portal del Paciente, deliberadamente INDEPENDIENTE de la
// sesión de NextAuth que usa el staff (cookie propia, JWT propio, firmado
// con su propio secreto). Un bug en uno de los dos sistemas no puede
// filtrar acceso al otro — dado que acá hay historia clínica de por
// medio, esa separación vale la complejidad extra.
const COOKIE_NAME = "clinika_portal_session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-cambiar");

export interface SesionPortal {
  pacienteId: string;
  tenantId: string;
}

export async function crearSesionPortal(sesion: SesionPortal) {
  const token = await new SignJWT({ ...sesion, tipo: "paciente" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function obtenerSesionPortal(): Promise<SesionPortal | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.tipo !== "paciente" || typeof payload.pacienteId !== "string" || typeof payload.tenantId !== "string") {
      return null;
    }
    return { pacienteId: payload.pacienteId, tenantId: payload.tenantId };
  } catch {
    return null;
  }
}

export async function cerrarSesionPortal() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Para usar al principio de cada page del portal (excepto /portal/login). */
export async function requireSesionPortal(): Promise<SesionPortal> {
  const sesion = await obtenerSesionPortal();
  if (!sesion) redirect("/portal/login");
  return sesion;
}
