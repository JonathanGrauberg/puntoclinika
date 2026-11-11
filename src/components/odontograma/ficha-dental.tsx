"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { HallazgoVista } from "@/lib/actions/odontograma";
import type { Denticion } from "@/lib/odontograma";
import { HistoriaTimeline, type EntradaTimeline } from "@/components/historia-clinica/historia-timeline";
import { NuevaEntradaForm } from "@/components/historia-clinica/nueva-entrada-form";
import { Odontograma } from "./odontograma";

type Pestana = "odontograma" | "historia" | "datos";

const PESTANAS: { id: Pestana; label: string }[] = [
  { id: "odontograma", label: "Odontograma" },
  { id: "historia", label: "Historia" },
  { id: "datos", label: "Datos" },
];

/** Ficha del paciente en un consultorio dental: odontograma, historia clínica y datos. */
export function FichaDental({
  pacienteId,
  hallazgos,
  entradas,
  puedeEditar,
  denticionInicial,
  datos,
}: {
  pacienteId: string;
  hallazgos: HallazgoVista[];
  entradas: EntradaTimeline[];
  puedeEditar: boolean;
  denticionInicial: Denticion;
  datos: React.ReactNode;
}) {
  const [pestana, setPestana] = useState<Pestana>("odontograma");
  const [piezaFiltro, setPiezaFiltro] = useState<number | null>(null);

  const entradasVisibles = piezaFiltro ? entradas.filter((e) => e.piezas?.includes(piezaFiltro)) : entradas;

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setPestana(p.id)}
            className={`h-12 rounded-xl text-base font-semibold transition-colors ${
              pestana === p.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {pestana === "odontograma" && (
        <Odontograma
          pacienteId={pacienteId}
          hallazgos={hallazgos}
          puedeEditar={puedeEditar}
          denticionInicial={denticionInicial}
          piezaFiltro={piezaFiltro}
          onVerHistoria={(pieza) => {
            setPiezaFiltro(pieza);
            setPestana("historia");
          }}
        />
      )}

      {pestana === "historia" && (
        <div className="flex flex-col gap-4">
          {puedeEditar && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Nueva entrada</h2>
              <NuevaEntradaForm pacienteId={pacienteId} />
            </div>
          )}

          {piezaFiltro && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-2">
              <p className="text-sm text-foreground">
                Mostrando solo la <b>pieza {piezaFiltro}</b>
              </p>
              <button
                type="button"
                onClick={() => setPiezaFiltro(null)}
                className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
                Ver todo
              </button>
            </div>
          )}

          <HistoriaTimeline entradas={entradasVisibles} />
        </div>
      )}

      {pestana === "datos" && datos}
    </div>
  );
}
