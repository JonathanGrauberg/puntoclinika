import Link from "next/link";
import { CalendarDays, DoorOpen, Users } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { ActionCard } from "@/components/dashboard/action-card";
import { BuscadorPacientes } from "@/components/dashboard/buscador-pacientes";
import { AvisoDatosEjemplo, BotonCargarEjemplo } from "@/components/dashboard/demo-controles";
import { prisma } from "@/lib/prisma";
import { withTenantContext } from "@/lib/tenant-context";
import { permisosDe } from "@/lib/permissions";
import { obtenerMiProfesionalId, type ActiveSession } from "@/lib/session";
import { addDays, formatHoraArgentina, hoyArgentina } from "@/lib/date-utils";

const ESTADO_LABEL: Record<string, string> = {
  RESERVADO: "Reservado",
  CONFIRMADO: "Confirmado",
  EN_ESPERA: "En espera",
  EN_ATENCION: "En atención",
  ATENDIDO: "Atendido",
};

export async function DashboardDental({ session }: { session: ActiveSession }) {
  const permisos = permisosDe(session.rol);
  const hoy = hoyArgentina();
  const manana = addDays(hoy, 1);

  const miProfesionalId = !permisos.verTodosLosTurnos
    ? await obtenerMiProfesionalId(session.userId, session.tenantId)
    : null;
  const filtroProfesional = miProfesionalId ? { profesionalId: miProfesionalId } : {};

  const [[pacientesCount, hayDemo, turnos], tenant] = await Promise.all([
    withTenantContext(session.tenantId, (tx) =>
      Promise.all([
        tx.paciente.count(),
        tx.paciente.count({ where: { esDemo: true } }),
        tx.turno.findMany({
          where: { fechaHora: { gte: hoy, lt: manana }, estado: { not: "CANCELADO" }, ...filtroProfesional },
          include: { paciente: true, practica: true },
          orderBy: { fechaHora: "asc" },
          take: 12,
        }),
      ] as const)
    ),
    prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { trialHasta: true } }),
  ]);

  const diasPrueba = tenant?.trialHasta
    ? Math.ceil((tenant.trialHasta.getTime() - Date.now()) / 86_400_000)
    : null;
  const nombre = session.userName.split(" ")[0];
  const enEspera = turnos.filter((t) => t.estado === "EN_ESPERA").length;

  return (
    <>
      <PageTitle title="Inicio" />
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-foreground">Hola, {nombre}</h2>
          {diasPrueba !== null && diasPrueba > 0 && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              Prueba gratis: te quedan {diasPrueba} {diasPrueba === 1 ? "día" : "días"}
            </span>
          )}
        </div>

        <BuscadorPacientes puedeCrear={permisos.gestionarPacientes} />

        {hayDemo > 0 && permisos.gestionarConfiguracion && <AvisoDatosEjemplo />}

        {pacientesCount === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold text-foreground">Todavía no tenés pacientes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Empezá agregando el primero con el botón de arriba, o mirá cómo funciona con datos de ejemplo.
              </p>
            </div>
            {permisos.gestionarConfiguracion && <BotonCargarEjemplo />}
          </div>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Turnos de hoy</h2>
              <Link href="/turnos" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                Ver agenda
              </Link>
            </div>
            {turnos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay turnos para hoy.{" "}
                <Link href="/turnos" className="font-semibold text-foreground underline underline-offset-2">
                  Agendar uno
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {turnos.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/pacientes/${t.pacienteId}`}
                      className="flex items-center justify-between gap-3 py-3 hover:opacity-80"
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-14 shrink-0 text-base font-bold text-foreground">
                          {formatHoraArgentina(t.fechaHora)}
                        </span>
                        <div>
                          <p className="text-base font-semibold text-foreground">
                            {t.paciente.apellido}, {t.paciente.nombre}
                          </p>
                          <p className="text-sm text-muted-foreground">{t.practica.nombre}</p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          t.estado === "EN_ESPERA"
                            ? "bg-success/15 text-success"
                            : t.estado === "EN_ATENCION"
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ESTADO_LABEL[t.estado] ?? t.estado}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <ActionCard href="/turnos" label="Agenda" descripcion="Turnos de la semana" icon={CalendarDays} />
          <ActionCard href="/pacientes" label="Pacientes" descripcion="Ver todos y buscar" icon={Users} />
          {permisos.gestionarTurnos && (
            <ActionCard
              href="/sala-espera"
              label="Sala de espera"
              descripcion="Quién llegó"
              icon={DoorOpen}
              badge={enEspera}
            />
          )}
        </div>
      </div>
    </>
  );
}
