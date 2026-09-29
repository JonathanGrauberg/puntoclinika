"use client";

import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell } from "lucide-react";
import { obtenerNotificacionesTurnos } from "@/lib/actions/turnos";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const POLL_MS = 30_000;

interface NotificacionTurno {
  id: string;
  pacienteId: string;
  fechaHora: Date;
  estado: string;
  paciente: { nombre: string; apellido: string };
  profesional: { nombre: string; apellido: string };
}

const ESTADO_LABEL: Record<string, string> = {
  EN_ESPERA: "Ya está en sala de espera",
  RESERVADO: "Turno próximo",
  CONFIRMADO: "Turno próximo",
};

function formatHora(fecha: Date) {
  return new Date(fecha).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState<NotificacionTurno[]>([]);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const data = await obtenerNotificacionesTurnos();
        if (activo) setNotificaciones(data);
      } catch {
        // silencioso — no vale la pena molestar con un toast por esto
      }
    }
    cargar();
    const interval = setInterval(cargar, POLL_MS);
    return () => {
      activo = false;
      clearInterval(interval);
    };
  }, []);

  const hayUrgentes = notificaciones.length > 0;

  return (
    <DropdownMenu.Root>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Notificaciones"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
            >
              <Bell className={`h-4 w-4 ${hayUrgentes ? "animate-pulse" : ""}`} />
              {hayUrgentes && (
                <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                </span>
              )}
            </button>
          </DropdownMenu.Trigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Notificaciones</TooltipContent>
      </Tooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-72 rounded-md border border-border bg-card p-1 shadow-[0_2px_12px_rgb(0_0_0_/_0.12)]"
        >
          {notificaciones.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nada que necesite atención ahora.</p>
          ) : (
            notificaciones.map((n) => (
              <DropdownMenu.Item key={n.id} asChild className="cursor-pointer rounded-md text-sm outline-none">
                <a
                  href={`/sala-espera`}
                  className="flex flex-col gap-0.5 px-3 py-2 text-foreground hover:bg-muted"
                >
                  <span className="font-semibold">
                    {formatHora(n.fechaHora)} — {n.paciente.apellido}, {n.paciente.nombre}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ESTADO_LABEL[n.estado] ?? n.estado} — Dr/a. {n.profesional.apellido}
                  </span>
                </a>
              </DropdownMenu.Item>
            ))
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
