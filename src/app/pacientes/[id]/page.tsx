import { notFound } from "next/navigation";
import { Shell } from "@/components/app-shell/shell";
import { PacienteForm } from "@/components/pacientes/paciente-form";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { obtenerPaciente } from "@/lib/actions/pacientes";

export default async function EditarPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);
  const { id } = await params;
  const paciente = await obtenerPaciente(id);

  if (!paciente) notFound();

  return (
    <Shell
      title={`${paciente.apellido}, ${paciente.nombre}`}
      tenantName={session.tenantName}
      userName={session.userName}
      rol={session.rol}
      enabledModules={session.enabledModules}
    >
      <div className="max-w-2xl rounded-md border border-border bg-card p-6">
        <PacienteForm mode="edit" paciente={paciente} readOnly={!permisos.gestionarPacientes} />
      </div>
    </Shell>
  );
}
