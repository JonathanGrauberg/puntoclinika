"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { marcarAtendido } from "@/lib/actions/turnos";

export function CerrarConsultaButton({ turnoId, practicaNombre }: { turnoId: string; practicaNombre: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await marcarAtendido(turnoId);
      sileo.success({ title: "Consulta cerrada" });
      router.push("/sala-espera");
    });
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-foreground">Atendiendo ahora — {practicaNombre}</p>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Cerrando..." : "Cerrar consulta"}
      </button>
    </div>
  );
}
