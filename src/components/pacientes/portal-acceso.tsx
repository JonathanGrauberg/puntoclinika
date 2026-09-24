"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { generarAccesoPortal } from "@/lib/actions/pacientes";

export function PortalAcceso({
  pacienteId,
  usernameActual,
}: {
  pacienteId: string;
  usernameActual: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState<string>();
  const [confirmando, setConfirmando] = useState(false);

  function handleConfirmar() {
    setConfirmando(false);
    setError(undefined);
    startTransition(async () => {
      const result = await generarAccesoPortal(pacienteId);
      if (result.error) {
        setError(result.error);
      } else if (result.username && result.password) {
        setResultado({ username: result.username, password: result.password });
      }
    });
  }

  if (resultado) {
    return (
      <div className="rounded-md border border-border bg-muted/40 p-4">
        <p className="mb-2 text-sm font-semibold text-foreground">
          Acceso generado — anotalo, no se puede volver a ver:
        </p>
        <p className="font-mono text-sm text-foreground">Usuario: {resultado.username}</p>
        <p className="font-mono text-sm text-foreground">Contraseña: {resultado.password}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {usernameActual && (
        <p className="text-sm text-muted-foreground">
          Ya tiene acceso al portal (usuario: <span className="font-mono">{usernameActual}</span>).
        </p>
      )}

      {confirmando ? (
        <div className="flex items-center gap-2">
          <p className="text-sm text-foreground">
            {usernameActual
              ? "La contraseña anterior deja de funcionar. ¿Confirmás?"
              : "¿Generar acceso al portal para este paciente?"}
          </p>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={pending}
            className="h-8 shrink-0 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Generando..." : "Confirmar"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className="h-8 shrink-0 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="flex h-10 w-fit items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <KeyRound className="h-4 w-4" />
          {usernameActual ? "Regenerar contraseña" : "Generar acceso al portal"}
        </button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
