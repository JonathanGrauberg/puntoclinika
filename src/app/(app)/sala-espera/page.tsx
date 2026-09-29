import { redirect } from "next/navigation";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarProfesionales } from "@/lib/actions/profesionales";
import { listarSalaDeEspera } from "@/lib/actions/turnos";
import { SalaEsperaSelector } from "@/components/turnos/sala-espera-selector";
import { SalaEsperaLista } from "@/components/turnos/sala-espera-lista";

export default async function SalaDeEsperaPage({
  searchParams,
}: {
  searchParams: Promise<{ profesionalId?: string }>;
}) {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);
  if (!permisos.gestionarTurnos) {
    redirect("/dashboard");
  }

  const { profesionalId } = await searchParams;
  const profesionales = permisos.verTodosLosTurnos ? await listarProfesionales(true) : [];
  const turnos = await listarSalaDeEspera(profesionalId);

  return (
    <>
      <PageTitle title="En sala" />
      {permisos.verTodosLosTurnos && (
        <div className="mb-4">
          <SalaEsperaSelector profesionales={profesionales} value={profesionalId ?? ""} />
        </div>
      )}
      <SalaEsperaLista
        turnos={turnos.map((t) => ({
          id: t.id,
          pacienteId: t.pacienteId,
          fechaHora: t.fechaHora,
          estado: t.estado,
          paciente: { nombre: t.paciente.nombre, apellido: t.paciente.apellido },
          profesional: { nombre: t.profesional.nombre, apellido: t.profesional.apellido },
          practica: { nombre: t.practica.nombre },
          consultorio: t.consultorio ? { nombre: t.consultorio.nombre } : null,
        }))}
      />
    </>
  );
}
