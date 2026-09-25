import Image from "next/image";
import Link from "next/link";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
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

        <form action={loginAction} className="flex flex-col gap-4 rounded-md border border-border p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-foreground"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">
                Contraseña
              </label>
              <Link href="/login/olvide-contrasena" className="text-xs text-muted-foreground underline underline-offset-2">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
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
              Email o contraseña incorrectos.
            </p>
          )}

          <button
            type="submit"
            className="mt-2 h-11 rounded-md bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
