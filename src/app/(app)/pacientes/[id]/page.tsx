import { notFound } from "next/navigation";
import { CalendarPlus, FileImage, FileSignature, FileText, Stethoscope } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { ActionCard, type ActionCardProps } from "@/components/dashboard/action-card";
import { FichaPaciente } from "@/components/pacientes/ficha-paciente";
import { PortalAcceso } from "@/components/pacientes/portal-acceso";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { obtenerPaciente, obtenerAccesoPortal } from "@/lib/actions/pacientes";
import { listarDocumentosPaciente } from "@/lib/actions/historia-clinica";
import { DocumentosPaciente } from "@/components/historia-clinica/documentos-paciente";
import { listarAfiliacionesDePaciente, listarObrasSociales } from "@/lib/actions/obras-sociales";
import { AfiliacionesPaciente } from "@/components/pacientes/afiliaciones-paciente";

export default async function EditarPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);
  const moduloObrasSociales = session.enabledModules.includes("OBRAS_SOCIALES");
  const { id } = await params;
  const [paciente, acceso, documentos, afiliaciones, obrasSociales] = await Promise.all([
    obtenerPaciente(id),
    obtenerAccesoPortal(id),
    permisos.verDocumentosPaciente ? listarDocumentosPaciente(id) : Promise.resolve([]),
    moduloObrasSociales ? listarAfiliacionesDePaciente(id) : Promise.resolve([]),
    moduloObrasSociales ? listarObrasSociales(true) : Promise.resolve([]),
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

  const acciones: ActionCardProps[] = [];
  if (permisos.verHistoriaClinica) {
    acciones.push({
      href: `/pacientes/${paciente.id}/consulta`,
      label: "Panel de consulta",
      descripcion: "Historia clínica, notas y recetas",
      icon: Stethoscope,
    });
  }
  if (permisos.informarEstudios) {
    acciones.push({
      href: `/estudios/nuevo?pacienteId=${paciente.id}`,
      label: "Crear informe",
      descripcion: "Con o sin estudio adjunto",
      icon: FileSignature,
    });
  } else if (permisos.gestionarEstudios) {
    acciones.push({
      href: `/estudios/nuevo?pacienteId=${paciente.id}`,
      label: "Cargar estudio",
      descripcion: "Subir imágenes o PDF",
      icon: FileImage,
    });
  }
  if (permisos.gestionarTurnos && session.enabledModules.includes("TURNOS")) {
    acciones.push({ href: "/turnos", label: "Agendar turno", descripcion: "Ir a la agenda", icon: CalendarPlus });
  }
  if (permisos.verDocumentosPaciente) {
    acciones.push({
      href: "#documentos",
      label: "Recetas y órdenes",
      descripcion: "Ver, imprimir o enviar",
      icon: FileText,
    });
  }

  return (
    <>
      <PageTitle title={`${paciente.apellido}, ${paciente.nombre}`} />
      <div className="flex flex-col gap-6">
        {acciones.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">¿Qué querés hacer con este paciente?</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {acciones.map((a, i) => (
                <ActionCard key={a.href + a.label} {...a} destacada={i === 0} />
              ))}
            </div>
          </section>
        )}

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <FichaPaciente
            paciente={paciente}
            puedeEditar={permisos.gestionarPacientes}
            moduloObrasSociales={moduloObrasSociales}
          />

          <div className="flex flex-col gap-4">
            {moduloObrasSociales && (
              <div className="rounded-md border border-border bg-card p-6">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Obras sociales</h2>
                <AfiliacionesPaciente
                  pacienteId={paciente.id}
                  afiliaciones={afiliaciones}
                  obrasSociales={obrasSociales}
                  readOnly={!permisos.gestionarPacientes}
                />
              </div>
            )}

            {permisos.gestionarPacientes && (
              <div className="rounded-md border border-border bg-card p-6">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Portal del Paciente</h2>
                <PortalAcceso pacienteId={paciente.id} usernameActual={acceso?.username ?? null} />
              </div>
            )}

            {permisos.verDocumentosPaciente && (
              <div id="documentos" className="scroll-mt-4 rounded-md border border-border bg-card p-6">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Recetas y órdenes médicas</h2>
                <DocumentosPaciente documentos={documentosConLink} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
