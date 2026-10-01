import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { obtenerEstudio } from "@/lib/actions/estudios";
import { InformeForm } from "@/components/estudios/informe-form";
import { formatFechaArgentina } from "@/lib/date-utils";

export default async function InformarEstudioPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);
  if (!permisos.informarEstudios) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const estudio = await obtenerEstudio(id);
  if (!estudio) notFound();
  if (estudio.estado === "INFORMADO") {
    redirect(`/estudios/${id}`);
  }

  return (
    <>
      <PageTitle title={`Informar — ${estudio.paciente.apellido}, ${estudio.paciente.nombre}`} />
      <Link
        href={`/estudios/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al estudio
      </Link>

      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-lg font-semibold text-foreground">
                {estudio.paciente.apellido}, {estudio.paciente.nombre}
              </p>
              <p className="text-sm text-muted-foreground">
                {estudio.practica.nombre}
                {estudio.modalidad && ` — ${estudio.modalidad}`} · {formatFechaArgentina(new Date(estudio.createdAt))}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Informar estudio</h2>
          <InformeForm
            estudioId={estudio.id}
            tieneInformeAdjunto={estudio.informes.length > 0}
            camposSugeridos={estudio.practica.camposSugeridosInforme}
          />
        </div>
      </div>
    </>
  );
}
