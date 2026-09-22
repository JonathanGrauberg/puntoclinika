import { Shell } from "@/components/app-shell/shell";
import { CalendarDays, FileImage, Receipt, Users } from "lucide-react";

const stats = [
  { label: "Pacientes activos", value: "1.248", icon: Users, tint: "bg-primary/15 text-primary" },
  { label: "Turnos hoy", value: "32", icon: CalendarDays, tint: "bg-accent/15 text-accent" },
  { label: "Estudios pendientes", value: "7", icon: FileImage, tint: "bg-primary/15 text-primary" },
  { label: "Facturado este mes", value: "$1.840.500", icon: Receipt, tint: "bg-accent/15 text-accent" },
];

export default function DashboardPage() {
  return (
    <Shell
      title="Inicio"
      tenantName="Centro Demo"
      userName="Admin Demo"
      enabledModules={["PACIENTES", "TURNOS", "ESTUDIOS", "FACTURACION"]}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-bento"
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${stat.tint}`}>
              <stat.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-5 shadow-bento">
        <h2 className="text-base font-bold text-foreground">Próximos turnos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acá va a aparecer la agenda del día una vez que conectemos el módulo de Turnos.
        </p>
      </div>
    </Shell>
  );
}
