"use client";

import { useState, useTransition } from "react";
import { informarEstudio, crearUrlSubida } from "@/lib/actions/estudios";
import type { EstudioFormState } from "@/lib/actions/estudios";
import { FileDropzone } from "./file-dropzone";

export function InformeForm({ estudioId }: { estudioId: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<EstudioFormState>({});
  const [archivoInforme, setArchivoInforme] = useState<File | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (archivoInforme) {
          const { key, url } = await crearUrlSubida(
            archivoInforme.name,
            archivoInforme.type || "application/octet-stream"
          );
          const res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": archivoInforme.type || "application/octet-stream" },
            body: archivoInforme,
          });
          if (!res.ok) throw new Error();
          formData.set("informeKey", key);
        }
        const result = await informarEstudio(estudioId, formData);
        if (result?.error) setState(result);
      } catch {
        setState({ error: "Falló la subida del archivo. Probá de nuevo." });
      }
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
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Adjuntar PDF (opcional)</label>
        <FileDropzone
          accept="application/pdf"
          archivo={archivoInforme}
          onChange={setArchivoInforme}
          disabled={pending}
        />
      </div>
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
