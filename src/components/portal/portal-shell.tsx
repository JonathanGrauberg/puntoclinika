"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { logoutPortal } from "@/lib/actions/portal";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal/turnos", label: "Mis turnos" },
  { href: "/portal/estudios", label: "Mis estudios" },
];

export function PortalShell({
  pacienteNombre,
  children,
}: {
  pacienteNombre: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const logoSrc = mounted && resolvedTheme === "dark" ? "/brand/logo-blanco.png" : "/brand/logo-negro.png";

  return (
    <TooltipProvider delayDuration={300}>
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between rounded-md border border-border bg-card p-4">
        <Image src={logoSrc} alt=".clinika" width={930} height={230} className="h-5 w-auto" priority />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={logoutPortal}>
            <button
              type="submit"
              className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-col gap-1 px-1">
        <p className="text-sm text-muted-foreground">Hola,</p>
        <h1 className="text-xl font-bold text-foreground">{pacienteNombre}</h1>
      </div>

      <nav className="flex gap-2">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "h-10 rounded-md border px-4 text-sm font-semibold leading-10 transition-colors",
              pathname.startsWith(item.href)
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="flex-1">{children}</main>
    </div>
    </TooltipProvider>
  );
}
