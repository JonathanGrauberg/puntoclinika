"use client";

import { useCallback, useState } from "react";
import { Upload, X, ImageIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MultiFileDropzone({
  accept,
  archivos,
  onChange,
  disabled,
}: {
  accept?: string;
  archivos: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const agregar = useCallback(
    (nuevos: FileList | File[]) => {
      onChange([...archivos, ...Array.from(nuevos)]);
    },
    [archivos, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      if (e.dataTransfer.files.length) agregar(e.dataTransfer.files);
    },
    [disabled, agregar]
  );

  function quitar(index: number) {
    onChange(archivos.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      {archivos.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {archivos.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                {f.type.startsWith("image/") ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate text-sm text-foreground">{f.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(f.size)}</span>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => quitar(i)}
                  aria-label={`Quitar ${f.name}`}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-center text-sm text-muted-foreground transition-colors",
          isDragging ? "border-foreground bg-muted/60" : "border-border hover:bg-muted/40",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <Upload className="h-5 w-5" />
        <span>
          <span className="font-semibold text-foreground">Hacé clic para elegir</span> o arrastrá uno o
          varios archivos
        </span>
        <input
          type="file"
          accept={accept}
          multiple
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) agregar(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
