import Link from "next/link";
import { Search, Upload } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarEstudios } from "@/lib/actions/estudios";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  INFORMADO: "Informado",
};

export default async function EstudiosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);
  const { q } = await searchParams;
  const estudios = await listarEstudios(q);

  return (
    <>
      <PageTitle title="Estudios" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, apellido o DNI..."
            className="h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-[15px] text-foreground outline-none focus:border-foreground"
          />
        </form>
        {permisos.gestionarEstudios && (
          <Link
            href="/estudios/nuevo"
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 text-[15px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <Upload className="h-4 w-4" />
            Nuevo estudio
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Paciente</th>
              <th className="px-4 py-3 font-semibold">Práctica</th>
              <th className="px-4 py-3 font-semibold">Modalidad</th>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {estudios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {q ? `No se encontraron estudios para "${q}".` : "Todavía no hay estudios cargados."}
                </td>
              </tr>
            )}
            {estudios.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/estudios/${e.id}`} className="font-medium text-foreground hover:underline">
                    {e.paciente.apellido}, {e.paciente.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{e.practica.nombre}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.modalidad || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(e.createdAt).toLocaleDateString("es-AR")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      e.estado === "INFORMADO"
                        ? "rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success"
                        : "rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                    }
                  >
                    {ESTADO_LABEL[e.estado] ?? e.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
