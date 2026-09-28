import { redirect } from "next/navigation";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarObrasSociales, toggleObraSocialActivo } from "@/lib/actions/obras-sociales";
import { ObraSocialQuickForm } from "@/components/configuracion/obra-social-quick-form";
import { ActivoToggle } from "@/components/configuracion/activo-toggle";

export default async function ObrasSocialesPage() {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    redirect("/dashboard");
  }
  const obrasSociales = await listarObrasSociales();

  return (
    <>
      <PageTitle title="Obras Sociales" />
      <div className="mb-4 rounded-md border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Principio básico — todavía en camino</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Por ahora esto cubre el catálogo de obras sociales del centro y la afiliación por paciente (en su
          ficha), más el número de autorización en el turno cuando la práctica lo requiere. La liquidación
          para cobrarle a cada obra social todavía no está — se suma más adelante.
        </p>
        <ObraSocialQuickForm />
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {obrasSociales.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                  Todavía no hay obras sociales cargadas.
                </td>
              </tr>
            )}
            {obrasSociales.map((o) => (
              <tr key={o.id} className={`border-b border-border last:border-0 ${!o.activo ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 text-foreground">{o.nombre}</td>
                <td className="px-4 py-3 text-right">
                  <ActivoToggle id={o.id} activo={o.activo} toggleAction={toggleObraSocialActivo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
