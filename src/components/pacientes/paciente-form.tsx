"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Paciente } from "@prisma/client";
import { checkDniDuplicado, crearPaciente, actualizarPaciente } from "@/lib/actions/pacientes";
import type { PacienteFormState } from "@/lib/actions/pacientes";

interface PacienteFormProps {
  mode: "create" | "edit";
  paciente?: Paciente;
  readOnly?: boolean;
}

const inputClass =
  "h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-foreground";
const labelClass = "text-sm font-semibold text-foreground";

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function PacienteForm({ mode, paciente, readOnly }: PacienteFormProps) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<PacienteFormState>({});
  const [dniWarning, setDniWarning] = useState<{ id: string; nombre: string; apellido: string } | null>(
    null
  );

  async function handleDniBlur(e: React.FocusEvent<HTMLInputElement>) {
    const dni = e.target.value;
    if (mode === "edit" && dni === paciente?.dni) {
      setDniWarning(null);
      return;
    }
    const existing = await checkDniDuplicado(dni);
    setDniWarning(existing);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await crearPaciente(formData)
          : await actualizarPaciente(paciente!.id, formData);
      if (result) setState(result);
    });
  }

  const fieldError = (name: keyof NonNullable<PacienteFormState["fieldErrors"]>) => state.fieldErrors?.[name];

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      {dniWarning && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-foreground">
            Ya existe un paciente con este DNI:{" "}
            <span className="font-semibold">
              {dniWarning.nombre} {dniWarning.apellido}
            </span>
            .{" "}
            <Link href={`/pacientes/${dniWarning.id}`} className="font-semibold underline">
              Ver su ficha
            </Link>{" "}
            antes de crear un registro duplicado.
          </p>
        </div>
      )}

      {state.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-foreground">{state.error}</p>
        </div>
      )}

      <fieldset disabled={readOnly} className="contents">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dni" className={labelClass}>
            DNI *
          </label>
          <input
            id="dni"
            name="dni"
            defaultValue={paciente?.dni}
            onBlur={handleDniBlur}
            required
            className={inputClass}
          />
          {fieldError("dni") && <p className="text-xs text-destructive">{fieldError("dni")}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fechaNacimiento" className={labelClass}>
            Fecha de nacimiento
          </label>
          <input
            id="fechaNacimiento"
            name="fechaNacimiento"
            type="date"
            defaultValue={toDateInputValue(paciente?.fechaNacimiento)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="nombre" className={labelClass}>
            Nombre *
          </label>
          <input id="nombre" name="nombre" defaultValue={paciente?.nombre} required className={inputClass} />
          {fieldError("nombre") && <p className="text-xs text-destructive">{fieldError("nombre")}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="apellido" className={labelClass}>
            Apellido *
          </label>
          <input
            id="apellido"
            name="apellido"
            defaultValue={paciente?.apellido}
            required
            className={inputClass}
          />
          {fieldError("apellido") && <p className="text-xs text-destructive">{fieldError("apellido")}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="telefono" className={labelClass}>
            Teléfono
          </label>
          <input id="telefono" name="telefono" defaultValue={paciente?.telefono ?? ""} className={inputClass} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={paciente?.email ?? ""}
            className={inputClass}
          />
          {fieldError("email") && <p className="text-xs text-destructive">{fieldError("email")}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="obraSocialTexto" className={labelClass}>
            Obra social / seguro
          </label>
          <input
            id="obraSocialTexto"
            name="obraSocialTexto"
            defaultValue={paciente?.obraSocialTexto ?? ""}
            placeholder="Ej: OSDE 210, particular..."
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="alergias" className={labelClass}>
            Alergias declaradas
          </label>
          <textarea
            id="alergias"
            name="alergias"
            defaultValue={paciente?.alergias ?? ""}
            rows={3}
            className="rounded-md border border-border bg-background px-3 py-2 text-[15px] text-foreground outline-none focus:border-foreground"
          />
        </div>
      </div>
      </fieldset>

      <div className="flex gap-3">
        {readOnly ? (
          <Link
            href="/pacientes"
            className="flex h-11 items-center rounded-md border border-border px-6 text-[15px] font-semibold text-foreground hover:bg-muted"
          >
            Volver al listado
          </Link>
        ) : (
          <>
            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Guardando..." : mode === "create" ? "Crear paciente" : "Guardar cambios"}
            </button>
            <Link
              href={mode === "edit" && paciente ? `/pacientes/${paciente.id}` : "/pacientes"}
              className="flex h-11 items-center rounded-md border border-border px-6 text-[15px] font-semibold text-foreground hover:bg-muted"
            >
              Cancelar
            </Link>
          </>
        )}
      </div>
    </form>
  );
}
