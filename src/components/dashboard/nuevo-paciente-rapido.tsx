"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { sileo } from "sileo";
import { crearPacienteRapido } from "@/lib/actions/pacientes";

const inputClass =
  "h-12 rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-foreground";

/** Lo que se escribió en el buscador se reparte: la última palabra es el apellido, el resto el nombre. */
function repartirNombre(texto: string) {
  const partes = texto.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { nombre: "", apellido: "" };
  if (partes.length === 1) return { nombre: partes[0], apellido: "" };
  return { nombre: partes.slice(0, -1).join(" "), apellido: partes[partes.length - 1] };
}

export function NuevoPacienteRapido({
  abierto,
  onClose,
  textoInicial = "",
}: {
  abierto: boolean;
  onClose: () => void;
  textoInicial?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [valores, setValores] = useState({ nombre: "", apellido: "", telefono: "" });

  useEffect(() => {
    if (!abierto) return;
    const esTelefono = /^\d[\d\s-]*$/.test(textoInicial);
    setValores(
      esTelefono
        ? { nombre: "", apellido: "", telefono: textoInicial }
        : { ...repartirNombre(textoInicial), telefono: "" }
    );
    setError(undefined);
  }, [abierto, textoInicial]);

  function guardar(formData: FormData) {
    startTransition(async () => {
      const res = await crearPacienteRapido(formData);
      if (res.error || !res.id) {
        setError(res.error ?? "No se pudo guardar.");
        return;
      }
      sileo.success({ title: "Paciente agregado" });
      onClose();
      router.push(`/pacientes/${res.id}`);
    });
  }

  return (
    <Dialog.Root open={abierto} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Dialog.Title className="text-lg font-bold text-foreground">Nuevo paciente</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Con nombre y teléfono alcanza. El resto lo completás después.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <form action={guardar} className="flex flex-col gap-3">
            <input
              name="nombre"
              placeholder="Nombre *"
              required
              autoFocus
              value={valores.nombre}
              onChange={(e) => setValores((v) => ({ ...v, nombre: e.target.value }))}
              className={inputClass}
            />
            <input
              name="apellido"
              placeholder="Apellido *"
              required
              value={valores.apellido}
              onChange={(e) => setValores((v) => ({ ...v, apellido: e.target.value }))}
              className={inputClass}
            />
            <input
              name="telefono"
              type="tel"
              inputMode="tel"
              placeholder="Teléfono"
              value={valores.telefono}
              onChange={(e) => setValores((v) => ({ ...v, telefono: e.target.value }))}
              className={inputClass}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="mt-1 h-12 rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar paciente"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
