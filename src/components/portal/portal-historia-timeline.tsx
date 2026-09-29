"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toISODate, formatFechaArgentina } from "@/lib/date-utils";

const TIPO_LABEL: Record<string, string> = {
  NOTA: "Nota",
  DIAGNOSTICO: "Diagnóstico",
  INDICACION: "Indicación",
  RECETA: "Receta",
  ORDEN_MEDICA: "Orden médica",
};

export interface EntradaVisible {
  id: string;
  tipo: string;
  contenido: string;
  fecha: Date;
  profesional: { nombre: string; apellido: string };
}

interface Visita {
  diaISO: string;
  entradas: EntradaVisible[];
}

function agruparPorVisita(entradas: EntradaVisible[]): Visita[] {
  const porDia = new Map<string, EntradaVisible[]>();
  for (const e of entradas) {
    const dia = toISODate(new Date(e.fecha));
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia)!.push(e);
  }
  return Array.from(porDia.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([diaISO, entradas]) => ({ diaISO, entradas }));
}

export function PortalHistoriaTimeline({ entradas }: { entradas: EntradaVisible[] }) {
  const visitas = agruparPorVisita(entradas);

  return (
    <div className="flex flex-col gap-2">
      {visitas.map((v, i) => (
        <VisitaCard key={v.diaISO} visita={v} abiertaPorDefault={i === 0} />
      ))}
    </div>
  );
}

function VisitaCard({ visita, abiertaPorDefault }: { visita: Visita; abiertaPorDefault: boolean }) {
  const [abierta, setAbierta] = useState(abiertaPorDefault);
  const profesionales = [...new Set(visita.entradas.map((e) => `${e.profesional.apellido}, ${e.profesional.nombre}`))];

  return (
    <div className="rounded-md border border-border bg-card">
      <button
        type="button"
        onClick={() => setAbierta((a) => !a)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">{formatFechaArgentina(new Date(visita.entradas[0].fecha))}</p>
          <p className="text-xs text-muted-foreground">{profesionales.join(", ")}</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${abierta ? "rotate-180" : ""}`} />
      </button>

      {abierta && (
        <div className="flex flex-col gap-2 border-t border-border p-4 pt-3">
          {visita.entradas.map((e) => (
            <div key={e.id} className="rounded-md border border-border p-3">
              <span className="mb-1 inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                {TIPO_LABEL[e.tipo] ?? e.tipo}
              </span>
              <p className="whitespace-pre-wrap text-sm text-foreground">{e.contenido}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
