"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { agregarNotaCircuito, borrarNotaCircuito } from "@/lib/actions/circuito";

export interface NotaItem {
  id: string;
  autor: string;
  texto: string;
  fecha: string;
  propia: boolean;
}

export function NotasSeccion({ seccion, notas }: { seccion: string; notas: NotaItem[] }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(undefined);
    startTransition(async () => {
      const res = await agregarNotaCircuito(seccion, texto);
      if (res.error) {
        setError(res.error);
      } else {
        setTexto("");
        router.refresh();
      }
    });
  }

  function borrar(id: string) {
    startTransition(async () => {
      await borrarNotaCircuito(id);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {notas.map((n) => (
        <div key={n.id} className="rounded-md border border-border bg-muted/40 px-3 py-2">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{n.autor}</span> · {n.fecha}
            </span>
            {n.propia && (
              <button
                type="button"
                onClick={() => borrar(n.id)}
                disabled={pending}
                className="hover:text-destructive disabled:opacity-50"
              >
                Borrar
              </button>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{n.texto}</p>
        </div>
      ))}
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        placeholder="✏️ Escribí una nota, sugerencia o duda..."
        className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        onClick={guardar}
        disabled={pending || !texto.trim()}
        className="h-9 w-fit rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Guardar nota"}
      </button>
    </div>
  );
}
