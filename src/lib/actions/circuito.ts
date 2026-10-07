"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { autorActual, autorPorClave, cerrarSesionCircuito, iniciarSesionCircuito } from "@/lib/circuito-auth";

export async function ingresarCircuito(formData: FormData) {
  const clave = String(formData.get("clave") ?? "");
  const autor = autorPorClave(clave);
  if (!autor) redirect("/circuito?error=1");
  await iniciarSesionCircuito(autor);
  redirect("/circuito");
}

export async function salirCircuito() {
  await cerrarSesionCircuito();
  redirect("/circuito");
}

export async function agregarNotaCircuito(seccion: string, texto: string) {
  const autor = await autorActual();
  if (!autor) return { error: "Sesión vencida, volvé a ingresar." };
  const limpio = texto.trim();
  if (!limpio) return { error: "Escribí algo primero." };
  if (limpio.length > 3000) return { error: "La nota es demasiado larga." };

  await prisma.circuitoNota.create({ data: { seccion: seccion.slice(0, 20), autor, texto: limpio } });
  revalidatePath("/circuito");
  return {};
}

export async function borrarNotaCircuito(id: string) {
  const autor = await autorActual();
  if (!autor) return;
  await prisma.circuitoNota.deleteMany({ where: { id, autor } });
  revalidatePath("/circuito");
}
