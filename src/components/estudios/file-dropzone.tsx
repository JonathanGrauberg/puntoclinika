"use client";

import { useCallback, useState } from "react";
import { Upload, X, FileText, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  accept,
  archivo,
  onChange,
  disabled,
}: {
  accept?: string;
  archivo: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onChange(file);
    },
    [disabled, onChange]
  );

  if (archivo) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2.5">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {archivo.type.startsWith("image/") ? (
            <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm text-foreground">{archivo.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(archivo.size)}</span>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Quitar archivo"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center text-sm text-muted-foreground transition-colors",
        isDragging ? "border-foreground bg-muted/60" : "border-border hover:bg-muted/40",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <Upload className="h-5 w-5" />
      <span>
        <span className="font-semibold text-foreground">Hacé clic para elegir</span> o arrastrá un archivo acá
      </span>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
