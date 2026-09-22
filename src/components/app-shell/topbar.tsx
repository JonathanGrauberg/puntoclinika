"use client";

import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Topbar({
  title,
  onOpenMenu,
  userName,
}: {
  title: string;
  onOpenMenu: () => void;
  userName: string;
}) {
  return (
    <header className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Abrir menú"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Menú</TooltipContent>
        </Tooltip>
        <h1 className="text-lg font-bold text-foreground sm:text-xl">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {userName
                .split(" ")
                .slice(0, 2)
                .map((s) => s[0])
                .join("")
                .toUpperCase()}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">{userName}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
