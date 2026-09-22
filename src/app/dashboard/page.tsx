import { Shell } from "@/components/app-shell/shell";
import { CalendarDays, FileImage, Receipt, Users } from "lucide-react";
import { requireSessionWithModules, obtenerMiProfesionalId } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { permisosDe } from "@/lib/permissions";
import { listarFacturas } from "@/lib/actions/facturacion";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export default async function DashboardPage() {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const miProfesionalId = !permisos.verTodosLosTurnos
    ? await obtenerMiProfesionalId(session.userId, session.tenantId)
    : null;

  const [pacientesCount, turnosHoyCount, estudiosPendientesCount, facturas] = await Promise.all([
    withTenantContext(session.tenantId, (tx) => tx.paciente.count()),
    withTenantContext(session.tenantId, (tx) =>
      tx.turno.count({
        where: {
          fechaHora: { gte: hoy, lt: manana },
          estado: { not: "CANCELADO" },
          ...(miProfesionalId ? { profesionalId: miProfesionalId } : {}),
        },
      })
    ),
    withTenantContext(session.tenantId, (tx) => tx.estudio.count({ where: { estado: "PENDIENTE" } })),
    listarFacturas(inicioMes.toISOString().slice(0, 10)),
  ]);

  const facturadoMes = facturas.reduce((acc, f) => acc + Number(f.montoTotal), 0);

  const stats = [
    { label: "Pacientes activos", value: pacientesCount.toLocaleString("es-AR"), icon: Users },
    { label: "Turnos hoy", value: turnosHoyCount.toLocaleString("es-AR"), icon: CalendarDays },
    { label: "Estudios pendientes", value: estudiosPendientesCount.toLocaleString("es-AR"), icon: FileImage },
    { label: "Facturado este mes", value: currency.format(facturadoMes), icon: Receipt },
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
