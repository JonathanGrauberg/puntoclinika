import type { Metadata } from "next";
import Link from "next/link";
import { confirmarEmail } from "@/lib/actions/registro";

export const metadata: Metadata = { title: "Confirmar email — .clinika", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerificarEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const resultado = token ? await confirmarEmail(token) : { ok: false };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">.clinika</p>
        <h1 className="mt-3 text-xl font-bold text-foreground">
          {resultado.ok ? "¡Email confirmado!" : "Este link no sirve"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {resultado.ok
            ? "Gracias. Ya podés seguir usando .clinika."
            : "Puede haber vencido o ya se usó. Ingresá y pedí uno nuevo desde el aviso de arriba."}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground hover:opacity-90"
        >
          Ir a mi cuenta
        </Link>
      </div>
    </div>
  );
}
