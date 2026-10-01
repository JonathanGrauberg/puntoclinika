"use client";

import { useState, useTransition } from "react";
import { sileo } from "sileo";
import { actualizarCamposSugeridos } from "@/lib/actions/practicas";

export function CamposSugeridosEditor({ practicaId, valorInicial }: { practicaId: string; valorInicial: string[] }) {
  const [valor, setValor] = useState(valorInicial.join(", "));
  const [pending, startTransition] = useTransition();

  function guardar() {
    startTransition(async () => {
      const result = await actualizarCamposSugeridos(practicaId, valor);
      if (result?.error) {
        sileo.error({ title: result.error });
      } else {
        sileo.success({ title: "Mediciones sugeridas actualizadas" });
      }
    });
  }

  return (
    <input
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={guardar}
      disabled={pending}
      placeholder="Ej: Fémur derecho, Diámetro biparietal"
      className="h-8 w-full min-w-48 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-foreground disabled:opacity-50"
    />
  );
}
