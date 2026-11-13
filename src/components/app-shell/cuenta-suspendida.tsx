export function CuentaSuspendida({ centro }: { centro: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-lg font-bold text-foreground">La cuenta de {centro} está suspendida</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Por ahora no se puede usar. Si creés que es un error, escribinos y lo resolvemos enseguida.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">Tus datos están guardados y no se perdió nada.</p>
      </div>
    </div>
  );
}
