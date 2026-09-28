"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearAfiliacion, eliminarAfiliacion } from "@/lib/actions/obras-sociales";
import type { AfiliacionFormState } from "@/lib/actions/obras-sociales";

const inputClass =
  "h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-foreground";

export interface AfiliacionExistente {
  id: string;
  numeroAfiliado: string;
  plan: string | null;
  obraSocial: { nombre: string };
}

export interface ObraSocialOption {
  id: string;
  nombre: string;
}

export function AfiliacionesPaciente({
  pacienteId,
  afiliaciones,
  obrasSociales,
  readOnly,
}: {
  pacienteId: string;
  afiliaciones: AfiliacionExistente[];
  obrasSociales: ObraSocialOption[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<AfiliacionFormState>({});
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    formData.set("pacienteId", pacienteId);
    startTransition(async () => {
      const result = await crearAfiliacion(formData);
      if (result?.error) {
        setState(result);
      } else {
        setState({});
        formRef.current?.reset();
        router.refresh();
      }
    });
  }

  function handleEliminar(id: string) {
    startTransition(async () => {
      await eliminarAfiliacion(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {afiliaciones.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin obras sociales cargadas.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {afiliaciones.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{a.obraSocial.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  N.º {a.numeroAfiliado}
                  {a.plan && ` — ${a.plan}`}
                </p>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleEliminar(a.id)}
                  disabled={pending}
                  className="h-8 rounded-md border border-destructive/40 px-2 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50"
                >
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <form ref={formRef} action={handleSubmit} className="grid gap-2 sm:grid-cols-3">
          <select name="obraSocialId" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Obra social
            </option>
            {obrasSociales.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
          <input name="numeroAfiliado" placeholder="N.º de afiliado *" required className={inputClass} />
          <input name="plan" placeholder="Plan (opcional)" className={inputClass} />
          {state.error && <p className="text-xs text-destructive sm:col-span-3">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="h-10 w-fit rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 sm:col-span-3"
          >
            {pending ? "Agregando..." : "Agregar afiliación"}
          </button>
        </form>
      )}
    </div>
  );
}
