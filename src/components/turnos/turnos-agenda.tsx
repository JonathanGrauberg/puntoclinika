"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TurnoModal, type PracticaOption, type TurnoExistente } from "./turno-modal";
import type { PacienteOption } from "./paciente-picker";
import { addDays, diaLabel, toISODate } from "@/lib/date-utils";

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_MIN = 30;
const SLOT_HEIGHT = 36;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;

interface TurnoConDatos {
  id: string;
  pacienteId: string;
  practicaId: string;
  fechaHora: Date;
  duracionMin: number;
  notas: string | null;
  paciente: { nombre: string; apellido: string };
  practica: { nombre: string };
}

export function TurnosAgenda({
  weekStart,
  profesionalId,
  turnos,
  pacientes,
  practicas,
}: {
  weekStart: Date;
  profesionalId: string;
  turnos: TurnoConDatos[];
  pacientes: PacienteOption[];
  practicas: PracticaOption[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSlot, setModalSlot] = useState<{ fecha: Date; hora: string } | null>(null);
  const [modalTurno, setModalTurno] = useState<TurnoExistente | null>(null);
  // Fuerza remount del modal en cada apertura para que nunca arrastre el
  // paciente/práctica seleccionados en la apertura anterior.
  const [modalKey, setModalKey] = useState(0);

  const dias = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const totalMin = START_HOUR * 60 + i * SLOT_MIN;
    return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
  });

  function openCreate(dia: Date, hora: string) {
    setModalTurno(null);
    setModalSlot({ fecha: dia, hora });
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(turno: TurnoConDatos) {
    setModalTurno({
      id: turno.id,
      pacienteId: turno.pacienteId,
      profesionalId,
      practicaId: turno.practicaId,
      fechaHora: turno.fechaHora,
      notas: turno.notas,
    });
    setModalSlot(null);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }

  function turnosDelDia(dia: Date) {
    return turnos.filter((t) => toISODate(new Date(t.fechaHora)) === toISODate(dia));
  }

  function offsetPx(fecha: Date) {
    const minutos = fecha.getHours() * 60 + fecha.getMinutes() - START_HOUR * 60;
    return (minutos / SLOT_MIN) * SLOT_HEIGHT;
  }

  const prevWeek = toISODate(addDays(weekStart, -7));
  const nextWeek = toISODate(addDays(weekStart, 7));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`?profesionalId=${profesionalId}&week=${prevWeek}`}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={`?profesionalId=${profesionalId}&week=${nextWeek}`}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <span className="ml-2 text-sm font-semibold text-foreground">
            {dias[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} –{" "}
            {dias[5].toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
          </span>
        </div>

        <button
          onClick={() => openCreate(dias[0], "08:00")}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuevo turno
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <div className="grid min-w-[820px] grid-cols-[64px_repeat(6,1fr)]">
          <div className="border-b border-r border-border" />
          {dias.map((dia) => (
            <div key={dia.toISOString()} className="border-b border-r border-border px-2 py-2 text-center last:border-r-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">{diaLabel(dia)}</p>
              <p className="text-sm font-bold text-foreground">{dia.getDate()}</p>
            </div>
          ))}

          <div className="border-r border-border">
            {slots.map((hora, i) => (
              <div
                key={hora}
                style={{ height: SLOT_HEIGHT }}
                className="flex items-start justify-end border-b border-border pr-2 text-[11px] text-muted-foreground"
              >
                {i % 2 === 0 ? hora : ""}
              </div>
            ))}
          </div>

          {dias.map((dia) => (
            <div key={dia.toISOString()} className="relative border-r border-border last:border-r-0">
              {slots.map((hora) => (
                <button
                  key={hora}
                  type="button"
                  style={{ height: SLOT_HEIGHT }}
                  onClick={() => openCreate(dia, hora)}
                  className="block w-full border-b border-border hover:bg-muted/60"
                />
              ))}

              {turnosDelDia(dia).map((t) => {
                const fecha = new Date(t.fechaHora);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openEdit(t)}
                    style={{
                      top: offsetPx(fecha),
                      height: Math.max((t.duracionMin / SLOT_MIN) * SLOT_HEIGHT - 2, SLOT_HEIGHT - 2),
                    }}
                    className="absolute left-0.5 right-0.5 overflow-hidden rounded-md bg-foreground px-2 py-1 text-left text-background"
                  >
                    <p className="truncate text-xs font-semibold">
                      {t.paciente.apellido}, {t.paciente.nombre}
                    </p>
                    <p className="truncate text-[11px] opacity-80">{t.practica.nombre}</p>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <TurnoModal
        key={modalKey}
        open={modalOpen}
        onOpenChange={(next) => {
          setModalOpen(next);
          if (!next) router.refresh();
        }}
        slot={modalSlot}
        turno={modalTurno}
        profesionalId={profesionalId}
        pacientes={pacientes}
        practicas={practicas}
      />
    </div>
  );
}
