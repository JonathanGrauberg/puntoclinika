import Link from "next/link";
import { Shell } from "@/components/app-shell/shell";
import { requireSessionWithModules } from "@/lib/session";
import { listarProfesionales } from "@/lib/actions/profesionales";
import { listarPracticas } from "@/lib/actions/practicas";
import { listarPacientes } from "@/lib/actions/pacientes";
import { listarTurnosSemana } from "@/lib/actions/turnos";
import { ProfesionalSelector } from "@/components/turnos/profesional-selector";
import { TurnosAgenda } from "@/components/turnos/turnos-agenda";
import { getMonday, toISODate } from "@/lib/date-utils";

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ profesionalId?: string; week?: string }>;
}) {
  const session = await requireSessionWithModules();
  const { profesionalId: profesionalIdParam, week: weekParam } = await searchParams;

  const [profesionales, practicas] = await Promise.all([
    listarProfesionales(true),
    listarPracticas(true),
  ]);

  const shellProps = {
    tenantName: session.tenantName,
    userName: session.userName,
    enabledModules: session.enabledModules,
  };

  if (profesionales.length === 0) {
    return (
      <Shell title="Turnos" {...shellProps}>
        <EmptyState
          mensaje="Todavía no cargaste ningún profesional."
          href="/configuracion/profesionales"
          cta="Agregar profesional"
        />
      </Shell>
    );
  }
  if (practicas.length === 0) {
    return (
      <Shell title="Turnos" {...shellProps}>
        <EmptyState
          mensaje="Todavía no cargaste ninguna práctica — hace falta al menos una para poder dar turnos."
          href="/configuracion/practicas"
          cta="Agregar práctica"
        />
      </Shell>
    );
  }

  const profesionalId = profesionalIdParam ?? profesionales[0].id;
  const weekStart = weekParam ? new Date(`${weekParam}T00:00:00`) : getMonday(new Date());
  const weekStartISO = toISODate(weekStart);

  const [turnos, pacientes] = await Promise.all([
    listarTurnosSemana(profesionalId, weekStartISO),
    listarPacientes(),
  ]);

  return (
    <Shell title="Turnos" {...shellProps}>
      <div className="mb-4">
        <ProfesionalSelector profesionales={profesionales} value={profesionalId} week={weekStartISO} />
      </div>
      <TurnosAgenda
        weekStart={weekStart}
        profesionalId={profesionalId}
        turnos={turnos.map((t) => ({
          id: t.id,
          pacienteId: t.pacienteId,
          practicaId: t.practicaId,
          fechaHora: t.fechaHora,
          duracionMin: t.duracionMin,
          notas: t.notas,
          paciente: { nombre: t.paciente.nombre, apellido: t.paciente.apellido },
          practica: { nombre: t.practica.nombre },
        }))}
        pacientes={pacientes}
        practicas={practicas.map((p) => ({ id: p.id, nombre: p.nombre, duracionMin: p.duracionMin }))}
      />
    </Shell>
  );
}

function EmptyState({ mensaje, href, cta }: { mensaje: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-card p-10 text-center">
      <p className="text-sm text-muted-foreground">{mensaje}</p>
      <Link
        href={href}
        className="flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  );
}
