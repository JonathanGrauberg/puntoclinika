"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign } from "lucide-react";
import { CobroModal, type TurnoParaCobrar } from "./cobro-modal";

export function TurnosParaCobrar({ turnos }: { turnos: TurnoParaCobrar[] }) {
  const router = useRouter();
  const [seleccionado, setSeleccionado] = useState<TurnoParaCobrar | null>(null);
  const [open, setOpen] = useState(false);

  if (turnos.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No hay turnos pendientes de cobro ese día.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Hora</th>
              <th className="px-4 py-3 font-semibold">Paciente</th>
              <th className="px-4 py-3 font-semibold">Profesional</th>
              <th className="px-4 py-3 font-semibold">Práctica</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {turnos.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(t.fechaHora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {t.paciente.apellido}, {t.paciente.nombre}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {t.profesional.apellido}, {t.profesional.nombre}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.practica.nombre}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setSeleccionado(t);
                      setOpen(true);
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <DollarSign className="h-4 w-4" />
                    Cobrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CobroModal
        turno={seleccionado}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) router.refresh();
        }}
      />
    </>
  );
}
