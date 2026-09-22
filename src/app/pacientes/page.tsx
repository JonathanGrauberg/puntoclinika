import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { Shell } from "@/components/app-shell/shell";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarPacientes } from "@/lib/actions/pacientes";

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);
  const { q } = await searchParams;
  const pacientes = await listarPacientes(q);

  return (
    <Shell
      title="Pacientes"
      tenantName={session.tenantName}
      userName={session.userName}
      rol={session.rol}
      enabledModules={session.enabledModules}
    >
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
        {permisos.gestionarPacientes && (
          <Link
            href="/pacientes/nuevo"
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 text-[15px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo paciente
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">DNI</th>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Teléfono</th>
              <th className="px-4 py-3 font-semibold">Obra social</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  {q ? `No se encontraron pacientes para "${q}".` : "Todavía no hay pacientes cargados."}
                </td>
              </tr>
            )}
            {pacientes.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/pacientes/${p.id}`} className="font-medium text-foreground hover:underline">
                    {p.dni}
                  </Link>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {p.apellido}, {p.nombre}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.telefono || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.obraSocialTexto || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
