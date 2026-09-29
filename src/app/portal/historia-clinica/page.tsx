import { PortalShell } from "@/components/portal/portal-shell";
import { obtenerMiPaciente } from "@/lib/actions/portal";
import { listarMiHistoriaClinicaVisible } from "@/lib/actions/portal";
import { PortalHistoriaTimeline } from "@/components/portal/portal-historia-timeline";

export default async function PortalHistoriaClinicaPage() {
  const [paciente, entradas] = await Promise.all([obtenerMiPaciente(), listarMiHistoriaClinicaVisible()]);

  return (
    <PortalShell pacienteNombre={`${paciente.nombre} ${paciente.apellido}`}>
      <h2 className="mb-3 text-sm font-semibold text-foreground">Mi historia clínica</h2>
      {entradas.length === 0 ? (
        <p className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
          Todavía no hay nada compartido acá. Tu médico decide qué parte de tu historia clínica hacer
          visible en el portal.
        </p>
      ) : (
        <PortalHistoriaTimeline entradas={entradas} />
      )}
    </PortalShell>
  );
}
