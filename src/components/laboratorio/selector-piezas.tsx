"use client";

import { useState } from "react";
import { ARCADAS, type Denticion } from "@/lib/odontograma";

const CUADRANTES: Record<Denticion, { titulo: string; piezas: readonly number[] }[]> = {
  permanentes: [
    { titulo: "Arriba derecha", piezas: ARCADAS.permanentes.superior.slice(0, 8) },
    { titulo: "Arriba izquierda", piezas: ARCADAS.permanentes.superior.slice(8) },
    { titulo: "Abajo derecha", piezas: ARCADAS.permanentes.inferior.slice(0, 8) },
    { titulo: "Abajo izquierda", piezas: ARCADAS.permanentes.inferior.slice(8) },
  ],
  temporales: [
    { titulo: "Arriba derecha", piezas: ARCADAS.temporales.superior.slice(0, 5) },
    { titulo: "Arriba izquierda", piezas: ARCADAS.temporales.superior.slice(5) },
    { titulo: "Abajo derecha", piezas: ARCADAS.temporales.inferior.slice(0, 5) },
    { titulo: "Abajo izquierda", piezas: ARCADAS.temporales.inferior.slice(5) },
  ],
};

/** Elegir una o varias piezas (numeración FDI) con botones grandes. */
export function SelectorPiezas({
  value,
  onChange,
}: {
  value: number[];
  onChange: (piezas: number[]) => void;
}) {
  const [denticion, setDenticion] = useState<Denticion>(value.some((p) => p >= 51) ? "temporales" : "permanentes");

  function alternar(p: number) {
    onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p].sort((a, b) => a - b));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-border p-1">
          {(["permanentes", "temporales"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDenticion(d)}
              className={`h-10 rounded-lg px-4 text-sm font-semibold ${
                denticion === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d === "permanentes" ? "Adultos" : "Niños"}
            </button>
          ))}
        </div>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="h-10 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            Quitar todas
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CUADRANTES[denticion].map((c) => (
          <div key={c.titulo}>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">{c.titulo}</p>
            <div className="flex flex-wrap gap-1.5">
              {c.piezas.map((p) => {
                const on = value.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => alternar(p)}
                    aria-pressed={on}
                    className={`h-11 w-11 rounded-lg border text-sm font-bold transition-colors ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
