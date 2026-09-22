"use client";

import { useState } from "react";
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
  enabledModules: ModuloKey[];
  children: React.ReactNode;
}

export function Shell({ title, tenantName, userName, enabledModules, children }: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mx-auto flex min-h-screen max-w-[1400px] gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-6 h-[calc(100vh-3rem)]">
            <Sidebar tenantName={tenantName} enabledModules={enabledModules} />
          </div>
        </div>

        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 lg:hidden" />
            <Dialog.Content className="fixed inset-y-4 left-4 z-50 w-[85vw] max-w-80 lg:hidden">
              <Dialog.Title className="sr-only">Menú de navegación</Dialog.Title>
              <div className="relative h-full">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Cerrar menú"
                    className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-bento"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
                <Sidebar
                  tenantName={tenantName}
                  enabledModules={enabledModules}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-6">
          <Topbar title={title} userName={userName} onOpenMenu={() => setMobileOpen(true)} />
          <main className="flex-1 rounded-2xl border border-border bg-card p-5 shadow-bento lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
