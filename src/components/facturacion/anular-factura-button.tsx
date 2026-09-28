"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { anularFactura } from "@/lib/actions/facturacion";

export function AnularFacturaButton({ facturaId }: { facturaId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  function handleConfirmar() {
    startTransition(async () => {
      await anularFactura(facturaId);
      router.refresh();
    });
  }

  if (confirmando) {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleConfirmar}
          disabled={pending}
          className="h-7 rounded-md bg-destructive px-2 text-xs font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Anulando..." : "Sí, anular"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="h-7 rounded-md border border-border px-2 text-xs font-semibold text-foreground hover:bg-muted"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      className="h-7 rounded-md border border-destructive/40 px-2 text-xs font-semibold text-destructive hover:bg-destructive/5"
    >
      Anular
    </button>
  );
}
