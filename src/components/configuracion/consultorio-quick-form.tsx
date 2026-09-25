"use client";

import { useRef, useState, useTransition } from "react";
import { crearConsultorio } from "@/lib/actions/consultorios";

const inputClass =
  "h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-foreground";

export function ConsultorioQuickForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await crearConsultorio(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-3 sm:grid-cols-4">
      <input name="nombre" placeholder="Nombre *" required className={`${inputClass} sm:col-span-2`} />
      <input name="piso" placeholder="Piso / ubicación" className={`${inputClass} sm:col-span-2`} />

      {error && <p className="text-sm text-destructive sm:col-span-4">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:col-span-4 sm:w-fit"
      >
        {pending ? "Guardando..." : "Agregar consultorio"}
      </button>
    </form>
  );
}
