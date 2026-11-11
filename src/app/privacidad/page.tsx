import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de privacidad — .clinika" };

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed text-foreground">
      <p className="mb-6 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Borrador provisorio. Este texto va a ser revisado antes de la salida comercial.
      </p>
      <h1 className="mb-4 text-2xl font-bold">Política de privacidad</h1>

      <h2 className="mt-6 text-base font-bold">Qué datos guardamos</h2>
      <p className="mt-1">
        De tu cuenta: nombre, email y contraseña (guardada de forma cifrada). De tu consultorio: los datos de
        pacientes, turnos, historia clínica y archivos que vos cargues.
      </p>

      <h2 className="mt-6 text-base font-bold">Cómo los protegemos</h2>
      <p className="mt-1">
        Los datos de cada consultorio están aislados de los de los demás a nivel de base de datos, la conexión viaja
        cifrada y registramos quién accede a la información clínica.
      </p>

      <h2 className="mt-6 text-base font-bold">Para qué los usamos</h2>
      <p className="mt-1">
        Solo para brindarte el servicio: mostrarte tu información, mandarte avisos importantes y mejorar la app. No
        vendemos tus datos ni los de tus pacientes.
      </p>

      <h2 className="mt-6 text-base font-bold">Tus derechos</h2>
      <p className="mt-1">
        Podés pedir acceso, corrección o eliminación de tus datos escribiendo a soporte@webistudio.net.
      </p>

      <p className="mt-8">
        <Link href="/registro" className="font-semibold underline underline-offset-2">
          Volver al registro
        </Link>
      </p>
    </main>
  );
}
