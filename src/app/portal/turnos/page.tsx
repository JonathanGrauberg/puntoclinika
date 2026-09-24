import { PortalShell } from "@/components/portal/portal-shell";
import { obtenerMiPaciente, listarMisTurnos } from "@/lib/actions/portal";

const ESTADO_LABEL: Record<string, string> = {
  RESERVADO: "Reservado",
  CONFIRMADO: "Confirmado",
  EN_ESPERA: "En espera",
  EN_ATENCION: "En atención",
  ATENDIDO: "Atendido",
  AUSENTE: "Ausente",
};

export default async function PortalTurnosPage() {
  const [paciente, turnos] = await Promise.all([obtenerMiPaciente(), listarMisTurnos()]);
  const ahora = new Date();
  const proximos = turnos.filter((t) => new Date(t.fechaHora) >= ahora);
  const pasados = turnos.filter((t) => new Date(t.fechaHora) < ahora);

  return (
    <PortalShell pacienteNombre={`${paciente.nombre} ${paciente.apellido}`}>
      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Próximos turnos</h2>
          {proximos.length === 0 ? (
            <p className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
              No tenés turnos programados.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {proximos.map((t) => (
                <div key={t.id} className="rounded-md border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{t.practica.nombre}</p>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      {ESTADO_LABEL[t.estado] ?? t.estado}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Dr/a. {t.profesional.apellido}, {t.profesional.nombre}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(t.fechaHora).toLocaleString("es-AR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Turnos anteriores</h2>
          {pasados.length === 0 ? (
            <p className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
              Todavía no tenés turnos anteriores.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pasados.map((t) => (
                <div key={t.id} className="rounded-md border border-border bg-card p-4 opacity-80">
                  <p className="font-semibold text-foreground">{t.practica.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    Dr/a. {t.profesional.apellido}, {t.profesional.nombre}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(t.fechaHora).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
