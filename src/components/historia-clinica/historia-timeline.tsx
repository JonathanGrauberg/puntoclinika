"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleVisibleEnPortal } from "@/lib/actions/historia-clinica";

const TIPO_LABEL: Record<string, string> = {
  NOTA: "Nota",
  DIAGNOSTICO: "Diagnóstico",
  INDICACION: "Indicación",
  RECETA: "Receta",
  ORDEN_MEDICA: "Orden médica",
};

const ES_DOCUMENTO = new Set(["RECETA", "ORDEN_MEDICA"]);

export interface EntradaTimeline {
  id: string;
  tipo: string;
  contenido: string;
  fecha: Date;
  visibleEnPortal: boolean;
  profesional: { nombre: string; apellido: string };
  shareUrl: string | null;
}

export function HistoriaTimeline({ entradas }: { entradas: EntradaTimeline[] }) {
  if (entradas.length === 0) {
    return (
      <p className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
        Todavía no hay entradas en la historia clínica de este paciente.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entradas.map((e) => (
        <EntradaCard key={e.id} entrada={e} />
      ))}
    </div>
  );
}

function EntradaCard({ entrada }: { entrada: EntradaTimeline }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [visible, setVisible] = useState(entrada.visibleEnPortal);

  function handleToggle() {
    startTransition(async () => {
      await toggleVisibleEnPortal(entrada.id, !visible);
      setVisible((v) => !v);
      router.refresh();
    });
  }

  const mensajeWhatsapp = encodeURIComponent(
    `Te comparto tu ${TIPO_LABEL[entrada.tipo].toLowerCase()}: ${entrada.shareUrl ?? ""}`
  );

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
            {TIPO_LABEL[entrada.tipo] ?? entrada.tipo}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(entrada.fecha).toLocaleString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="text-xs text-muted-foreground">
            — {entrada.profesional.apellido}, {entrada.profesional.nombre}
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          className={`h-7 rounded-md border px-2 text-xs font-semibold disabled:opacity-50 ${
            visible
              ? "border-success/40 text-success hover:bg-success/5"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {visible ? "Visible en portal" : "No visible en portal"}
        </button>
      </div>

      <p className="whitespace-pre-wrap text-sm text-foreground">{entrada.contenido}</p>

      {ES_DOCUMENTO.has(entrada.tipo) && entrada.shareUrl && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          <a
            href={entrada.shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 rounded-md border border-border px-3 text-xs font-semibold leading-8 text-foreground hover:bg-muted"
          >
            Ver / Imprimir
          </a>
          <a
            href={`https://wa.me/?text=${mensajeWhatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 rounded-md border border-border px-3 text-xs font-semibold leading-8 text-foreground hover:bg-muted"
          >
            Enviar por WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
