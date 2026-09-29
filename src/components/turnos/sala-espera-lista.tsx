"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { sileo } from "sileo";
import {
  marcarEnEspera,
  marcarEnAtencion,
  marcarAtendido,
  marcarAusente,
} from "@/lib/actions/turnos";

export interface TurnoSala {
  id: string;
  pacienteId: string;
  fechaHora: Date;
  estado: string;
  paciente: { nombre: string; apellido: string };
  profesional: { nombre: string; apellido: string };
  practica: { nombre: string };
  consultorio: { nombre: string } | null;
}

const ESTADO_LABEL: Record<string, string> = {
  RESERVADO: "Reservado",
  CONFIRMADO: "Confirmado",
  EN_ESPERA: "En espera",
  EN_ATENCION: "En atención",
  ATENDIDO: "Atendido",
  AUSENTE: "Ausente",
};

const ESTADO_BADGE: Record<string, string> = {
  RESERVADO: "bg-muted text-muted-foreground",
  CONFIRMADO: "bg-muted text-muted-foreground",
  EN_ESPERA: "bg-success/15 text-success",
  EN_ATENCION: "bg-primary/15 text-primary",
  ATENDIDO: "bg-muted text-muted-foreground",
  AUSENTE: "bg-destructive/15 text-destructive",
};

// Orden de atención: en curso primero, después quién espera, después los
// que todavía no llegaron, y al final del todo lo ya cerrado del día.
const ORDEN_ESTADO: Record<string, number> = {
  EN_ATENCION: 0,
  EN_ESPERA: 1,
  CONFIRMADO: 2,
  RESERVADO: 2,
  ATENDIDO: 3,
  AUSENTE: 3,
};

function formatHora(fecha: Date) {
  return new Date(fecha).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function SalaEsperaLista({ turnos }: { turnos: TurnoSala[] }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(interval);
  }, [router]);

  if (turnos.length === 0) {
    return (
      <p className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No hay turnos para hoy.
      </p>
    );
  }

  const ordenados = [...turnos].sort((a, b) => {
    const diff = (ORDEN_ESTADO[a.estado] ?? 9) - (ORDEN_ESTADO[b.estado] ?? 9);
    return diff !== 0 ? diff : new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.refresh()}
          className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </button>
      </div>
      {ordenados.map((t) => (
        <TurnoRow key={t.id} turno={t} />
      ))}
    </div>
  );
}

function TurnoRow({ turno }: { turno: TurnoSala }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const terminado = turno.estado === "ATENDIDO" || turno.estado === "AUSENTE";

  function handleLlegada() {
    startTransition(async () => {
      await marcarEnEspera(turno.id);
      sileo.success({ title: "Llegada registrada" });
      router.refresh();
    });
  }

  function handleAusente() {
    startTransition(async () => {
      await marcarAusente(turno.id);
      sileo.success({ title: "Marcado ausente" });
      router.refresh();
    });
  }

  function handleAtender() {
    startTransition(async () => {
      await marcarEnAtencion(turno.id);
      router.push(`/pacientes/${turno.pacienteId}/consulta?turnoId=${turno.id}`);
    });
  }

  function handleCerrar() {
    startTransition(async () => {
      await marcarAtendido(turno.id);
      sileo.success({ title: "Consulta cerrada" });
      router.refresh();
    });
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4 ${
        terminado ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <span className="w-14 shrink-0 text-sm font-semibold text-foreground">{formatHora(turno.fechaHora)}</span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {turno.paciente.apellido}, {turno.paciente.nombre}
          </p>
          <p className="text-xs text-muted-foreground">
            {turno.practica.nombre} — Dr/a. {turno.profesional.apellido}
            {turno.consultorio && ` — ${turno.consultorio.nombre}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_BADGE[turno.estado] ?? ""}`}>
          {ESTADO_LABEL[turno.estado] ?? turno.estado}
        </span>

        {!terminado && (
          <>
            {(turno.estado === "RESERVADO" || turno.estado === "CONFIRMADO") && (
              <>
                <button
                  type="button"
                  onClick={handleLlegada}
                  disabled={pending}
                  className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Marcar llegada
                </button>
                <button
                  type="button"
                  onClick={handleAusente}
                  disabled={pending}
                  className="h-8 rounded-md border border-destructive/40 px-3 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50"
                >
                  Ausente
                </button>
              </>
            )}
            {turno.estado === "EN_ESPERA" && (
              <button
                type="button"
                onClick={handleAtender}
                disabled={pending}
                className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Atender
              </button>
            )}
            {turno.estado === "EN_ATENCION" && (
              <>
                <a
                  href={`/pacientes/${turno.pacienteId}/consulta?turnoId=${turno.id}`}
                  className="h-8 rounded-md border border-border px-3 text-xs font-semibold leading-8 text-foreground hover:bg-muted"
                >
                  Ir al panel
                </a>
                <button
                  type="button"
                  onClick={handleCerrar}
                  disabled={pending}
                  className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  Cerrar consulta
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
