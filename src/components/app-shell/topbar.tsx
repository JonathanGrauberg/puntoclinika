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
    <header className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-bento">
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Abrir menú"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Menú</TooltipContent>
        </Tooltip>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
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
