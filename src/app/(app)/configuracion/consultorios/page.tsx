import { redirect } from "next/navigation";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarConsultorios } from "@/lib/actions/consultorios";
import { ConsultorioQuickForm } from "@/components/configuracion/consultorio-quick-form";

export default async function ConsultoriosPage() {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    redirect("/dashboard");
  }
  const consultorios = await listarConsultorios();

  return (
    <>
      <PageTitle title="Consultorios" />
      <div className="mb-4 rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Agregar consultorio</h2>
        <ConsultorioQuickForm />
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Piso / ubicación</th>
            </tr>
          </thead>
          <tbody>
            {consultorios.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                  Todavía no hay consultorios cargados.
                </td>
              </tr>
            )}
            {consultorios.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-foreground">{c.nombre}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.piso || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
