import Link from "next/link";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSessionWithModules, obtenerMiProfesionalId } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarProfesionales } from "@/lib/actions/profesionales";
import { listarPracticas } from "@/lib/actions/practicas";
import { listarPacientes } from "@/lib/actions/pacientes";
import { listarConsultorios } from "@/lib/actions/consultorios";
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
  const permisos = permisosDe(session.rol);
  const { profesionalId: profesionalIdParam, week: weekParam } = await searchParams;

  const [profesionales, practicas] = await Promise.all([
    listarProfesionales(true),
    listarPracticas(true),
  ]);

  if (profesionales.length === 0) {
    return (
      <>
        <PageTitle title="Turnos" />
        <EmptyState
          mensaje="Todavía no cargaste ningún profesional."
          href="/configuracion/profesionales"
          cta="Agregar profesional"
        />
      </>
    );
  }
  if (practicas.length === 0) {
    return (
      <>
        <PageTitle title="Turnos" />
        <EmptyState
          mensaje="Todavía no cargaste ninguna práctica — hace falta al menos una para poder dar turnos."
          href="/configuracion/practicas"
          cta="Agregar práctica"
        />
      </>
    );
  }

  let profesionalId: string;
  if (permisos.verTodosLosTurnos) {
    profesionalId = profesionalIdParam ?? profesionales[0].id;
  } else {
    // MEDICO: agenda fija a su propio profesional, no elige.
    const miId = await obtenerMiProfesionalId(session.userId, session.tenantId);
    if (!miId) {
      return (
        <>
          <PageTitle title="Turnos" />
          <EmptyState
            mensaje="Tu usuario todavía no está vinculado a un profesional. Pedile a un administrador que te vincule desde Configuración → Usuarios."
            href="/dashboard"
            cta="Volver al inicio"
          />
        </>
      );
    }
    profesionalId = miId;
  }

  const weekStart = weekParam ? new Date(`${weekParam}T00:00:00`) : getMonday(new Date());
  const weekStartISO = toISODate(weekStart);

  const [turnos, pacientes, consultorios] = await Promise.all([
    listarTurnosSemana(profesionalId, weekStartISO),
    listarPacientes(),
    listarConsultorios(true),
  ]);

  return (
    <>
      <PageTitle title="Turnos" />
      {permisos.verTodosLosTurnos && (
        <div className="mb-4">
          <ProfesionalSelector profesionales={profesionales} value={profesionalId} week={weekStartISO} />
        </div>
      )}
      <TurnosAgenda
        weekStart={weekStart}
        profesionalId={profesionalId}
        turnos={turnos.map((t) => ({
          id: t.id,
          pacienteId: t.pacienteId,
          practicaId: t.practicaId,
          consultorioId: t.consultorioId,
          fechaHora: t.fechaHora,
          duracionMin: t.duracionMin,
          estado: t.estado,
          notas: t.notas,
          paciente: { nombre: t.paciente.nombre, apellido: t.paciente.apellido },
          practica: { nombre: t.practica.nombre },
        }))}
        pacientes={pacientes}
        practicas={practicas.map((p) => ({ id: p.id, nombre: p.nombre, duracionMin: p.duracionMin }))}
        consultorios={consultorios.map((c) => ({ id: c.id, nombre: c.nombre }))}
        puedeGestionar={permisos.gestionarTurnos}
      />
    </>
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
