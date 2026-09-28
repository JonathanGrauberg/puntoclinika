"use client";

import { useRef, useState, useTransition } from "react";
import { cambiarMiPassword } from "@/lib/actions/perfil";

const inputClass =
  "h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-foreground";
const labelClass = "text-sm font-semibold text-foreground";

export function CambiarPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(undefined);
    setOk(false);
    startTransition(async () => {
      const result = await cambiarMiPassword(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOk(true);
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="passwordActual" className={labelClass}>
          Contraseña actual
        </label>
        <input
          id="passwordActual"
          name="passwordActual"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="passwordNueva" className={labelClass}>
          Contraseña nueva
        </label>
        <input
          id="passwordNueva"
          name="passwordNueva"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {ok && <p className="text-sm text-success">Contraseña actualizada.</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-fit rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
