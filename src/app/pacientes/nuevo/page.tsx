import { Shell } from "@/components/app-shell/shell";
import { PacienteForm } from "@/components/pacientes/paciente-form";
import { requireSessionWithModules } from "@/lib/session";

export default async function NuevoPacientePage() {
  const session = await requireSessionWithModules();

  return (
    <Shell
      title="Nuevo paciente"
      tenantName={session.tenantName}
      userName={session.userName}
      enabledModules={session.enabledModules}
    >
      <div className="max-w-2xl rounded-md border border-border bg-card p-6">
        <PacienteForm mode="create" />
      </div>
    </Shell>
  );
}
