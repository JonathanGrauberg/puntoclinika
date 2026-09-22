"use client";

import { useRef, useState, useTransition } from "react";
import { PacientePicker, type PacienteOption } from "@/components/pacientes/paciente-picker";
import { FileDropzone } from "./file-dropzone";
import { crearUrlSubida, crearEstudio } from "@/lib/actions/estudios";
import type { EstudioFormState } from "@/lib/actions/estudios";

interface PracticaOption {
  id: string;
  nombre: string;
}

const inputClass =
  "h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-foreground";
const labelClass = "text-sm font-semibold text-foreground";

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

export function EstudioUploadForm({
  pacientes,
  practicas,
}: {
  pacientes: PacienteOption[];
  practicas: PracticaOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<EstudioFormState>({});
  const [pacienteId, setPacienteId] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoInforme, setArchivoInforme] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState<"idle" | "subiendo" | "creando">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    if (!archivo) {
      setState({ error: "Elegí el archivo del estudio." });
      return;
    }
    setState({});

    startTransition(async () => {
      try {
        setSubiendo("subiendo");
        const key = await subirArchivo(archivo);
        const informeKey = archivoInforme ? await subirArchivo(archivoInforme) : "";

        setSubiendo("creando");
        formData.set("key", key);
        formData.set("informeKey", informeKey);
        const result = await crearEstudio(formData);
        if (result?.error) setState(result);
      } catch {
        setState({ error: "Falló la subida del archivo. Probá de nuevo." });
      } finally {
        setSubiendo("idle");
      }
    });
  }

  const pendiente = pending || subiendo !== "idle";

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-5">
      {state.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-foreground">{state.error}</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Paciente *</label>
        <PacientePicker name="pacienteId" pacientes={pacientes} value={pacienteId} onChange={setPacienteId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="practicaId" className={labelClass}>
          Práctica *
        </label>
        <select id="practicaId" name="practicaId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Seleccionar práctica
          </option>
          {practicas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="modalidad" className={labelClass}>
          Modalidad
        </label>
        <input id="modalidad" name="modalidad" placeholder="Ej: Radiografía, Ecografía..." className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Estudio (imagen o PDF) *</label>
        <FileDropzone accept="image/*,application/pdf" archivo={archivo} onChange={setArchivo} disabled={pendiente} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Informe adjunto (opcional)</label>
        <p className="text-xs text-muted-foreground">
          Si ya tenés un informe en PDF (de otro sistema, dictado, etc.). Si no, el médico puede escribirlo
          directamente acá cuando lo firme.
        </p>
        <FileDropzone
          accept="application/pdf"
          archivo={archivoInforme}
          onChange={setArchivoInforme}
          disabled={pendiente}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!pacienteId || !archivo || pendiente}
          className="h-11 rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {subiendo === "subiendo" ? "Subiendo archivo..." : subiendo === "creando" ? "Guardando..." : "Cargar estudio"}
        </button>
      </div>
    </form>
  );
}
