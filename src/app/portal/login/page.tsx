import Image from "next/image";
import { loginPortal } from "@/lib/actions/portal";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-2 flex justify-center">
          <Image
            src="/brand/logo-negro.png"
            alt=".clinika"
            width={930}
            height={230}
            priority
            className="h-7 w-auto dark:hidden"
          />
          <Image
            src="/brand/logo-blanco.png"
            alt=".clinika"
            width={930}
            height={230}
            priority
            className="hidden h-7 w-auto dark:block"
          />
        </div>
        <p className="mb-8 text-center text-sm text-muted-foreground">Portal del Paciente</p>

        <form action={loginPortal} className="flex flex-col gap-4 rounded-md border border-border p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-semibold text-foreground">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              required
              autoComplete="username"
              placeholder="Ej: j30111222"
              className="h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-foreground"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-foreground">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-foreground"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              Usuario o contraseña incorrectos.
            </p>
          )}

          <button
            type="submit"
            className="mt-2 h-11 rounded-md bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ingresar
          </button>

          <p className="text-center text-xs text-muted-foreground">
            El usuario y la contraseña te los entrega el centro médico.
          </p>
        </form>
      </div>
    </div>
  );
}
