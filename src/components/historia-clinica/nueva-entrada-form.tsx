"use client";

import { useState, useTransition } from "react";
import { sileo } from "sileo";
import { crearEntradaHistoriaClinica } from "@/lib/actions/historia-clinica";
import type { EntradaFormState } from "@/lib/actions/historia-clinica";

const inputClass =
  "h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-foreground";
const textareaClass =
  "rounded-md border border-border bg-background px-3 py-2 text-[15px] text-foreground outline-none focus:border-foreground";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

type Tipo = "NOTA" | "DIAGNOSTICO" | "INDICACION" | "RECETA" | "ORDEN_MEDICA";

const TIPO_LABEL: Record<Tipo, string> = {
  NOTA: "Nota",
  DIAGNOSTICO: "Diagnóstico",
  INDICACION: "Indicación",
  RECETA: "Receta",
  ORDEN_MEDICA: "Orden médica",
};

export function NuevaEntradaForm({ pacienteId }: { pacienteId: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<EntradaFormState>({});
  const [tipo, setTipo] = useState<Tipo>("NOTA");

  // Un estado por tipo simple (no uno compartido) — si no, cambiar de
  // pestaña "arrastraba" lo escrito en la anterior.
  const [notaTexto, setNotaTexto] = useState("");
  const [diagnosticoTexto, setDiagnosticoTexto] = useState("");
  const [indicacionTexto, setIndicacionTexto] = useState("");
  const [medicacion, setMedicacion] = useState("");
  const [dosis, setDosis] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [diagnosticoReceta, setDiagnosticoReceta] = useState("");
  const [practicaSolicitada, setPracticaSolicitada] = useState("");
  const [motivo, setMotivo] = useState("");

  const SIMPLE_STATE: Record<"NOTA" | "DIAGNOSTICO" | "INDICACION", [string, (v: string) => void]> = {
    NOTA: [notaTexto, setNotaTexto],
    DIAGNOSTICO: [diagnosticoTexto, setDiagnosticoTexto],
    INDICACION: [indicacionTexto, setIndicacionTexto],
  };

  function limpiar() {
    setNotaTexto("");
    setDiagnosticoTexto("");
    setIndicacionTexto("");
    setMedicacion("");
    setDosis("");
    setCantidad("");
    setDiagnosticoReceta("");
    setPracticaSolicitada("");
    setMotivo("");
  }

  function componerContenido(): string | null {
    if (tipo === "RECETA") {
      if (!medicacion.trim()) return null;
      return [
        `Medicación: ${medicacion.trim()}`,
        dosis.trim() && `Dosis: ${dosis.trim()}`,
        cantidad.trim() && `Cantidad: ${cantidad.trim()}`,
        diagnosticoReceta.trim() && `Diagnóstico: ${diagnosticoReceta.trim()}`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (tipo === "ORDEN_MEDICA") {
      if (!practicaSolicitada.trim()) return null;
      return [`Solicito: ${practicaSolicitada.trim()}`, motivo.trim() && `Motivo: ${motivo.trim()}`]
        .filter(Boolean)
        .join("\n");
    }
    return SIMPLE_STATE[tipo as "NOTA" | "DIAGNOSTICO" | "INDICACION"][0].trim() || null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const contenido = componerContenido();
    if (!contenido) {
      setState({ error: "Completá el contenido." });
      return;
    }
    setState({});

    const formData = new FormData();
    formData.set("pacienteId", pacienteId);
    formData.set("tipo", tipo);
    formData.set("contenido", contenido);

    startTransition(async () => {
      const result = await crearEntradaHistoriaClinica(formData);
      if (result?.error) {
        setState(result);
      } else {
        limpiar();
        sileo.success({ title: `${TIPO_LABEL[tipo]} agregada` });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(TIPO_LABEL) as Tipo[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`h-8 rounded-full border px-3 text-xs font-semibold transition-colors ${
              tipo === t
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            {TIPO_LABEL[t]}
          </button>
        ))}
      </div>

      {tipo === "RECETA" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className={labelClass}>Medicación *</label>
            <input
              value={medicacion}
              onChange={(e) => setMedicacion(e.target.value)}
              placeholder="Ej: Amoxicilina 500mg"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Dosis</label>
            <input
              value={dosis}
              onChange={(e) => setDosis(e.target.value)}
              placeholder="Ej: cada 8hs por 7 días"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Cantidad</label>
            <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className={labelClass}>Diagnóstico</label>
            <input
              value={diagnosticoReceta}
              onChange={(e) => setDiagnosticoReceta(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      ) : tipo === "ORDEN_MEDICA" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Solicito *</label>
            <input
              value={practicaSolicitada}
              onChange={(e) => setPracticaSolicitada(e.target.value)}
              placeholder="Ej: Laboratorio de rutina, Rx tórax..."
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Motivo</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              className={textareaClass}
            />
          </div>
        </div>
      ) : (
        <textarea
          value={SIMPLE_STATE[tipo as "NOTA" | "DIAGNOSTICO" | "INDICACION"][0]}
          onChange={(e) => SIMPLE_STATE[tipo as "NOTA" | "DIAGNOSTICO" | "INDICACION"][1](e.target.value)}
          rows={3}
          placeholder={
            tipo === "NOTA" ? "Nota de la consulta..." : tipo === "DIAGNOSTICO" ? "Diagnóstico..." : "Indicación..."
          }
          className={textareaClass}
        />
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-10 w-fit rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Guardando..." : `Agregar ${TIPO_LABEL[tipo].toLowerCase()}`}
      </button>
    </form>
  );
}
