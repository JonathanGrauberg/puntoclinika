"use client";

export function ImprimirButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-9 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted"
    >
      Imprimir
    </button>
  );
}
