import { notFound } from "next/navigation";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { PacienteForm } from "@/components/pacientes/paciente-form";
import { PortalAcceso } from "@/components/pacientes/portal-acceso";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { obtenerPaciente, obtenerAccesoPortal } from "@/lib/actions/pacientes";
import { listarDocumentosPaciente } from "@/lib/actions/historia-clinica";
import { DocumentosPaciente } from "@/components/historia-clinica/documentos-paciente";

export default async function EditarPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);
  const { id } = await params;
  const [paciente, acceso, documentos] = await Promise.all([
    obtenerPaciente(id),
    obtenerAccesoPortal(id),
    permisos.verDocumentosPaciente ? listarDocumentosPaciente(id) : Promise.resolve([]),
  ]);

  if (!paciente) notFound();

  const baseUrl = process.env.AUTH_URL ?? "";
  const documentosConLink = documentos.map((d) => ({
    id: d.id,
    tipo: d.tipo,
    fecha: d.fecha,
    profesional: { nombre: d.profesional.nombre, apellido: d.profesional.apellido },
    shareUrl: d.compartido ? `${baseUrl}/documento/${d.compartido.token}` : null,
  }));

  return (
    <>
      <PageTitle title={`${paciente.apellido}, ${paciente.nombre}`} />
      <div className="flex max-w-2xl flex-col gap-4">
        {permisos.verHistoriaClinica && (
          <Link
            href={`/pacientes/${paciente.id}/consulta`}
            className="flex h-11 w-fit items-center gap-2 rounded-md bg-primary px-5 text-[15px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <Stethoscope className="h-4 w-4" />
            Panel de consulta
          </Link>
        )}
        <div className="rounded-md border border-border bg-card p-6">
          <PacienteForm mode="edit" paciente={paciente} readOnly={!permisos.gestionarPacientes} />
        </div>

        {permisos.gestionarPacientes && (
          <div className="rounded-md border border-border bg-card p-6">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Portal del Paciente</h2>
            <PortalAcceso pacienteId={paciente.id} usernameActual={acceso?.username ?? null} />
          </div>
        )}

        {permisos.verDocumentosPaciente && (
          <div className="rounded-md border border-border bg-card p-6">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Recetas y órdenes médicas</h2>
            <DocumentosPaciente documentos={documentosConLink} />
          </div>
        )}
      </div>
    </>
  );
}
