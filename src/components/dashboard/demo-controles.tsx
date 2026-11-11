"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { cargarDatosEjemplo, borrarDatosEjemplo } from "@/lib/actions/demo";

export function BotonCargarEjemplo() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await cargarDatosEjemplo();
          if (res.error) sileo.error({ title: res.error });
          else {
            sileo.success({ title: "Cargamos pacientes y turnos de ejemplo" });
            router.refresh();
          }
        })
      }
      className="h-12 rounded-xl border border-border px-5 text-base font-semibold text-foreground hover:bg-muted disabled:opacity-50"
    >
      {pending ? "Cargando..." : "Ver con datos de ejemplo"}
    </button>
  );
}

export function AvisoDatosEjemplo() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-foreground">
        Estás viendo <b>datos de ejemplo</b> para que pruebes la app. Cuando quieras, los borrás con un clic.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await borrarDatosEjemplo();
            if (res.error) sileo.error({ title: res.error });
            else {
              sileo.success({ title: "Datos de ejemplo borrados" });
              router.refresh();
            }
          })
        }
        className="h-11 shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Borrando..." : "Borrar datos de ejemplo"}
      </button>
    </div>
  );
}
