import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSession } from "@/lib/session";
import { CambiarPasswordForm } from "@/components/configuracion/cambiar-password-form";

export default async function PerfilPage() {
  const session = await requireSession();

  return (
    <>
      <PageTitle title="Mi perfil" />
      <div className="flex max-w-3xl flex-col gap-4">
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Datos</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="text-foreground">{session.userName}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Centro activo</dt>
              <dd className="text-foreground">{session.tenantName}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Cambiar contraseña</h2>
          <CambiarPasswordForm />
        </div>
      </div>
    </>
  );
}
