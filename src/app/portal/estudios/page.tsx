import Link from "next/link";
import { PortalShell } from "@/components/portal/portal-shell";
import { obtenerMiPaciente, listarMisEstudiosInformados } from "@/lib/actions/portal";

export default async function PortalEstudiosPage() {
  const [paciente, estudios] = await Promise.all([obtenerMiPaciente(), listarMisEstudiosInformados()]);

  return (
    <PortalShell pacienteNombre={`${paciente.nombre} ${paciente.apellido}`}>
      <h2 className="mb-3 text-sm font-semibold text-foreground">Mis estudios</h2>
      {estudios.length === 0 ? (
        <p className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
          Todavía no tenés estudios disponibles. Van a aparecer acá apenas el médico los revise y firme.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {estudios.map((e) => (
            <Link
              key={e.id}
              href={`/portal/estudios/${e.id}`}
              className="flex items-center justify-between rounded-md border border-border bg-card p-4 hover:bg-muted/40"
            >
              <div>
                <p className="font-semibold text-foreground">{e.practica.nombre}</p>
                <p className="text-sm text-muted-foreground">{e.modalidad || "—"}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {e.informadoEn ? new Date(e.informadoEn).toLocaleDateString("es-AR") : "—"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
