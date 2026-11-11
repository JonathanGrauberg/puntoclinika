"use client";

import { useState } from "react";
import type { HallazgoVista } from "@/lib/actions/odontograma";
import { ARCADAS, HALLAZGOS, resumenSuperficies, type Denticion } from "@/lib/odontograma";
import { COLOR_AZUL, COLOR_ROJO, DienteSvg } from "./diente";
import { PanelPieza } from "./panel-pieza";

function Pieza({
  pieza,
  hallazgos,
  numeroArriba,
  resaltada,
  onClick,
}: {
  pieza: number;
  hallazgos: HallazgoVista[];
  numeroArriba: boolean;
  resaltada: boolean;
  onClick: () => void;
}) {
  const numero = <span className="text-[11px] font-semibold text-muted-foreground">{pieza}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Pieza ${pieza}`}
      className={`flex min-h-[4.25rem] w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 transition-colors hover:bg-muted active:bg-muted ${
        resaltada ? "bg-muted ring-2 ring-primary" : ""
      }`}
    >
      {numeroArriba && numero}
      <DienteSvg pieza={pieza} hallazgos={hallazgos} className="h-9 w-9" />
      {!numeroArriba && numero}
    </button>
  );
}

function Fila({
  piezas,
  numeroArriba,
  vigentesPorPieza,
  filtro,
  onAbrir,
}: {
  piezas: readonly number[];
  numeroArriba: boolean;
  vigentesPorPieza: Map<number, HallazgoVista[]>;
  filtro: number | null;
  onAbrir: (p: number) => void;
}) {
  const mitad = piezas.length / 2;
  return (
    <div className="flex items-center justify-center">
      {piezas.map((p, i) => (
        <div key={p} className={`flex ${i === mitad ? "ml-3 border-l-2 border-border pl-3" : ""}`}>
          <Pieza
            pieza={p}
            hallazgos={vigentesPorPieza.get(p) ?? []}
            numeroArriba={numeroArriba}
            resaltada={filtro === p}
            onClick={() => onAbrir(p)}
          />
        </div>
      ))}
    </div>
  );
}

export function Odontograma({
  pacienteId,
  hallazgos,
  puedeEditar,
  denticionInicial,
  piezaFiltro,
  onVerHistoria,
}: {
  pacienteId: string;
  hallazgos: HallazgoVista[];
  puedeEditar: boolean;
  denticionInicial: Denticion;
  piezaFiltro: number | null;
  onVerHistoria: (pieza: number) => void;
}) {
  const [denticion, setDenticion] = useState<Denticion>(denticionInicial);
  const [abierta, setAbierta] = useState<number | null>(null);

  const vigentes = hallazgos.filter((h) => !h.anuladoEn);
  const vigentesPorPieza = new Map<number, HallazgoVista[]>();
  for (const h of vigentes) {
    vigentesPorPieza.set(h.pieza, [...(vigentesPorPieza.get(h.pieza) ?? []), h]);
  }

  const porHacer = vigentes.filter((h) => h.estado === "A_REALIZAR");
  const porHacerPorPieza = new Map<number, HallazgoVista[]>();
  for (const h of porHacer) porHacerPorPieza.set(h.pieza, [...(porHacerPorPieza.get(h.pieza) ?? []), h]);
  const piezasPorHacer = [...porHacerPorPieza.keys()].sort((a, b) => a - b);

  const arcadas = ARCADAS[denticion];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: COLOR_ROJO }} />
              Por hacer
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: COLOR_AZUL }} />
              Existente / hecho
            </span>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className={`mx-auto flex flex-col gap-3 ${denticion === "permanentes" ? "min-w-[720px]" : "min-w-[480px]"}`}>
            <Fila
              piezas={arcadas.superior}
              numeroArriba
              vigentesPorPieza={vigentesPorPieza}
              filtro={piezaFiltro}
              onAbrir={setAbierta}
            />
            <div className="border-t-2 border-border" />
            <Fila
              piezas={arcadas.inferior}
              numeroArriba={false}
              vigentesPorPieza={vigentesPorPieza}
              filtro={piezaFiltro}
              onAbrir={setAbierta}
            />
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">Tocá una pieza para ver o cargar lo que tiene.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-bold text-foreground">
          Por hacer {porHacer.length > 0 && <span style={{ color: COLOR_ROJO }}>({porHacer.length})</span>}
        </h3>
        {piezasPorHacer.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay nada pendiente. Todo al día.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {piezasPorHacer.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => setAbierta(p)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
                >
                  <span className="w-16 shrink-0 text-sm font-bold text-foreground">Pieza {p}</span>
                  <span className="text-sm text-foreground">
                    {porHacerPorPieza
                      .get(p)!
                      .map((h) => {
                        const caras = h.superficies.length > 0 ? ` (${resumenSuperficies(h.superficies, h.pieza)})` : "";
                        return `${HALLAZGOS[h.tipo].label}${caras}`;
                      })
                      .join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PanelPieza
        pieza={abierta}
        pacienteId={pacienteId}
        hallazgos={hallazgos}
        puedeEditar={puedeEditar}
        onClose={() => setAbierta(null)}
        onVerHistoria={onVerHistoria}
      />
    </div>
  );
}
