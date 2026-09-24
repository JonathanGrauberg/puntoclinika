"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { informarEstudio, crearUrlSubida } from "@/lib/actions/estudios";
import type { EstudioFormState } from "@/lib/actions/estudios";
import { FileDropzone } from "./file-dropzone";

interface Medicion {
  id: string;
  label: string;
  valor: string;
}

// Genéricas a propósito — sirven para cualquier especialidad como punto de
// partida. Cuando definamos plantillas por especialidad, esto es lo que se
// reemplaza/amplía (no la estructura del formulario, que queda igual).
const PLANTILLAS = [
  {
    nombre: "Sin hallazgos patológicos",
    hallazgos: "No se observan hallazgos patológicos significativos.",
    conclusion: "Estudio dentro de límites normales.",
  },
  {
    nombre: "Requiere correlación clínica",
    hallazgos: "Se observan hallazgos que requieren correlación con la clínica del paciente.",
    conclusion: "Se sugiere correlación clínica y eventual control evolutivo.",
  },
];

const inputClass =
  "h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-foreground";
const textareaClass =
  "rounded-md border border-border bg-background px-3 py-2 text-[15px] text-foreground outline-none focus:border-foreground";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

function nuevaMedicion(): Medicion {
  return { id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: "", valor: "" };
}

export function InformeForm({ estudioId }: { estudioId: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<EstudioFormState>({});
  const [archivoInforme, setArchivoInforme] = useState<File | null>(null);

  const [motivo, setMotivo] = useState("");
  const [hallazgos, setHallazgos] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [mediciones, setMediciones] = useState<Medicion[]>([]);

  function aplicarPlantilla(p: (typeof PLANTILLAS)[number]) {
    setHallazgos(p.hallazgos);
    setConclusion(p.conclusion);
  }

  function componerInforme() {
    const secciones = [
      motivo.trim() && `Motivo:\n${motivo.trim()}`,
      hallazgos.trim() && `Hallazgos:\n${hallazgos.trim()}`,
      mediciones.some((m) => m.label.trim() || m.valor.trim()) &&
        `Mediciones:\n${mediciones
          .filter((m) => m.label.trim() || m.valor.trim())
          .map((m) => `- ${m.label.trim() || "—"}: ${m.valor.trim() || "—"}`)
          .join("\n")}`,
      conclusion.trim() && `Conclusión:\n${conclusion.trim()}`,
    ].filter(Boolean);
    return secciones.join("\n\n");
  }

  function handleSubmit(formData: FormData) {
    const informeTexto = componerInforme();
    if (!informeTexto) {
      setState({ error: "Completá al menos los hallazgos o la conclusión." });
      return;
    }
    formData.set("informeTexto", informeTexto);

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
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {PLANTILLAS.map((p) => (
          <button
            key={p.nombre}
            type="button"
            onClick={() => aplicarPlantilla(p)}
            className="h-8 rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted"
          >
            {p.nombre}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Motivo (opcional)</label>
        <textarea
          rows={2}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className={textareaClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Hallazgos</label>
        <textarea
          rows={4}
          value={hallazgos}
          onChange={(e) => setHallazgos(e.target.value)}
          className={textareaClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className={labelClass}>Mediciones (opcional)</label>
          <button
            type="button"
            onClick={() => setMediciones((prev) => [...prev, nuevaMedicion()])}
            className="flex items-center gap-1 text-xs font-semibold text-foreground hover:opacity-70"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </button>
        </div>
        {mediciones.map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <input
              placeholder="Ej: Tamaño de lesión"
              value={m.label}
              onChange={(e) =>
                setMediciones((prev) => prev.map((x) => (x.id === m.id ? { ...x, label: e.target.value } : x)))
              }
              className={`${inputClass} flex-1`}
            />
            <input
              placeholder="Ej: 1.2 cm"
              value={m.valor}
              onChange={(e) =>
                setMediciones((prev) => prev.map((x) => (x.id === m.id ? { ...x, valor: e.target.value } : x)))
              }
              className={`${inputClass} w-32`}
            />
            <button
              type="button"
              onClick={() => setMediciones((prev) => prev.filter((x) => x.id !== m.id))}
              aria-label="Quitar medición"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Conclusión</label>
        <textarea
          rows={3}
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          className={textareaClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Adjuntar PDF (opcional)</label>
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
