"use client";

import { useEffect, useRef, useState } from "react";
import { Search, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PacienteOption {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
}

export function PacientePicker({
  pacientes,
  value,
  onChange,
  name,
}: {
  pacientes: PacienteOption[];
  value: string;
  onChange: (id: string) => void;
  name: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = pacientes.find((p) => p.id === value);

  const filtered = query.trim()
    ? pacientes.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.nombre.toLowerCase().includes(q) ||
          p.apellido.toLowerCase().includes(q) ||
          p.dni.includes(q)
        );
      })
    : pacientes.slice(0, 8);

  useEffect(() => setActiveIndex(-1), [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) select(filtered[activeIndex].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />

      {selected && !open ? (
        <div
          className="flex h-11 cursor-pointer items-center justify-between rounded-md border border-border bg-background px-3 hover:bg-muted"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          <div className="flex items-center gap-2 text-[15px] text-foreground">
            <User className="h-4 w-4 text-muted-foreground" />
            {selected.apellido}, {selected.nombre}
            <span className="text-muted-foreground">DNI {selected.dni}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              select("");
            }}
            aria-label="Quitar paciente"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar por nombre, apellido o DNI..."
            className="h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-[15px] text-foreground outline-none focus:border-foreground"
            role="combobox"
            aria-expanded={open}
            aria-controls="paciente-picker-listbox"
            aria-autocomplete="list"
          />
        </div>
      )}

      {open && (
        <div
          id="paciente-picker-listbox"
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-card shadow-[0_2px_12px_rgb(0_0_0_/_0.12)]"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            filtered.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => select(p.id)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted",
                  i === activeIndex && "bg-muted"
                )}
              >
                <span className="text-foreground">
                  {p.apellido}, {p.nombre}
                </span>
                <span className="text-muted-foreground">DNI {p.dni}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
