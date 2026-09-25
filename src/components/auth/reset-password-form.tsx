"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { restablecerPassword } from "@/lib/actions/password-reset";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [confirmacion, setConfirmacion] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col gap-4 rounded-md border border-border p-6">
        <p className="text-sm text-foreground">
          Este link no es válido. Pedí uno nuevo desde{" "}
          <Link href="/login/olvide-contrasena" className="underline underline-offset-2">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 rounded-md border border-border p-6">
        <p className="text-sm text-foreground">Listo, tu contraseña se actualizó.</p>
        <Link href="/login" className="text-center text-sm font-semibold text-foreground underline underline-offset-2">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  function handleSubmit(formData: FormData) {
    setError(undefined);
    const password = formData.get("password") as string;
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    formData.set("token", token);
    startTransition(async () => {
      const result = await restablecerPassword(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setDone(true);
        setTimeout(() => router.push("/login"), 2000);
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 rounded-md border border-border p-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-foreground">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-foreground"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmacion" className="text-sm font-semibold text-foreground">
          Confirmar contraseña
        </label>
        <input
          id="confirmacion"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          className="h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-foreground"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-11 rounded-md bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
