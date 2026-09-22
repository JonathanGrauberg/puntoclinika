"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { crearCobro } from "@/lib/actions/facturacion";
import type { CobroFormState } from "@/lib/actions/facturacion";
import { METODOS_PAGO, METODO_PAGO_LABEL } from "@/lib/metodos-pago";

const inputClass =
  "h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-foreground";
const labelClass = "text-sm font-semibold text-foreground";

export interface TurnoParaCobrar {
  id: string;
  paciente: { nombre: string; apellido: string };
  profesional: { nombre: string; apellido: string };
  practica: { nombre: string; precioParticular: number };
  fechaHora: Date;
}

export function CobroModal({
  turno,
  open,
  onOpenChange,
}: {
  turno: TurnoParaCobrar | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<CobroFormState>({});

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await crearCobro(formData);
      if (result?.error) {
        setState(result);
      } else {
        setState({});
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold text-foreground">Registrar cobro</Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {turno && (
            <>
              <div className="mb-4 rounded-md bg-muted px-3 py-2.5 text-sm">
                <p className="font-semibold text-foreground">
                  {turno.paciente.apellido}, {turno.paciente.nombre}
                </p>
                <p className="text-muted-foreground">
                  {turno.practica.nombre} — Dr/a. {turno.profesional.apellido}
                </p>
              </div>

              <form action={handleSubmit} className="flex flex-col gap-4">
                <input type="hidden" name="turnoId" value={turno.id} />

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="monto" className={labelClass}>
                    Monto *
                  </label>
                  <input
                    id="monto"
                    name="monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    defaultValue={turno.practica.precioParticular}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="metodo" className={labelClass}>
                    Método de pago *
                  </label>
                  <select id="metodo" name="metodo" required defaultValue="EFECTIVO" className={inputClass}>
                    {METODOS_PAGO.map((m) => (
                      <option key={m} value={m}>
                        {METODO_PAGO_LABEL[m]}
                      </option>
                    ))}
                  </select>
                </div>

                {state.error && <p className="text-sm text-destructive">{state.error}</p>}

                <button
                  type="submit"
                  disabled={pending}
                  className="h-11 rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? "Guardando..." : "Registrar cobro"}
                </button>
              </form>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
