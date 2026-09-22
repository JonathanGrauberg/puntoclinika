import { redirect } from "next/navigation";
import { Shell } from "@/components/app-shell/shell";
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
    <Shell
      title="Nuevo estudio"
      tenantName={session.tenantName}
      userName={session.userName}
      rol={session.rol}
      enabledModules={session.enabledModules}
    >
      <div className="max-w-xl rounded-md border border-border bg-card p-6">
        <EstudioUploadForm pacientes={pacientes} practicas={practicas} />
      </div>
    </Shell>
  );
}
