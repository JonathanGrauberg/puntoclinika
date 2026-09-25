"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-md border border-border p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">.clinika</p>
        <h1 className="mt-3 text-xl font-bold text-foreground">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tuvimos un problema inesperado. Probá de nuevo — si sigue pasando, avisale a soporte.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:opacity-90"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
