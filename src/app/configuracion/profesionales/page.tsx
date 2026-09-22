import { Shell } from "@/components/app-shell/shell";
import { requireSessionWithModules } from "@/lib/session";
import { listarProfesionales } from "@/lib/actions/profesionales";
import { ProfesionalQuickForm } from "@/components/configuracion/profesional-quick-form";

export default async function ProfesionalesPage() {
  const session = await requireSessionWithModules();
  const profesionales = await listarProfesionales();

  return (
    <Shell
      title="Profesionales"
      tenantName={session.tenantName}
      userName={session.userName}
      enabledModules={session.enabledModules}
    >
      <div className="mb-4 rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Agregar profesional</h2>
        <ProfesionalQuickForm />
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Matrícula</th>
              <th className="px-4 py-3 font-semibold">Especialidad</th>
            </tr>
          </thead>
          <tbody>
            {profesionales.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  Todavía no hay profesionales cargados.
                </td>
              </tr>
            )}
            {profesionales.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-foreground">
                  {p.apellido}, {p.nombre}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.matricula || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.especialidad || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
