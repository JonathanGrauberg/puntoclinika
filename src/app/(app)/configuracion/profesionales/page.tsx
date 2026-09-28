import { redirect } from "next/navigation";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarProfesionales, toggleProfesionalActivo } from "@/lib/actions/profesionales";
import { ProfesionalQuickForm } from "@/components/configuracion/profesional-quick-form";
import { ActivoToggle } from "@/components/configuracion/activo-toggle";

export default async function ProfesionalesPage() {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    redirect("/dashboard");
  }
  const profesionales = await listarProfesionales();

  return (
    <>
      <PageTitle title="Profesionales" />
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
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {profesionales.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Todavía no hay profesionales cargados.
                </td>
              </tr>
            )}
            {profesionales.map((p) => (
              <tr key={p.id} className={`border-b border-border last:border-0 ${!p.activo ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 text-foreground">
                  {p.apellido}, {p.nombre}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.matricula || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.especialidad || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <ActivoToggle id={p.id} activo={p.activo} toggleAction={toggleProfesionalActivo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
