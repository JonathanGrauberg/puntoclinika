import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-md border border-border p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">.clinika</p>
        <h1 className="mt-3 text-xl font-bold text-foreground">No encontramos esta página</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El link puede estar roto o la página ya no existe. Volvé al inicio.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:opacity-90"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
