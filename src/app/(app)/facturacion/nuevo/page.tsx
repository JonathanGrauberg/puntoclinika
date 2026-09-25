import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarTurnosParaCobrar } from "@/lib/actions/facturacion";
import { TurnosParaCobrar } from "@/components/facturacion/turnos-para-cobrar";
import { addDays, toISODate } from "@/lib/date-utils";

export default async function NuevoCobroPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).gestionarFacturacion) {
    redirect("/facturacion");
  }

  const { fecha: fechaParam } = await searchParams;
  const fecha = fechaParam ? new Date(`${fechaParam}T00:00:00`) : new Date();
  const fechaISO = toISODate(fecha);

  const turnos = await listarTurnosParaCobrar(fechaISO);

  return (
    <>
      <PageTitle title="Nuevo cobro" />
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={`?fecha=${toISODate(addDays(fecha, -1))}`}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
          aria-label="Día anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={`?fecha=${toISODate(addDays(fecha, 1))}`}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
          aria-label="Día siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
        <span className="ml-2 text-sm font-semibold text-foreground">
          {fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>

      <TurnosParaCobrar
        turnos={turnos.map((t) => ({
          id: t.id,
          fechaHora: t.fechaHora,
          paciente: { nombre: t.paciente.nombre, apellido: t.paciente.apellido },
          profesional: { nombre: t.profesional.nombre, apellido: t.profesional.apellido },
          practica: { nombre: t.practica.nombre, precioParticular: Number(t.practica.precioParticular) },
        }))}
      />
    </>
  );
}
