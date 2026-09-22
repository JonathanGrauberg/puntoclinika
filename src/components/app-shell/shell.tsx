"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ModuloKey } from "@prisma/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface ShellProps {
  title: string;
  tenantName: string;
  userName: string;
  rol: string;
  enabledModules: ModuloKey[];
  children: React.ReactNode;
}

const COLLAPSE_KEY = "clinika:sidebar-collapsed";

export function Shell({ title, tenantName, userName, rol, enabledModules, children }: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // localStorage puede no estar disponible (modo privado, etc.) — no es crítico.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // idem arriba
      }
      return next;
    });
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen">
        <div className={`hidden shrink-0 transition-[width] duration-200 lg:block ${collapsed ? "w-16" : "w-60"}`}>
          <div className="sticky top-0 h-screen">
            <Sidebar
              tenantName={tenantName}
              enabledModules={enabledModules}
              rol={rol}
              collapsed={collapsed}
              onToggleCollapsed={toggleCollapsed}
            />
          </div>
        </div>

        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 lg:hidden" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[80vw] max-w-72 lg:hidden">
              <Dialog.Title className="sr-only">Menú de navegación</Dialog.Title>
              <div className="relative h-full">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Cerrar menú"
                    className="absolute -right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
                <Sidebar
                  tenantName={tenantName}
                  enabledModules={enabledModules}
                  rol={rol}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <div className="flex min-w-0 flex-1 flex-col gap-4 p-3 lg:p-4">
          <Topbar title={title} userName={userName} onOpenMenu={() => setMobileOpen(true)} />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
