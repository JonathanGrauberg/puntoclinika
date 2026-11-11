"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus } from "lucide-react";
import { buscarPacientesRapido, type PacienteRapido } from "@/lib/actions/pacientes";
import { NuevoPacienteRapido } from "./nuevo-paciente-rapido";

/**
 * Buscador grande del inicio. Escribís y aparecen los pacientes; si no está,
 * ofrece cargarlo ahí mismo con lo que ya escribiste.
 */
export function BuscadorPacientes({ puedeCrear }: { puedeCrear: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<PacienteRapido[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [alta, setAlta] = useState(false);
  const [activo, setActivo] = useState(-1);
  const pedido = useRef(0);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const id = ++pedido.current;
    const t = setTimeout(async () => {
      try {
        const r = await buscarPacientesRapido(q);
        if (id === pedido.current) {
          setResultados(r);
          setActivo(-1);
        }
      } finally {
        if (id === pedido.current) setBuscando(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const hayConsulta = q.trim().length >= 2;
  const sinResultados = hayConsulta && !buscando && resultados.length === 0;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const elegido = resultados[activo >= 0 ? activo : 0];
      if (elegido) router.push(`/pacientes/${elegido.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Buscar paciente por nombre, apellido o teléfono"
          autoComplete="off"
          className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-4 text-base text-foreground outline-none focus:border-foreground"
        />

        {hayConsulta && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            {resultados.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => router.push(`/pacientes/${p.id}`)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted ${
                  i === activo ? "bg-muted" : ""
                }`}
              >
                <span className="font-semibold text-foreground">
                  {p.apellido}, {p.nombre}
                </span>
                <span className="text-sm text-muted-foreground">{p.telefono || (p.dni ? `DNI ${p.dni}` : "")}</span>
              </button>
            ))}
            {buscando && resultados.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Buscando...</p>
            )}
            {sinResultados && (
              <div className="flex flex-col gap-2 px-4 py-3">
                <p className="text-sm text-muted-foreground">No encontramos a &ldquo;{q.trim()}&rdquo;.</p>
                {puedeCrear && (
                  <button
                    type="button"
                    onClick={() => setAlta(true)}
                    className="flex h-11 w-fit items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <UserPlus className="h-4 w-4" />
                    Agregar &ldquo;{q.trim()}&rdquo; como paciente nuevo
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {puedeCrear && (
        <button
          type="button"
          onClick={() => setAlta(true)}
          className="flex h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground hover:opacity-90"
        >
          <UserPlus className="h-5 w-5" />
          Nuevo paciente
        </button>
      )}

      <NuevoPacienteRapido abierto={alta} onClose={() => setAlta(false)} textoInicial={q.trim()} />
    </div>
  );
}
