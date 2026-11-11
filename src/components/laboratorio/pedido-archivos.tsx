"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Download, FileImage, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { sileo } from "sileo";
import {
  eliminarArchivoPedido,
  prepararSubidaArchivoPedido,
  registrarArchivoPedido,
  urlDescargaArchivoPedido,
} from "@/lib/actions/pedidos-laboratorio";
import { EXTENSIONES_ARCHIVO_PEDIDO, MAX_BYTES_ARCHIVO_PEDIDO, extensionDe, formatoBytes } from "@/lib/pedidos-lab";

interface Archivo {
  id: string;
  nombre: string;
  contentType: string;
  tamano: number;
  subidoPor: string;
  autorTipo: string;
  creadoEn: Date;
}

const ACEPTA = EXTENSIONES_ARCHIVO_PEDIDO.map((e) => `.${e}`).join(",");

function icono(nombre: string) {
  const e = extensionDe(nombre);
  if (["stl", "ply", "obj"].includes(e)) return Box;
  if (e === "pdf") return FileText;
  if (["jpg", "jpeg", "png", "webp", "heic"].includes(e)) return FileImage;
  return Paperclip;
}

/** PUT directo a R2 con progreso (fetch no informa el avance y un escaneo 3D puede tardar). */
function subir(url: string, archivo: File, tipo: string, onProgreso: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", tipo);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgreso(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("No se pudo subir")));
    xhr.onerror = () => reject(new Error("Se cortó la conexión al subir"));
    xhr.send(archivo);
  });
}

export function PedidoArchivos({
  pedidoId,
  archivos,
  puedeEditar,
}: {
  pedidoId: string;
  archivos: Archivo[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<{ nombre: string; pct: number } | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  async function elegidos(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES_ARCHIVO_PEDIDO) {
        sileo.error({ title: `${f.name} pesa más de 50 MB` });
        continue;
      }
      setSubiendo({ nombre: f.name, pct: 0 });
      try {
        const tipo = f.type || "application/octet-stream";
        const prep = await prepararSubidaArchivoPedido(pedidoId, f.name, tipo, f.size);
        if ("error" in prep) throw new Error(prep.error);
        await subir(prep.url, f, tipo, (pct) => setSubiendo({ nombre: f.name, pct }));
        const reg = await registrarArchivoPedido(pedidoId, prep.key, f.name, tipo);
        if (reg.error) throw new Error(reg.error);
        sileo.success({ title: `${f.name} subido` });
      } catch (e) {
        sileo.error({ title: e instanceof Error ? e.message : "No se pudo subir el archivo" });
      }
    }
    setSubiendo(null);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function descargar(id: string) {
    const r = await urlDescargaArchivoPedido(id);
    if ("error" in r) return void sileo.error({ title: r.error });
    const a = document.createElement("a");
    a.href = r.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }

  async function borrar(id: string) {
    const r = await eliminarArchivoPedido(id);
    if (r.error) return void sileo.error({ title: r.error });
    setConfirmando(null);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-muted-foreground">Archivos</h2>

      {archivos.length === 0 && !subiendo && (
        <p className="text-sm text-muted-foreground">
          Sin archivos. Podés subir fotos, el PDF de la receta o el escaneo 3D (STL, PLY, OBJ).
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {archivos.map((a) => {
          const Icono = icono(a.nombre);
          return (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
              <Icono className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base text-foreground">{a.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {formatoBytes(a.tamano)} · {a.subidoPor}
                  {a.autorTipo === "LABORATORIO" && " (laboratorio)"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => descargar(a.id)}
                aria-label={`Descargar ${a.nombre}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
              >
                <Download className="h-5 w-5" />
              </button>
              {puedeEditar &&
                (confirmando === a.id ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => borrar(a.id)}
                      className="h-10 rounded-lg bg-destructive px-3 text-sm font-semibold text-destructive-foreground"
                    >
                      Borrar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(null)}
                      className="h-10 rounded-lg border border-border px-3 text-sm font-semibold"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmando(a.id)}
                    aria-label={`Borrar ${a.nombre}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ))}
            </li>
          );
        })}
      </ul>

      {subiendo && (
        <div className="rounded-xl bg-muted px-4 py-3">
          <p className="truncate text-sm font-semibold text-foreground">Subiendo {subiendo.nombre}...</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full bg-primary transition-all" style={{ width: `${subiendo.pct}%` }} />
          </div>
        </div>
      )}

      {puedeEditar && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACEPTA}
            className="hidden"
            onChange={(e) => elegidos(e.target.files)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo !== null}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border text-base font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            <Upload className="h-5 w-5" />
            Subir archivos
          </button>
        </>
      )}
    </section>
  );
}
