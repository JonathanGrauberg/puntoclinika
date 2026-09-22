import { Shell } from "@/components/app-shell/shell";
import { CalendarDays, FileImage, Receipt, Users } from "lucide-react";
import { requireSessionWithModules } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";

export default async function DashboardPage() {
  const session = await requireSessionWithModules();
  const pacientesCount = await withTenantContext(session.tenantId, (tx) => tx.paciente.count());

  const stats = [
    { label: "Pacientes activos", value: pacientesCount.toLocaleString("es-AR"), icon: Users },
    { label: "Turnos hoy", value: "—", icon: CalendarDays },
    { label: "Estudios pendientes", value: "—", icon: FileImage },
    { label: "Facturado este mes", value: "—", icon: Receipt },
  ];

  return (
    <Shell
      title="Inicio"
      tenantName={session.tenantName}
      userName={session.userName}
      rol={session.rol}
      enabledModules={session.enabledModules}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground">
              <stat.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-border bg-card p-5">
        <h2 className="text-base font-bold text-foreground">Próximos turnos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acá va a aparecer la agenda del día una vez que conectemos el módulo de Turnos.
        </p>
      </div>
    </Shell>
  );
}
