"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { obtenerUrlDescarga } from "@/lib/actions/estudios";

function esImagen(key: string) {
  return /\.(png|jpe?g|gif|webp)$/i.test(key);
}
function esPdf(key: string) {
  return /\.pdf$/i.test(key);
}

export function EstudioViewer({
  estudioId,
  archivoKey,
  tipo = "estudio",
  alto = "70vh",
}: {
  estudioId: string;
  archivoKey: string;
  tipo?: "estudio" | "informe";
  alto?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    obtenerUrlDescarga(estudioId, tipo)
      .then(setUrl)
      .catch(() => setError(true));
  }, [estudioId, tipo]);

  if (error) {
    return <p className="text-sm text-destructive">No se pudo cargar el archivo.</p>;
  }

  if (!url) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {esImagen(archivoKey) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Estudio"
          style={{ maxHeight: alto }}
          className="w-full rounded-md border border-border object-contain"
        />
      )}
      {esPdf(archivoKey) && (
        <iframe src={url} title="Documento" style={{ height: alto }} className="w-full rounded-md border border-border" />
      )}
      {!esImagen(archivoKey) && !esPdf(archivoKey) && (
        <p className="text-sm text-muted-foreground">Vista previa no disponible para este tipo de archivo.</p>
      )}
      <a
        href={url}
        download
        className="flex h-10 w-fit items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
      >
        <Download className="h-4 w-4" />
        Descargar
      </a>
    </div>
  );
}
