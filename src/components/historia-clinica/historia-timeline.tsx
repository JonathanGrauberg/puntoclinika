"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toggleVisibleEnPortal } from "@/lib/actions/historia-clinica";
import { toISODate, formatFechaArgentina } from "@/lib/date-utils";

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

interface Visita {
  diaISO: string;
  entradas: EntradaTimeline[];
}

// Agrupa por día de calendario (Argentina) — una consulta suele generar
// varias entradas (nota + receta + indicación...) y mostrarlas todas
// sueltas en una lista larga era imposible de leer para un paciente con
// varias visitas en el año. Cada visita queda como una tarjeta, colapsada
// salvo la más reciente.
function agruparPorVisita(entradas: EntradaTimeline[]): Visita[] {
  const porDia = new Map<string, EntradaTimeline[]>();
  for (const e of entradas) {
    const dia = toISODate(new Date(e.fecha));
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia)!.push(e);
  }
  return Array.from(porDia.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([diaISO, entradas]) => ({ diaISO, entradas }));
}

export function HistoriaTimeline({ entradas }: { entradas: EntradaTimeline[] }) {
  const visitas = agruparPorVisita(entradas);

  if (visitas.length === 0) {
    return (
      <p className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
        Todavía no hay entradas en la historia clínica de este paciente.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {visitas.map((v, i) => (
        <VisitaCard key={v.diaISO} visita={v} abiertaPorDefault={i === 0} />
      ))}
    </div>
  );
}

function VisitaCard({ visita, abiertaPorDefault }: { visita: Visita; abiertaPorDefault: boolean }) {
  const [abierta, setAbierta] = useState(abiertaPorDefault);
  const profesionales = [...new Set(visita.entradas.map((e) => `${e.profesional.apellido}, ${e.profesional.nombre}`))];
  const resumen = Object.entries(
    visita.entradas.reduce<Record<string, number>>((acc, e) => {
      const label = TIPO_LABEL[e.tipo] ?? e.tipo;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([label, count]) => (count > 1 ? `${count} ${label.toLowerCase()}s` : label.toLowerCase()))
    .join(" · ");

  return (
    <div className="rounded-md border border-border bg-card">
      <button
        type="button"
        onClick={() => setAbierta((a) => !a)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">
            {formatFechaArgentina(new Date(visita.entradas[0].fecha), {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {profesionales.join(", ")} — {resumen}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${abierta ? "rotate-180" : ""}`} />
      </button>

      {abierta && (
        <div className="flex flex-col gap-3 border-t border-border p-4 pt-3">
          {visita.entradas.map((e) => (
            <EntradaCard key={e.id} entrada={e} />
          ))}
        </div>
      )}
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
    <div className="rounded-md border border-border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
            {TIPO_LABEL[entrada.tipo] ?? entrada.tipo}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(entrada.fecha).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/Argentina/Buenos_Aires",
            })}
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
