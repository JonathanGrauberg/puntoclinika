"use client";

import { Menu } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cerrarSesion } from "@/lib/actions/auth";

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
        <DropdownMenu.Root>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Menú de ${userName}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                >
                  {userName
                    .split(" ")
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")
                    .toUpperCase()}
                </button>
              </DropdownMenu.Trigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">{userName}</TooltipContent>
          </Tooltip>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-40 rounded-md border border-border bg-card p-1 shadow-[0_2px_12px_rgb(0_0_0_/_0.12)]"
            >
              <DropdownMenu.Item
                onSelect={() => cerrarSesion()}
                className="cursor-pointer rounded-md px-3 py-2 text-sm text-foreground outline-none hover:bg-muted"
              >
                Cerrar sesión
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
