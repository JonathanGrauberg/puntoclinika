"use client";

import { useState, useTransition } from "react";
import { informarEstudio } from "@/lib/actions/estudios";
import type { EstudioFormState } from "@/lib/actions/estudios";

export function InformeForm({ estudioId }: { estudioId: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<EstudioFormState>({});

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await informarEstudio(estudioId, formData);
      if (result?.error) setState(result);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <textarea
        name="informeTexto"
        rows={6}
        required
        placeholder="Escribí el informe del estudio..."
        className="rounded-md border border-border bg-background px-3 py-2 text-[15px] text-foreground outline-none focus:border-foreground"
      />
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-11 w-fit rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Firmar informe"}
      </button>
    </form>
  );
}
