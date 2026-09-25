import { redirect } from "next/navigation";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { PacienteForm } from "@/components/pacientes/paciente-form";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";

export default async function NuevoPacientePage() {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).gestionarPacientes) {
    redirect("/pacientes");
  }

  return (
    <>
      <PageTitle title="Nuevo paciente" />
      <div className="max-w-2xl rounded-md border border-border bg-card p-6">
        <PacienteForm mode="create" />
      </div>
    </>
  );
}
