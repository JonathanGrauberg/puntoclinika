"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { ModuloKey } from "@prisma/client";
import { Building2 } from "lucide-react";
import { NAV_ITEMS, NAV_ITEM_CONFIG } from "./nav-items";
import { NavLink } from "./nav-link";

interface SidebarProps {
  tenantName: string;
  enabledModules: ModuloKey[];
  onNavigate?: () => void;
}

export function Sidebar({ tenantName, enabledModules, onNavigate }: SidebarProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const logoSrc =
    mounted && resolvedTheme === "dark" ? "/brand/logo-dark.png" : "/brand/logo-light.png";

  const visibleItems = NAV_ITEMS.filter((item) => !item.modulo || enabledModules.includes(item.modulo));

  return (
    <aside className="flex h-full w-full flex-col gap-6 rounded-2xl border border-border bg-card p-5 shadow-bento">
      <div className="px-2 pt-1">
        <Image src={logoSrc} alt=".clinika" width={140} height={40} className="h-auto w-28" priority />
      </div>

      <nav className="flex flex-1 flex-col gap-1.5">
        {visibleItems.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="flex flex-col gap-1.5 border-t border-border pt-4">
        <NavLink item={NAV_ITEM_CONFIG} onNavigate={onNavigate} />
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-muted px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{tenantName}</p>
            <p className="text-xs text-muted-foreground">Centro activo</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
