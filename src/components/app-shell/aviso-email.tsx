"use client";

import { useState, useTransition } from "react";
import { sileo } from "sileo";
import { reenviarVerificacion } from "@/lib/actions/registro";

/** Aviso suave: no bloquea nada, solo recuerda confirmar el mail. */
export function AvisoEmail() {
  const [pending, startTransition] = useTransition();
  const [oculto, setOculto] = useState(false);
  if (oculto) return null;

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-foreground">
        Te mandamos un mail para <b>confirmar tu email</b>. Revisá tu bandeja (y el spam).
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await reenviarVerificacion();
              if (res.error) sileo.error({ title: res.error });
              else sileo.success({ title: "Listo, te lo mandamos de nuevo" });
            })
          }
          className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Reenviar mail"}
        </button>
        <button
          type="button"
          onClick={() => setOculto(true)}
          className="h-10 rounded-xl px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          Ocultar
        </button>
      </div>
    </div>
  );
}
