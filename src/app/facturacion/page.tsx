import Link from "next/link";
import { Plus } from "lucide-react";
import { Shell } from "@/components/app-shell/shell";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarFacturas } from "@/lib/actions/facturacion";
import { METODO_PAGO_LABEL } from "@/lib/metodos-pago";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export default async function FacturacionPage() {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);
  const facturas = await listarFacturas();

  const total = facturas.reduce((acc, f) => acc + Number(f.montoTotal), 0);

  return (
    <Shell
      title="Facturación"
      tenantName={session.tenantName}
      userName={session.userName}
      rol={session.rol}
      enabledModules={session.enabledModules}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-md border border-border bg-card px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {permisos.verTodaFacturacion ? "Total cobrado" : "Total cobrado (tus turnos)"}
          </p>
          <p className="text-xl font-bold text-foreground">{currency.format(total)}</p>
        </div>
        {permisos.gestionarFacturacion && (
          <Link
            href="/facturacion/nuevo"
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 text-[15px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nuevo cobro
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Paciente</th>
              <th className="px-4 py-3 font-semibold">Profesional</th>
              <th className="px-4 py-3 font-semibold">Práctica</th>
              <th className="px-4 py-3 font-semibold">Método</th>
              <th className="px-4 py-3 font-semibold text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {facturas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Todavía no hay cobros registrados.
                </td>
              </tr>
            )}
            {facturas.map((f) => (
              <tr key={f.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(f.createdAt).toLocaleDateString("es-AR")}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {f.paciente.apellido}, {f.paciente.nombre}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {f.turno ? `${f.turno.profesional.apellido}, ${f.turno.profesional.nombre}` : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{f.turno?.practica.nombre ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {f.pagos
                    .map((p) => METODO_PAGO_LABEL[p.metodo as keyof typeof METODO_PAGO_LABEL] ?? p.metodo)
                    .join(", ")}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-foreground">
                  {currency.format(Number(f.montoTotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
