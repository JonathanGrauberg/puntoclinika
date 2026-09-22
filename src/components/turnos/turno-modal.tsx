"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { crearTurno, actualizarTurno, cancelarTurno } from "@/lib/actions/turnos";
import type { TurnoFormState } from "@/lib/actions/turnos";
import { PacientePicker, type PacienteOption } from "@/components/pacientes/paciente-picker";
import { toISODate } from "@/lib/date-utils";

export interface PracticaOption {
  id: string;
  nombre: string;
  duracionMin: number;
}

export interface TurnoExistente {
  id: string;
  pacienteId: string;
  profesionalId: string;
  practicaId: string;
  fechaHora: Date;
  notas: string | null;
}

const inputClass =
  "h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-foreground";
const labelClass = "text-sm font-semibold text-foreground";

function toTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function TurnoModal({
  open,
  onOpenChange,
  slot,
  turno,
  profesionalId,
  pacientes,
  practicas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot?: { fecha: Date; hora: string } | null;
  turno?: TurnoExistente | null;
  profesionalId: string;
  pacientes: PacienteOption[];
  practicas: PracticaOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<TurnoFormState>({});
  const [pacienteId, setPacienteId] = useState(turno?.pacienteId ?? "");

  const fechaDefault = toISODate(turno?.fechaHora ?? slot?.fecha ?? new Date());
  const horaDefault = turno ? toTimeValue(turno.fechaHora) : slot?.hora ?? "08:00";

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = turno ? await actualizarTurno(turno.id, formData) : await crearTurno(formData);
      if (result?.error) {
        setState(result);
      } else {
        setState({});
        onOpenChange(false);
      }
    });
  }

  function handleCancelar() {
    if (!turno) return;
    if (!confirm("¿Cancelar este turno?")) return;
    startTransition(async () => {
      await cancelarTurno(turno.id);
      onOpenChange(false);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold text-foreground">
              {turno ? "Editar turno" : "Nuevo turno"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form action={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="profesionalId" value={profesionalId} />

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Paciente *</label>
              <PacientePicker
                name="pacienteId"
                pacientes={pacientes}
                value={pacienteId}
                onChange={setPacienteId}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="practicaId" className={labelClass}>
                Práctica *
              </label>
              <select
                id="practicaId"
                name="practicaId"
                required
                defaultValue={turno?.practicaId ?? ""}
                className={inputClass}
              >
                <option value="" disabled>
                  Seleccionar práctica
                </option>
                {practicas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.duracionMin} min)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fecha" className={labelClass}>
                  Fecha *
                </label>
                <input
                  id="fecha"
                  name="fecha"
                  type="date"
                  required
                  defaultValue={fechaDefault}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="hora" className={labelClass}>
                  Hora *
                </label>
                <input
                  id="hora"
                  name="hora"
                  type="time"
                  required
                  defaultValue={horaDefault}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="notas" className={labelClass}>
                Notas
              </label>
              <textarea
                id="notas"
                name="notas"
                rows={2}
                defaultValue={turno?.notas ?? ""}
                className="rounded-md border border-border bg-background px-3 py-2 text-[15px] text-foreground outline-none focus:border-foreground"
              />
            </div>

            {state.error && <p className="text-sm text-destructive">{state.error}</p>}

            <div className="flex items-center justify-between gap-2 pt-2">
              {turno ? (
                <button
                  type="button"
                  onClick={handleCancelar}
                  disabled={pending}
                  className="h-11 rounded-md border border-destructive/40 px-4 text-[15px] font-semibold text-destructive hover:bg-destructive/5"
                >
                  Cancelar turno
                </button>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={pending || !pacienteId}
                className="h-11 rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Guardando..." : turno ? "Guardar cambios" : "Crear turno"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
