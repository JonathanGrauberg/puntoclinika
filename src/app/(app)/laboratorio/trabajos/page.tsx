import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { TrabajosCatalogo } from "@/components/laboratorio/trabajos-catalogo";
import { obtenerCatalogoLaboratorio } from "@/lib/actions/laboratorio";
import { requireSession } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";

export default async function TrabajosPage() {
  const session = await requireSession();
  const datos = await obtenerCatalogoLaboratorio();
  if (!datos) redirect("/dashboard");

  return (
    <>
      <PageTitle title="Trabajos" />
      <div className="flex flex-col gap-4">
        <Link href="/laboratorio" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Laboratorio
        </Link>
        <p className="text-sm text-muted-foreground">
          Estos son ejemplos para que arranques. Editá los nombres, borrá los que no uses y agregá los tuyos.
        </p>
        <TrabajosCatalogo
          trabajos={datos.trabajos}
          laboratorios={datos.laboratorios}
          puedeEditar={permisosDe(session.rol).gestionarLaboratorio}
        />
      </div>
    </>
  );
}
