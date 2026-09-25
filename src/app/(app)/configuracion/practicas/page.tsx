import { redirect } from "next/navigation";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarPracticas } from "@/lib/actions/practicas";
import { PracticaQuickForm } from "@/components/configuracion/practica-quick-form";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export default async function PracticasPage() {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    redirect("/dashboard");
  }
  const practicas = await listarPracticas();

  return (
    <>
      <PageTitle title="Prácticas" />
      <div className="mb-4 rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Agregar práctica</h2>
        <PracticaQuickForm />
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Duración</th>
              <th className="px-4 py-3 font-semibold">Precio particular</th>
            </tr>
          </thead>
          <tbody>
            {practicas.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  Todavía no hay prácticas cargadas.
                </td>
              </tr>
            )}
            {practicas.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-foreground">{p.nombre}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.duracionMin} min</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {currency.format(Number(p.precioParticular))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
