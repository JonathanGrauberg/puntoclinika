import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegistroForm } from "@/components/auth/registro-form";

export const metadata: Metadata = { title: "Crear cuenta — .clinika" };

export default async function RegistroPage() {
  const session = await auth();
  if (session?.user?.tenantId) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md py-8">
        <div className="mb-6 flex justify-center">
          <Image
            src="/brand/logo-negro.png"
            alt=".clinika"
            width={930}
            height={230}
            priority
            className="h-7 w-auto dark:hidden"
          />
          <Image
            src="/brand/logo-blanco.png"
            alt=".clinika"
            width={930}
            height={230}
            priority
            className="hidden h-7 w-auto dark:block"
          />
        </div>
        <h1 className="mb-1 text-center text-xl font-bold text-foreground">Creá tu cuenta</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Pacientes, turnos y odontograma en un solo lugar. En un minuto estás adentro.
        </p>
        <RegistroForm />
        <p className="mt-5 text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold text-foreground underline underline-offset-2">
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
