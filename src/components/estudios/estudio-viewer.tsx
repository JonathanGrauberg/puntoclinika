"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { obtenerUrlDescargaArchivo, obtenerUrlDescargaInformeArchivo } from "@/lib/actions/estudios";

function esImagen(key: string) {
  return /\.(png|jpe?g|gif|webp)$/i.test(key);
}
function esPdf(key: string) {
  return /\.pdf$/i.test(key);
}

function ArchivoPreview({ url, archivoKey, alto }: { url: string; archivoKey: string; alto: string }) {
  if (esImagen(archivoKey)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="Estudio" style={{ maxHeight: alto }} className="w-full rounded-md border border-border object-contain" />;
  }
  if (esPdf(archivoKey)) {
    return <iframe src={url} title="Documento" style={{ height: alto }} className="w-full rounded-md border border-border" />;
  }
  return <p className="text-sm text-muted-foreground">Vista previa no disponible para este tipo de archivo.</p>;
}

export interface ArchivoEstudio {
  id: string;
  key: string;
}

/** Galería genérica de archivos de un estudio (imágenes o informes, pueden ser varios). */
function ArchivosGallery({
  archivos,
  obtenerUrl,
  vacio,
}: {
  archivos: ArchivoEstudio[];
  obtenerUrl: (archivoId: string) => Promise<string>;
  vacio: string;
}) {
  const [activo, setActivo] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const archivoActivo = archivos[activo];

  useEffect(() => {
    if (!archivoActivo) return;
    setUrl(null);
    setError(false);
    obtenerUrl(archivoActivo.id)
      .then(setUrl)
      .catch(() => setError(true));
  }, [archivoActivo, obtenerUrl]);

  if (archivos.length === 0) {
    return <p className="text-sm text-muted-foreground">{vacio}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-destructive">No se pudo cargar el archivo.</p>}
      {!error && !url && (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {!error && url && archivoActivo && <ArchivoPreview url={url} archivoKey={archivoActivo.key} alto="60vh" />}

      {archivos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {archivos.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActivo(i)}
              className={`h-9 shrink-0 rounded-md border px-3 text-xs font-semibold transition-colors ${
                i === activo
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {url && (
        <a
          href={url}
          download
          className="flex h-10 w-fit items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Descargar
        </a>
      )}
    </div>
  );
}

/** Galería de las imágenes del estudio (suelen ser varias). */
export function EstudioGallery({ archivos }: { archivos: ArchivoEstudio[] }) {
  return (
    <ArchivosGallery
      archivos={archivos}
      obtenerUrl={obtenerUrlDescargaArchivo}
      vacio="Este estudio todavía no tiene imágenes cargadas."
    />
  );
}

/** Galería de los PDFs de informe adjuntos (puede haber más de uno). */
export function InformeGallery({ archivos }: { archivos: ArchivoEstudio[] }) {
  return (
    <ArchivosGallery
      archivos={archivos}
      obtenerUrl={obtenerUrlDescargaInformeArchivo}
      vacio="Este estudio todavía no tiene informes adjuntos."
    />
  );
}
