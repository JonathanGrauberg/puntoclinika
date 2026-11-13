"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CuentaResumen } from "@/lib/actions/dueno";
import {
  CHIP_ESTADO,
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  diasDePrueba,
  estadoDeCuenta,
  formatoPrecio,
  type EstadoCuenta,
} from "@/lib/cuentas-estado";

type Filtro = "todas" | EstadoCuenta;

export function CuentasLista({ cuentas, ahoraMs }: { cuentas: CuentaResumen[]; ahoraMs: number }) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");

  const conEstado = useMemo(
    () => cuentas.map((c) => ({ ...c, estado: estadoDeCuenta(c, ahoraMs) })),
    [cuentas, ahoraMs]
  );
  const cuenta = (e: EstadoCuenta) => conEstado.filter((c) => c.estado === e).length;
  const mensual = conEstado.filter((c) => c.estado === "activa").reduce((s, c) => s + c.totalMensual, 0);

  const visibles = conEstado.filter(
    (c) =>
      (filtro === "todas" || c.estado === filtro) &&
      (!busqueda.trim() || c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
  );

  const chips: { id: Filtro; label: string; n: number }[] = [
    { id: "todas", label: "Todas", n: conEstado.length },
    ...(["prueba", "por_vencer", "vencida", "activa", "suspendida"] as EstadoCuenta[])
      .filter((e) => cuenta(e) > 0)
      .map((e) => ({ id: e as Filtro, label: ETIQUETA_ESTADO[e], n: cuenta(e) })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: "Cuentas", v: conEstado.length },
          { l: "En prueba", v: cuenta("prueba") + cuenta("por_vencer") },
          { l: "Por vencer (5 días)", v: cuenta("por_vencer") },
          { l: "Facturación mensual de activas", v: mensual > 0 ? formatoPrecio(mensual) : "—" },
        ].map((t) => (
          <div key={t.l} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">{t.l}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{t.v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar una cuenta..."
          className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-foreground"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFiltro(c.id)}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${
              filtro === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"
            }`}
          >
            {c.label}
            <span className="opacity-70">{c.n}</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          No hay cuentas en esta vista.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibles.map((c) => {
            const dias = diasDePrueba(c.trialHasta, ahoraMs);
            return (
              <li key={c.id}>
                <Link
                  href={`/dueno/cuentas/${c.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-base font-bold text-foreground">{c.nombre}</span>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                        {ETIQUETA_TIPO[c.tipo]}
                      </span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {c.plan ? c.plan.nombre : "Módulos sueltos"} · {c.modulos.length} módulos · {c.usuarios}{" "}
                      {c.usuarios === 1 ? "usuario" : "usuarios"}
                      {dias !== null && dias >= 0 && c.activo && ` · prueba: quedan ${dias} d`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${CHIP_ESTADO[c.estado]}`}>
                      {ETIQUETA_ESTADO[c.estado]}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{formatoPrecio(c.totalMensual)}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
