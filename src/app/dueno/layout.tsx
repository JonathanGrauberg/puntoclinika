import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import { requireDueno } from "@/lib/dueno";

export const metadata: Metadata = { title: "Panel del dueño", robots: { index: false, follow: false } };

export default async function DuenoLayout({ children }: { children: React.ReactNode }) {
  const dueno = await requireDueno();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-primary" />
            <span className="text-base font-bold text-foreground">Panel del dueño</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">{dueno.email}</span>
          </div>
          <nav className="flex items-center gap-1 text-sm font-semibold">
            <Link href="/dueno" className="rounded-lg px-3 py-2 text-foreground hover:bg-muted">
              Cuentas
            </Link>
            <Link href="/dueno/catalogo" className="rounded-lg px-3 py-2 text-foreground hover:bg-muted">
              Catálogo y planes
            </Link>
            <Link href="/dashboard" className="flex items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
              Volver a la app
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
