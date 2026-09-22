import { notFound } from "next/navigation";
import { Shell } from "@/components/app-shell/shell";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { obtenerEstudio } from "@/lib/actions/estudios";
import { EstudioViewer } from "@/components/estudios/estudio-viewer";
import { InformeForm } from "@/components/estudios/informe-form";

export default async function EstudioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);
  const { id } = await params;
  const estudio = await obtenerEstudio(id);

  if (!estudio) notFound();

  return (
    <Shell
      title={`${estudio.paciente.apellido}, ${estudio.paciente.nombre}`}
      tenantName={session.tenantName}
      userName={session.userName}
      rol={session.rol}
      enabledModules={session.enabledModules}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-md border border-border bg-card p-5">
          <EstudioViewer estudioId={estudio.id} archivoKey={estudio.archivoUrl ?? ""} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Detalle</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Práctica</dt>
                <dd className="text-foreground">{estudio.practica.nombre}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Modalidad</dt>
                <dd className="text-foreground">{estudio.modalidad || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Fecha</dt>
                <dd className="text-foreground">{new Date(estudio.createdAt).toLocaleDateString("es-AR")}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Estado</dt>
                <dd className="text-foreground">{estudio.estado === "INFORMADO" ? "Informado" : "Pendiente"}</dd>
              </div>
              {estudio.informadoPor && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Informado por</dt>
                  <dd className="text-foreground">
                    {estudio.informadoPor.apellido}, {estudio.informadoPor.nombre}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {estudio.estado === "INFORMADO" ? (
            <div className="rounded-md border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Informe</h2>
              <p className="whitespace-pre-wrap text-sm text-foreground">{estudio.informeTexto}</p>
            </div>
          ) : permisos.informarEstudios ? (
            <div className="rounded-md border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Firmar informe</h2>
              <InformeForm estudioId={estudio.id} />
            </div>
          ) : (
            <div className="rounded-md border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Todavía no fue informado.</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
