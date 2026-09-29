import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSession } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { obtenerPaciente } from "@/lib/actions/pacientes";
import { listarEstudiosDePaciente } from "@/lib/actions/estudios";
import { listarHistoriaClinica } from "@/lib/actions/historia-clinica";
import { obtenerTurnoActivo } from "@/lib/actions/turnos";
import { NuevaEntradaForm } from "@/components/historia-clinica/nueva-entrada-form";
import { HistoriaTimeline, type EntradaTimeline } from "@/components/historia-clinica/historia-timeline";
import { CerrarConsultaButton } from "@/components/turnos/cerrar-consulta-button";
import { formatFechaArgentina } from "@/lib/date-utils";

export default async function ConsultaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ turnoId?: string }>;
}) {
  const session = await requireSession();
  const permisos = permisosDe(session.rol);
  if (!permisos.verHistoriaClinica) {
    redirect("/pacientes");
  }

  const { id } = await params;
  const { turnoId } = await searchParams;
  const [paciente, estudios, historia, turnoActivo] = await Promise.all([
    obtenerPaciente(id),
    listarEstudiosDePaciente(id),
    listarHistoriaClinica(id),
    turnoId ? obtenerTurnoActivo(turnoId) : Promise.resolve(null),
  ]);
  if (!paciente) notFound();

  const baseUrl = process.env.AUTH_URL ?? "";
  const entradas: EntradaTimeline[] = historia.map((h) => ({
    id: h.id,
    tipo: h.tipo,
    contenido: h.contenido,
    fecha: h.fecha,
    visibleEnPortal: h.visibleEnPortal,
    profesional: { nombre: h.profesional.nombre, apellido: h.profesional.apellido },
    shareUrl: h.compartido ? `${baseUrl}/documento/${h.compartido.token}` : null,
  }));

  return (
    <>
      <PageTitle title={`Consulta — ${paciente.apellido}, ${paciente.nombre}`} />
      {turnoActivo && (
        <CerrarConsultaButton turnoId={turnoActivo.id} practicaNombre={turnoActivo.practica.nombre} />
      )}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Datos</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Documento</dt>
                <dd className="text-foreground">{paciente.dni}</dd>
              </div>
              {paciente.fechaNacimiento && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Nacimiento</dt>
                  <dd className="text-foreground">
                    {formatFechaArgentina(new Date(paciente.fechaNacimiento))}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Obra social</dt>
                <dd className="text-foreground">{paciente.obraSocialTexto || "—"}</dd>
              </div>
              {paciente.alergias && (
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Alergias</dt>
                  <dd className="font-semibold text-destructive">{paciente.alergias}</dd>
                </div>
              )}
            </dl>
            <Link
              href={`/pacientes/${paciente.id}`}
              className="mt-3 inline-block text-xs text-muted-foreground underline underline-offset-2"
            >
              Ver/editar ficha completa
            </Link>
          </div>

          <div className="rounded-md border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Estudios {estudios.length > 0 && `(${estudios.length})`}
              </h2>
              <Link
                href={`/estudios/nuevo?pacienteId=${paciente.id}`}
                className="text-xs font-semibold text-foreground underline underline-offset-2"
              >
                + Nuevo estudio
              </Link>
            </div>
            {estudios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin estudios cargados.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {estudios.map((e) => (
                  <li key={e.id}>
                    <Link href={`/estudios/${e.id}`} className="block text-sm text-foreground hover:underline">
                      {e.practica.nombre} — {formatFechaArgentina(new Date(e.createdAt))}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({e.estado === "INFORMADO" ? "Informado" : "Pendiente"})
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {permisos.gestionarHistoriaClinica && (
            <div className="rounded-md border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Nueva entrada</h2>
              <NuevaEntradaForm pacienteId={paciente.id} />
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Historia clínica</h2>
            <HistoriaTimeline entradas={entradas} />
          </div>
        </div>
      </div>
    </>
  );
}
