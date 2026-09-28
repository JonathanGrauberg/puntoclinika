import { PortalShell } from "@/components/portal/portal-shell";
import { obtenerMiPaciente } from "@/lib/actions/portal";
import { listarMiHistoriaClinicaVisible } from "@/lib/actions/portal";

const TIPO_LABEL: Record<string, string> = {
  NOTA: "Nota",
  DIAGNOSTICO: "Diagnóstico",
  INDICACION: "Indicación",
  RECETA: "Receta",
  ORDEN_MEDICA: "Orden médica",
};

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
        <div className="flex flex-col gap-2">
          {entradas.map((e) => (
            <div key={e.id} className="rounded-md border border-border bg-card p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                  {TIPO_LABEL[e.tipo] ?? e.tipo}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.fecha).toLocaleDateString("es-AR")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground">{e.contenido}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {e.profesional.apellido}, {e.profesional.nombre}
              </p>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
