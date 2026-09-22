"use client";

import { useRef, useState, useTransition } from "react";
import { crearPractica } from "@/lib/actions/practicas";

const inputClass =
  "h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-foreground";

export function PracticaQuickForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await crearPractica(formData);
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
      <input
        name="duracionMin"
        type="number"
        placeholder="Duración (min)"
        defaultValue={30}
        min={5}
        className={inputClass}
      />
      <input
        name="precioParticular"
        type="number"
        step="0.01"
        placeholder="Precio particular"
        min={0}
        required
        className={inputClass}
      />

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="requiereEstudio" className="h-4 w-4" />
        Requiere estudio adjunto
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="requiereAutorizacionOS" className="h-4 w-4" />
        Requiere autorización de obra social
      </label>

      {error && <p className="text-sm text-destructive sm:col-span-4">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:col-span-4 sm:w-fit"
      >
        {pending ? "Guardando..." : "Agregar práctica"}
      </button>
    </form>
  );
}
