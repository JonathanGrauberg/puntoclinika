"use client";

import { useRef, useState, useTransition } from "react";
import { crearProfesional } from "@/lib/actions/profesionales";

const inputClass =
  "h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-foreground";

export function ProfesionalQuickForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await crearProfesional(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <input name="nombre" placeholder="Nombre *" required className={inputClass} />
      <input name="apellido" placeholder="Apellido *" required className={inputClass} />
      <input name="matricula" placeholder="Matrícula" className={inputClass} />
      <input name="especialidad" placeholder="Especialidad" className={inputClass} />
      {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:col-span-2 sm:w-fit"
      >
        {pending ? "Guardando..." : "Agregar profesional"}
      </button>
    </form>
  );
}
