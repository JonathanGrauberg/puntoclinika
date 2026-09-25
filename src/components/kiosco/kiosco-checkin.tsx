"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { registrarLlegadaKiosco, type CheckinKioscoResult } from "@/lib/actions/kiosco";

// Pantalla táctil fija en sala de espera, sin login de ningún tipo — por eso
// vuelve sola al estado inicial después de un check-in (éxito o error), así
// el próximo paciente no depende de que alguien la reinicie a mano.
const RESET_MS = 8000;

export function KioscoCheckin({ slug, tenantNombre }: { slug: string; tenantNombre: string }) {
  const [dni, setDni] = useState("");
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<CheckinKioscoResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!resultado) return;
    const timeout = setTimeout(() => {
      setResultado(null);
      setDni("");
    }, RESET_MS);
    return () => clearTimeout(timeout);
  }, [resultado]);

  useEffect(() => {
    if (!resultado) inputRef.current?.focus();
  }, [resultado]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dni.trim()) return;
    startTransition(async () => {
      const result = await registrarLlegadaKiosco(slug, dni.trim());
      setResultado(result);
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {tenantNombre}
        </p>

        {resultado?.ok ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <CheckCircle2 className="h-14 w-14 text-success" />
            <h1 className="text-2xl font-bold text-foreground">
              {resultado.ok.yaEstabaEnEspera ? "Ya estás en la lista" : "¡Llegada registrada!"}
            </h1>
            <p className="text-base text-foreground">
              Turno de las {resultado.ok.hora} — {resultado.ok.practica}
            </p>
            <p className="text-sm text-muted-foreground">Con {resultado.ok.profesional}</p>
            {resultado.ok.consultorio ? (
              <p className="mt-2 text-lg font-semibold text-foreground">
                Dirigite a: {resultado.ok.consultorio}
              </p>
            ) : (
              <p className="mt-2 text-base text-foreground">Tomá asiento, ya te vamos a llamar.</p>
            )}
          </div>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-bold text-foreground">
              Ingresá tu DNI para registrar tu llegada
            </h1>
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoFocus
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                placeholder="Tu DNI"
                className="h-16 rounded-md border border-border bg-background text-center text-2xl font-semibold tracking-wide text-foreground outline-none focus:border-foreground"
              />
              <button
                type="submit"
                disabled={pending || !dni.trim()}
                className="h-14 rounded-md bg-primary text-lg font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Buscando..." : "Confirmar"}
              </button>
            </form>
            {resultado?.error && (
              <p className="mt-4 text-base font-medium text-destructive">{resultado.error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
