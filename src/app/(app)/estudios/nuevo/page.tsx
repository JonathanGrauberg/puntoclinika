import { redirect } from "next/navigation";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarPacientes } from "@/lib/actions/pacientes";
import { listarPracticas } from "@/lib/actions/practicas";
import { EstudioUploadForm } from "@/components/estudios/estudio-upload-form";

export default async function NuevoEstudioPage() {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).gestionarEstudios) {
    redirect("/estudios");
  }

  const [pacientes, practicas] = await Promise.all([listarPacientes(), listarPracticas(true)]);

  return (
    <>
      <PageTitle title="Nuevo estudio" />
      <div className="max-w-xl rounded-md border border-border bg-card p-6">
        <EstudioUploadForm
          pacientes={pacientes}
          practicas={practicas.map((p) => ({ id: p.id, nombre: p.nombre }))}
        />
      </div>
    </>
  );
}
