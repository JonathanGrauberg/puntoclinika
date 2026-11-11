"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { registrarCuenta } from "@/lib/actions/registro";

const inputClass =
  "h-12 rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-foreground";
const labelClass = "text-sm font-semibold text-foreground";

export function RegistroForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function enviar(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const res = await registrarCuenta(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={enviar} className="flex flex-col gap-4 rounded-2xl border border-border p-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tipoCuenta" className={labelClass}>
          ¿Cómo vas a usar .clinika?
        </label>
        <select id="tipoCuenta" name="tipoCuenta" defaultValue="ODONTOLOGIA" className={inputClass}>
          <option value="ODONTOLOGIA">Soy odontólogo/a</option>
          <option value="LABORATORIO" disabled>
            Soy laboratorio dental (próximamente)
          </option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nombre" className={labelClass}>
            Nombre
          </label>
          <input id="nombre" name="nombre" required autoComplete="given-name" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="apellido" className={labelClass}>
            Apellido
          </label>
          <input id="apellido" name="apellido" required autoComplete="family-name" className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombreCentro" className={labelClass}>
          Nombre de tu consultorio
        </label>
        <input
          id="nombreCentro"
          name="nombreCentro"
          required
          placeholder="Ej: Consultorio Dra. Pérez"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClass}>
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          className={inputClass}
        />
      </div>

      {/* Campo trampa para bots: queda fuera de la vista y del teclado. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Sitio web
          <input name="sitioWeb" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-foreground">
        <input type="checkbox" name="terminos" required className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          Acepto los{" "}
          <Link href="/terminos" target="_blank" className="underline underline-offset-2">
            términos y condiciones
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" target="_blank" className="underline underline-offset-2">
            política de privacidad
          </Link>
          .
        </span>
      </label>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Creando tu cuenta..." : "Crear cuenta gratis"}
      </button>
      <p className="text-center text-xs text-muted-foreground">14 días gratis. Sin tarjeta.</p>
    </form>
  );
}
