"use client";

import { useRef, useState, useTransition } from "react";
import { sileo } from "sileo";
import { crearUsuario } from "@/lib/actions/usuarios";

const inputClass =
  "h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-foreground";

const ROLES = [
  { value: "ADMIN", label: "Administrador — acceso total" },
  { value: "SECRETARIA", label: "Secretaría — pacientes y turnos" },
  { value: "MEDICO", label: "Médico — su propia agenda" },
  { value: "AUDITOR", label: "Auditor — solo lectura" },
];

export function UsuarioQuickForm({
  profesionalesSinUsuario,
}: {
  profesionalesSinUsuario: { id: string; nombre: string; apellido: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [rol, setRol] = useState("SECRETARIA");
  const [profesionalId, setProfesionalId] = useState("__nuevo__");
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await crearUsuario(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        formRef.current?.reset();
        setRol("SECRETARIA");
        setProfesionalId("__nuevo__");
        sileo.success({ title: "Usuario agregado" });
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <input name="nombre" placeholder="Nombre y apellido *" required className={inputClass} />
      <input name="email" type="email" placeholder="Email *" required className={inputClass} />
      <input
        name="password"
        type="password"
        placeholder="Contraseña (si es usuario nuevo)"
        minLength={8}
        className={inputClass}
      />
      <select
        name="rol"
        value={rol}
        onChange={(e) => setRol(e.target.value)}
        required
        className={inputClass}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      {rol === "MEDICO" && (
        <>
          <select
            name="profesionalId"
            value={profesionalId}
            onChange={(e) => setProfesionalId(e.target.value)}
            required
            className={`${inputClass} sm:col-span-2`}
          >
            <option value="__nuevo__">Crear el profesional ahora (matrícula y especialidad)</option>
            {profesionalesSinUsuario.map((p) => (
              <option key={p.id} value={p.id}>
                Vincular a {p.apellido}, {p.nombre} (ya cargado)
              </option>
            ))}
          </select>
          {profesionalId === "__nuevo__" && (
            <>
              <input name="apellidoProfesional" placeholder="Apellido *" required className={inputClass} />
              <input name="matricula" placeholder="Matrícula" className={inputClass} />
              <input
                name="especialidad"
                placeholder="Especialidad (ej: Traumatología)"
                className={`${inputClass} sm:col-span-2`}
              />
            </>
          )}
        </>
      )}

      {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:col-span-2 sm:w-fit"
      >
        {pending ? "Guardando..." : "Agregar usuario"}
      </button>
    </form>
  );
}
