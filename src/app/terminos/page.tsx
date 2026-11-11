import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Términos y condiciones — .clinika" };

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed text-foreground">
      <p className="mb-6 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Borrador provisorio. Este texto va a ser revisado antes de la salida comercial.
      </p>
      <h1 className="mb-4 text-2xl font-bold">Términos y condiciones</h1>

      <h2 className="mt-6 text-base font-bold">1. Qué es .clinika</h2>
      <p className="mt-1">
        .clinika es un servicio online para gestionar pacientes, turnos e historia clínica de consultorios y
        laboratorios. Lo ofrece Webi. Studio Digital (&ldquo;nosotros&rdquo;).
      </p>

      <h2 className="mt-6 text-base font-bold">2. Tu cuenta</h2>
      <p className="mt-1">
        Sos responsable de mantener tu contraseña en secreto y de la actividad que se haga con tu cuenta. Tenés que
        darnos datos verdaderos al registrarte.
      </p>

      <h2 className="mt-6 text-base font-bold">3. Datos de tus pacientes</h2>
      <p className="mt-1">
        Los datos de tus pacientes son tuyos. Vos sos quien los carga y quien decide para qué se usan; nosotros solo
        los guardamos y los protegemos para que los puedas usar. Sos responsable de contar con el consentimiento
        necesario de tus pacientes y de cumplir las leyes de salud y de protección de datos personales que te
        correspondan.
      </p>

      <h2 className="mt-6 text-base font-bold">4. Prueba gratis y planes</h2>
      <p className="mt-1">
        Podés usar .clinika gratis durante 14 días. Después vas a poder elegir un plan de pago. Si no lo contratás,
        podés seguir viendo tus datos pero no cargar nuevos hasta regularizar.
      </p>

      <h2 className="mt-6 text-base font-bold">5. Disponibilidad</h2>
      <p className="mt-1">
        Trabajamos para que el servicio funcione siempre, pero pueden ocurrir interrupciones por mantenimiento o
        causas ajenas. Te recomendamos conservar copia de la información que sea crítica para vos.
      </p>

      <h2 className="mt-6 text-base font-bold">6. Baja</h2>
      <p className="mt-1">
        Podés dejar de usar el servicio cuando quieras. Podés pedirnos la exportación o la eliminación de tus datos
        escribiendo a soporte@webistudio.net.
      </p>

      <p className="mt-8">
        <Link href="/registro" className="font-semibold underline underline-offset-2">
          Volver al registro
        </Link>
      </p>
    </main>
  );
}
