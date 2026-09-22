"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { ModuloKey } from "@prisma/client";
import { Building2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_ITEMS, NAV_ITEM_CONFIG } from "./nav-items";
import { NavLink } from "./nav-link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SidebarProps {
  tenantName: string;
  enabledModules: ModuloKey[];
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
}

export function Sidebar({
  tenantName,
  enabledModules,
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
}: SidebarProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const logoSrc = mounted && resolvedTheme === "dark" ? "/brand/logo-blanco.png" : "/brand/logo-negro.png";

  const visibleItems = NAV_ITEMS.filter((item) => !item.modulo || enabledModules.includes(item.modulo));

  return (
    <aside className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-3 shadow-bento">
      <div className={cn("flex items-center pt-1", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <Image src={logoSrc} alt=".clinika" width={930} height={230} className="h-5 w-auto" priority />
        )}
        {onToggleCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{collapsed ? "Expandir menú" : "Colapsar menú"}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <nav className={cn("flex flex-1 flex-col gap-0.5", collapsed && "items-center")}>
        {visibleItems.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className={cn("flex flex-col gap-0.5 border-t border-border pt-3", collapsed && "items-center")}>
        <NavLink item={NAV_ITEM_CONFIG} collapsed={collapsed} onNavigate={onNavigate} />

        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary">
                <Building2 className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{tenantName}</TooltipContent>
          </Tooltip>
        ) : (
          <div className="mt-1 flex items-center gap-2.5 rounded-lg bg-muted px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Building2 className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground">{tenantName}</p>
              <p className="text-[11px] text-muted-foreground">Centro activo</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
