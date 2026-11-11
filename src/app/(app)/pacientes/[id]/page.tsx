import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, FileImage, FileSignature, FileText, Phone, Stethoscope, TriangleAlert } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { VERTICALES } from "@/lib/verticales";
import { ActionCard, type ActionCardProps } from "@/components/dashboard/action-card";
import { FichaPaciente } from "@/components/pacientes/ficha-paciente";
import { PortalAcceso } from "@/components/pacientes/portal-acceso";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { obtenerPaciente, obtenerAccesoPortal } from "@/lib/actions/pacientes";
import { listarDocumentosPaciente, listarHistoriaClinica } from "@/lib/actions/historia-clinica";
import { listarHallazgos } from "@/lib/actions/odontograma";
import { obtenerTurnoActivo } from "@/lib/actions/turnos";
import { DocumentosPaciente } from "@/components/historia-clinica/documentos-paciente";
import type { EntradaTimeline } from "@/components/historia-clinica/historia-timeline";
import { listarAfiliacionesDePaciente, listarObrasSociales } from "@/lib/actions/obras-sociales";
import { AfiliacionesPaciente } from "@/components/pacientes/afiliaciones-paciente";
import { FichaDental } from "@/components/odontograma/ficha-dental";
import { CerrarConsultaButton } from "@/components/turnos/cerrar-consulta-button";

export default async function EditarPacientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ turnoId?: string }>;
}) {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);
  const moduloObrasSociales = session.enabledModules.includes("OBRAS_SOCIALES");
  // Consultorio dental con odontograma: la ficha es odontograma + historia + datos, en pestañas.
  const esFichaDental =
    session.tenantTipo === "ODONTOLOGIA" && permisos.verHistoriaClinica && session.enabledModules.includes("ODONTOGRAMA");
  const { id } = await params;
  const { turnoId } = await searchParams;
  const [paciente, acceso, documentos, afiliaciones, obrasSociales, hallazgos, historia, turnoActivo] = await Promise.all([
    obtenerPaciente(id),
    obtenerAccesoPortal(id),
    permisos.verDocumentosPaciente && !esFichaDental ? listarDocumentosPaciente(id) : Promise.resolve([]),
    moduloObrasSociales ? listarAfiliacionesDePaciente(id) : Promise.resolve([]),
    moduloObrasSociales ? listarObrasSociales(true) : Promise.resolve([]),
    esFichaDental ? listarHallazgos(id) : Promise.resolve([]),
    esFichaDental ? listarHistoriaClinica(id) : Promise.resolve([]),
    esFichaDental && turnoId ? obtenerTurnoActivo(turnoId) : Promise.resolve(null),
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

  const fichaDatos = (
    <FichaPaciente
      paciente={paciente}
      puedeEditar={permisos.gestionarPacientes}
      moduloObrasSociales={moduloObrasSociales}
      dniObligatorio={VERTICALES[session.tenantTipo].dniObligatorio}
    />
  );
  const obrasSocialesCard = moduloObrasSociales && (
    <div className="rounded-md border border-border bg-card p-6">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Obras sociales</h2>
      <AfiliacionesPaciente
        pacienteId={paciente.id}
        afiliaciones={afiliaciones}
        obrasSociales={obrasSociales}
        readOnly={!permisos.gestionarPacientes}
      />
    </div>
  );
  const portalCard = permisos.gestionarPacientes && (
    <div className="rounded-md border border-border bg-card p-6">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Portal del Paciente</h2>
      <PortalAcceso pacienteId={paciente.id} usernameActual={acceso?.username ?? null} />
    </div>
  );

  if (esFichaDental) {
    const entradas: EntradaTimeline[] = historia.map((h) => ({
      id: h.id,
      tipo: h.tipo,
      contenido: h.contenido,
      fecha: h.fecha,
      visibleEnPortal: h.visibleEnPortal,
      piezas: h.piezas,
      profesional: { nombre: h.profesional.nombre, apellido: h.profesional.apellido },
      shareUrl: h.compartido ? `${baseUrl}/documento/${h.compartido.token}` : null,
    }));
    const edad = paciente.fechaNacimiento
      ? Math.floor((Date.now() - new Date(paciente.fechaNacimiento).getTime()) / (365.25 * 86_400_000))
      : null;

    return (
      <>
        <PageTitle title={`${paciente.apellido}, ${paciente.nombre}`} />
        <div className="flex flex-col gap-4">
          {turnoActivo && (
            <CerrarConsultaButton turnoId={turnoActivo.id} practicaNombre={turnoActivo.practica.nombre} />
          )}

          <div className="flex flex-wrap items-center gap-3">
            {paciente.telefono && (
              <a
                href={`tel:${paciente.telefono}`}
                className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <Phone className="h-4 w-4" />
                {paciente.telefono}
              </a>
            )}
            {permisos.gestionarTurnos && session.enabledModules.includes("TURNOS") && (
              <Link
                href="/turnos"
                className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <CalendarPlus className="h-4 w-4" />
                Agendar turno
              </Link>
            )}
          </div>

          {paciente.alergias && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-bold text-destructive">Alergias</p>
                <p className="text-sm text-foreground">{paciente.alergias}</p>
              </div>
            </div>
          )}

          <FichaDental
            pacienteId={paciente.id}
            hallazgos={hallazgos}
            entradas={entradas}
            puedeEditar={permisos.gestionarHistoriaClinica}
            denticionInicial={edad !== null && edad < 7 ? "temporales" : "permanentes"}
            datos={
              <div className="grid items-start gap-4 xl:grid-cols-2">
                {fichaDatos}
                <div className="flex flex-col gap-4">
                  {obrasSocialesCard}
                  {portalCard}
                </div>
              </div>
            }
          />
        </div>
      </>
    );
  }

  const acciones: ActionCardProps[] = [];
  if (permisos.verHistoriaClinica) {
    acciones.push({
      href: `/pacientes/${paciente.id}/consulta`,
      label: "Panel de consulta",
      descripcion: "Historia clínica, notas y recetas",
      icon: Stethoscope,
    });
  }
  const moduloEstudios = session.enabledModules.includes("ESTUDIOS");
  if (moduloEstudios && permisos.informarEstudios) {
    acciones.push({
      href: `/estudios/nuevo?pacienteId=${paciente.id}`,
      label: "Crear informe",
      descripcion: "Con o sin estudio adjunto",
      icon: FileSignature,
    });
  } else if (moduloEstudios && permisos.gestionarEstudios) {
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
          {fichaDatos}

          <div className="flex flex-col gap-4">
            {obrasSocialesCard}
            {portalCard}

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
