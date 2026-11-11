"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { EstadoPedidoLab } from "@prisma/client";
import type { PedidoResumen } from "@/lib/actions/pedidos-laboratorio";
import { ESTADOS_PEDIDO, ORDEN_ESTADOS, estaAtrasado, numeroPedido, textoPiezas } from "@/lib/pedidos-lab";

type Filtro = "activos" | "atrasados" | "todos" | EstadoPedidoLab;

function fecha(d: Date) {
  return new Date(d).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function PedidosLista({ pedidos, hoyMs }: { pedidos: PedidoResumen[]; hoyMs: number }) {
  const hoy = useMemo(() => new Date(hoyMs), [hoyMs]);
  const [filtro, setFiltro] = useState<Filtro>("activos");

  const conAtraso = useMemo(
    () =>
      pedidos.map((p) => ({
        ...p,
        atrasado: estaAtrasado(p.estado, p.fechaEntrega ? new Date(p.fechaEntrega) : null, hoy),
      })),
    [pedidos, hoy]
  );

  const visibles = useMemo(() => {
    const base = conAtraso.filter((p) => {
      if (filtro === "todos") return true;
      if (filtro === "activos") return p.estado !== "ENTREGADO";
      if (filtro === "atrasados") return p.atrasado;
      return p.estado === filtro;
    });
    // Primero lo más urgente: fecha de entrega más cercana; sin fecha, al final por número.
    return [...base].sort((a, b) => {
      const fa = a.fechaEntrega ? new Date(a.fechaEntrega).getTime() : Infinity;
      const fb = b.fechaEntrega ? new Date(b.fechaEntrega).getTime() : Infinity;
      return fa === fb ? b.numero - a.numero : fa - fb;
    });
  }, [conAtraso, filtro]);

  const cuenta = (e: EstadoPedidoLab) => pedidos.filter((p) => p.estado === e).length;
  const activos = pedidos.filter((p) => p.estado !== "ENTREGADO").length;
  const atrasados = conAtraso.filter((p) => p.atrasado).length;

  const chips: { id: Filtro; label: string; n: number }[] = [
    { id: "activos", label: "En curso", n: activos },
    ...(atrasados > 0 ? [{ id: "atrasados" as Filtro, label: "Atrasados", n: atrasados }] : []),
    ...ORDEN_ESTADOS.filter((e) => e !== "ENTREGADO" && cuenta(e) > 0).map((e) => ({
      id: e as Filtro,
      label: ESTADOS_PEDIDO[e].label,
      n: cuenta(e),
    })),
    ...(cuenta("ENTREGADO") > 0
      ? [{ id: "ENTREGADO" as Filtro, label: "Entregados", n: cuenta("ENTREGADO") }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFiltro(c.id)}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${
              filtro === c.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            {c.label}
            <span className="opacity-70">{c.n}</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          {pedidos.length === 0
            ? "Todavía no hay pedidos. Creá el primero con “Nuevo pedido”."
            : "No hay pedidos en esta vista."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibles.map((p) => (
            <li key={p.id}>
              <Link
                href={`/laboratorio/pedidos/${p.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground">{numeroPedido(p.numero)}</span>
                    <span className="truncate text-base font-bold text-foreground">
                      {p.paciente.apellido}, {p.paciente.nombre}
                    </span>
                  </div>
                  <p className="truncate text-sm text-foreground">
                    {p.trabajo}
                    {p.piezas.length > 0 && (
                      <span className="text-muted-foreground"> · pieza {textoPiezas(p.piezas)}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.laboratorio.nombre}
                    {p.fechaEntrega && ` · entrega ${fecha(p.fechaEntrega)}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${ESTADOS_PEDIDO[p.estado].chip}`}>
                    {ESTADOS_PEDIDO[p.estado].label}
                  </span>
                  {p.atrasado && (
                    <span className="flex items-center gap-1 text-xs font-bold text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Atrasado
                    </span>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
