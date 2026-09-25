import { redirect } from "next/navigation";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";
import { listarUsuarios } from "@/lib/actions/usuarios";
import { listarProfesionalesSinUsuario } from "@/lib/actions/profesionales";
import { UsuarioQuickForm } from "@/components/configuracion/usuario-quick-form";

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  SECRETARIA: "Secretaría",
  MEDICO: "Médico",
  AUDITOR: "Auditor",
};

export default async function UsuariosPage() {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    redirect("/dashboard");
  }

  const [usuarios, profesionalesSinUsuario] = await Promise.all([
    listarUsuarios(),
    listarProfesionalesSinUsuario(),
  ]);

  return (
    <>
      <PageTitle title="Usuarios" />
      <div className="mb-4 rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Agregar usuario</h2>
        <UsuarioQuickForm profesionalesSinUsuario={profesionalesSinUsuario} />
        <p className="mt-3 text-xs text-muted-foreground">
          Si el email ya existe en otro centro, se le agrega acceso acá con este rol (mismo login, sin
          pedir contraseña de nuevo).
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.membershipId} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-foreground">{u.nombre}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{ROL_LABEL[u.rol] ?? u.rol}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
