import { notFound } from "next/navigation";
import { Shell } from "@/components/app-shell/shell";
import { PacienteForm } from "@/components/pacientes/paciente-form";
import { PortalAcceso } from "@/components/pacientes/portal-acceso";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { obtenerPaciente, obtenerAccesoPortal } from "@/lib/actions/pacientes";

export default async function EditarPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);
  const { id } = await params;
  const [paciente, acceso] = await Promise.all([obtenerPaciente(id), obtenerAccesoPortal(id)]);

  if (!paciente) notFound();

  return (
    <Shell
      title={`${paciente.apellido}, ${paciente.nombre}`}
      tenantName={session.tenantName}
      userName={session.userName}
      rol={session.rol}
      enabledModules={session.enabledModules}
    >
      <div className="flex max-w-2xl flex-col gap-4">
        <div className="rounded-md border border-border bg-card p-6">
          <PacienteForm mode="edit" paciente={paciente} readOnly={!permisos.gestionarPacientes} />
        </div>

        {permisos.gestionarPacientes && (
          <div className="rounded-md border border-border bg-card p-6">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Portal del Paciente</h2>
            <PortalAcceso pacienteId={paciente.id} usernameActual={acceso?.username ?? null} />
          </div>
        )}
      </div>
    </Shell>
  );
}
