"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";

export function ActivoToggle({
  id,
  activo,
  toggleAction,
}: {
  id: string;
  activo: boolean;
  toggleAction: (id: string, activo: boolean) => Promise<{ error?: string } | void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleClick() {
    setError(undefined);
    startTransition(async () => {
      const result = await toggleAction(id, !activo);
      if (result?.error) {
        setError(result.error);
      } else {
        sileo.success({ title: activo ? "Desactivado" : "Activado" });
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`h-7 rounded-md border px-2 text-xs font-semibold disabled:opacity-50 ${
          activo
            ? "border-destructive/40 text-destructive hover:bg-destructive/5"
            : "border-border text-foreground hover:bg-muted"
        }`}
      >
        {pending ? "..." : activo ? "Desactivar" : "Activar"}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
