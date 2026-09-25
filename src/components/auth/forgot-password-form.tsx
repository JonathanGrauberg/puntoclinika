"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { pedirResetPassword } from "@/lib/actions/password-reset";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string>();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await pedirResetPassword(formData);
      setMensaje(result.message);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 rounded-md border border-border p-6">
      <p className="text-sm text-muted-foreground">
        Ingresá el email con el que iniciás sesión y te mandamos un link para elegir una contraseña nueva.
      </p>

      {mensaje ? (
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">{mensaje}</p>
      ) : (
        <>
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
          <button
            type="submit"
            disabled={pending}
            className="mt-2 h-11 rounded-md bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Enviando..." : "Enviar link"}
          </button>
        </>
      )}

      <Link href="/login" className="text-center text-sm text-muted-foreground underline underline-offset-2">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
