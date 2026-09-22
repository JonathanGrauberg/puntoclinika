import { redirect } from "next/navigation";
import { Shell } from "@/components/app-shell/shell";
import { PacienteForm } from "@/components/pacientes/paciente-form";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";

export default async function NuevoPacientePage() {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).gestionarPacientes) {
    redirect("/pacientes");
  }

  return (
    <Shell
      title="Nuevo paciente"
      tenantName={session.tenantName}
      userName={session.userName}
      rol={session.rol}
      enabledModules={session.enabledModules}
    >
      <div className="max-w-2xl rounded-md border border-border bg-card p-6">
        <PacienteForm mode="create" />
      </div>
    </Shell>
  );
}
