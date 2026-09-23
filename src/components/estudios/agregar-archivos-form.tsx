"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MultiFileDropzone } from "./multi-file-dropzone";
import { crearUrlSubida, agregarArchivosEstudio } from "@/lib/actions/estudios";

async function subirArchivo(archivo: File) {
  const { key, url } = await crearUrlSubida(archivo.name, archivo.type || "application/octet-stream");
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": archivo.type || "application/octet-stream" },
    body: archivo,
  });
  if (!res.ok) throw new Error("No se pudo subir el archivo");
  return key;
}

export function AgregarArchivosForm({ estudioId }: { estudioId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string>();

  function handleSubmit() {
    if (archivos.length === 0) return;
    setError(undefined);
    startTransition(async () => {
      try {
        const keys = await Promise.all(archivos.map(subirArchivo));
        const result = await agregarArchivosEstudio(estudioId, keys);
        if (result?.error) {
          setError(result.error);
        } else {
          setArchivos([]);
          router.refresh();
        }
      } catch {
        setError("Falló la subida. Probá de nuevo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <MultiFileDropzone accept="image/*,application/pdf" archivos={archivos} onChange={setArchivos} disabled={pending} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={archivos.length === 0 || pending}
        className="h-10 w-fit rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Subiendo..." : "Agregar al estudio"}
      </button>
    </div>
  );
}
