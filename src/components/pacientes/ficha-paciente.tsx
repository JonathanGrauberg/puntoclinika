"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import type { Paciente } from "@prisma/client";
import { PacienteForm } from "./paciente-form";
import { PacienteVista } from "./paciente-vista";

export function FichaPaciente({
  paciente,
  puedeEditar,
  moduloObrasSociales,
}: {
  paciente: Paciente;
  puedeEditar: boolean;
  moduloObrasSociales: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);

  function handleSaved() {
    setEditando(false);
    router.refresh();
  }

  return (
    <div className="rounded-md border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/pacientes"
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        {puedeEditar && !editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
        )}
      </div>

      {editando ? (
        <PacienteForm
          mode="edit"
          paciente={paciente}
          moduloObrasSociales={moduloObrasSociales}
          onSaved={handleSaved}
          onCancel={() => setEditando(false)}
        />
      ) : (
        <PacienteVista paciente={paciente} moduloObrasSociales={moduloObrasSociales} />
      )}
    </div>
  );
}
