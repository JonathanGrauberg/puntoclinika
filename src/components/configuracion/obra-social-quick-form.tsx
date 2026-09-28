"use client";

import { useRef, useState, useTransition } from "react";
import { crearObraSocial } from "@/lib/actions/obras-sociales";

const inputClass =
  "h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-foreground";

export function ObraSocialQuickForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await crearObraSocial(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-wrap gap-3">
      <input name="nombre" placeholder="Nombre *" required className={`${inputClass} min-w-64 flex-1`} />
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Agregar obra social"}
      </button>
    </form>
  );
}
