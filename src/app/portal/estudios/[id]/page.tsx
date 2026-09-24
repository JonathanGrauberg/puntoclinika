import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { obtenerMiPaciente, obtenerMiEstudio } from "@/lib/actions/portal";
import { EstudioGaleriaPortal } from "@/components/portal/estudio-galeria-portal";

export default async function PortalEstudioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [paciente, estudio] = await Promise.all([obtenerMiPaciente(), obtenerMiEstudio(id)]);

  if (!estudio) notFound();

  return (
    <PortalShell pacienteNombre={`${paciente.nombre} ${paciente.apellido}`}>
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{estudio.practica.nombre}</h2>
          <EstudioGaleriaPortal archivos={estudio.archivos} />
        </div>

        {estudio.informeTexto && (
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Informe</h2>
            <p className="whitespace-pre-wrap text-sm text-foreground">{estudio.informeTexto}</p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
