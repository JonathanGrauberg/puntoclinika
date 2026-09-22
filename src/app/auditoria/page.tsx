import { redirect } from "next/navigation";
import { Shell } from "@/components/app-shell/shell";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarAuditoria } from "@/lib/actions/auditoria";

const ACCION_LABEL: Record<string, string> = {
  CREATE: "Creó",
  UPDATE: "Editó",
  DELETE: "Eliminó",
  VIEW: "Vio",
};

const ENTIDAD_LABEL: Record<string, string> = {
  Paciente: "un paciente",
  Turno: "un turno",
  Profesional: "un profesional",
  Practica: "una práctica",
  Membership: "un usuario",
};

export default async function AuditoriaPage() {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).verAuditoria) {
    redirect("/dashboard");
  }
  const entradas = await listarAuditoria();

  return (
    <Shell
      title="Auditoría"
      tenantName={session.tenantName}
      userName={session.userName}
      rol={session.rol}
      enabledModules={session.enabledModules}
    >
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Usuario</th>
              <th className="px-4 py-3 font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody>
            {entradas.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  Todavía no hay actividad registrada.
                </td>
              </tr>
            )}
            {entradas.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-foreground">{e.usuario}</td>
                <td className="px-4 py-3 text-foreground">
                  {ACCION_LABEL[e.accion] ?? e.accion} {ENTIDAD_LABEL[e.entidad] ?? e.entidad}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
