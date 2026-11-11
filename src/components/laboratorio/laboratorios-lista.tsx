"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Mail, Pencil, Phone, Plus, Trash2, X } from "lucide-react";
import { sileo } from "sileo";
import {
  actualizarLaboratorio,
  crearLaboratorio,
  eliminarLaboratorio,
  type LaboratorioVisto,
} from "@/lib/actions/laboratorio";

const input =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-foreground";

const SUGERENCIAS = ["Prótesis removible", "Prótesis fija", "Zirconio", "Disilicato", "Implantes", "Ortodoncia"];

interface Borrador {
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  especialidades: string[];
  notas: string;
  activo: boolean;
}

const VACIO: Borrador = {
  nombre: "",
  contacto: "",
  telefono: "",
  email: "",
  especialidades: [],
  notas: "",
  activo: true,
};

function Formulario({
  laboratorio,
  onClose,
}: {
  laboratorio: LaboratorioVisto | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [b, setB] = useState<Borrador>(
    laboratorio
      ? {
          nombre: laboratorio.nombre,
          contacto: laboratorio.contacto ?? "",
          telefono: laboratorio.telefono ?? "",
          email: laboratorio.email ?? "",
          especialidades: laboratorio.especialidades,
          notas: laboratorio.notas ?? "",
          activo: laboratorio.activo,
        }
      : VACIO
  );
  const [otra, setOtra] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  function alternar(e: string) {
    setB((x) => ({
      ...x,
      especialidades: x.especialidades.includes(e) ? x.especialidades.filter((y) => y !== e) : [...x.especialidades, e],
    }));
  }

  function sumarOtra() {
    const v = otra.trim();
    if (v && !b.especialidades.includes(v)) setB((x) => ({ ...x, especialidades: [...x.especialidades, v] }));
    setOtra("");
  }

  function guardar() {
    start(async () => {
      const datos = {
        nombre: b.nombre,
        contacto: b.contacto,
        telefono: b.telefono,
        email: b.email,
        especialidades: b.especialidades,
        notas: b.notas,
        activo: b.activo,
      };
      const r = laboratorio ? await actualizarLaboratorio(laboratorio.id, datos) : await crearLaboratorio(datos);
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: laboratorio ? "Guardado" : "Laboratorio agregado" });
      onClose();
      router.refresh();
    });
  }

  function borrar() {
    if (!laboratorio) return;
    start(async () => {
      const r = await eliminarLaboratorio(laboratorio.id);
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: "Laboratorio borrado" });
      onClose();
      router.refresh();
    });
  }

  const todas = [...new Set([...SUGERENCIAS, ...b.especialidades])];

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-semibold text-foreground">
        Nombre del laboratorio *
        <input className={input} value={b.nombre} onChange={(e) => setB({ ...b, nombre: e.target.value })} autoFocus />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold text-foreground">
          Persona de contacto
          <input className={input} value={b.contacto} onChange={(e) => setB({ ...b, contacto: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-foreground">
          Teléfono / WhatsApp
          <input
            className={input}
            type="tel"
            value={b.telefono}
            onChange={(e) => setB({ ...b, telefono: e.target.value })}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold text-foreground">
        Email
        <input className={input} type="email" value={b.email} onChange={(e) => setB({ ...b, email: e.target.value })} />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-foreground">Qué hace (tocá para marcar)</span>
        <div className="flex flex-wrap gap-2">
          {todas.map((e) => {
            const on = b.especialidades.includes(e);
            return (
              <button
                key={e}
                type="button"
                onClick={() => alternar(e)}
                aria-pressed={on}
                className={`h-10 rounded-full border px-4 text-sm font-semibold ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            className={input}
            placeholder="Otra especialidad..."
            value={otra}
            onChange={(e) => setOtra(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sumarOtra();
              }
            }}
          />
          <button
            type="button"
            onClick={sumarOtra}
            className="h-11 shrink-0 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Sumar
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm font-semibold text-foreground">
        Notas
        <textarea
          className="min-h-20 rounded-xl border border-border bg-background p-3 text-base text-foreground outline-none focus:border-foreground"
          value={b.notas}
          onChange={(e) => setB({ ...b, notas: e.target.value })}
        />
      </label>

      {laboratorio && (
        <label className="flex min-h-11 items-center gap-3 text-base font-semibold text-foreground">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={b.activo}
            onChange={(e) => setB({ ...b, activo: e.target.checked })}
          />
          Lo sigo usando
        </label>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={pending || !b.nombre.trim()}
        className="h-12 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Guardando..." : laboratorio ? "Guardar cambios" : "Agregar laboratorio"}
      </button>

      {laboratorio &&
        (confirmando ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/40 p-3">
            <span className="text-sm text-foreground">
              ¿Borrar este laboratorio? Los trabajos que lo tenían fijo quedan sin laboratorio.
            </span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={borrar}
                disabled={pending}
                className="h-10 rounded-lg bg-destructive px-3 text-sm font-semibold text-destructive-foreground"
              >
                Sí, borrar
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="h-10 rounded-lg border border-border px-3 text-sm font-semibold"
              >
                No
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/5"
          >
            <Trash2 className="h-4 w-4" />
            Borrar laboratorio
          </button>
        ))}
    </div>
  );
}

export function LaboratoriosLista({
  laboratorios,
  puedeEditar,
}: {
  laboratorios: LaboratorioVisto[];
  puedeEditar: boolean;
}) {
  // undefined = cerrado, null = nuevo, objeto = editar
  const [abierto, setAbierto] = useState<LaboratorioVisto | null | undefined>(undefined);

  return (
    <div className="flex flex-col gap-4">
      {puedeEditar && (
        <button
          type="button"
          onClick={() => setAbierto(null)}
          className="flex h-12 items-center justify-center gap-2 self-start rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-5 w-5" />
          Agregar laboratorio
        </button>
      )}

      {laboratorios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-base font-semibold text-foreground">Todavía no cargaste ningún laboratorio</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Agregá el que usás y después elegilo en cada trabajo para que se complete solo en los pedidos.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {laboratorios.map((l) => (
            <li key={l.id} className={`rounded-2xl border border-border bg-card p-4 ${l.activo ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-foreground">{l.nombre}</p>
                  {l.contacto && <p className="truncate text-sm text-muted-foreground">{l.contacto}</p>}
                </div>
                {puedeEditar && (
                  <button
                    type="button"
                    onClick={() => setAbierto(l)}
                    aria-label={`Editar ${l.nombre}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {l.telefono && (
                  <a
                    href={`tel:${l.telefono}`}
                    className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    <Phone className="h-4 w-4" />
                    {l.telefono}
                  </a>
                )}
                {l.email && (
                  <a
                    href={`mailto:${l.email}`}
                    className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    <Mail className="h-4 w-4" />
                    {l.email}
                  </a>
                )}
              </div>
              {l.especialidades.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.especialidades.map((e) => (
                    <span key={e} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                      {e}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {l.trabajos === 0
                  ? "Sin trabajos fijos"
                  : `Fijo en ${l.trabajos} ${l.trabajos === 1 ? "trabajo" : "trabajos"}`}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Dialog.Root open={abierto !== undefined} onOpenChange={(o) => !o && setAbierto(undefined)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl border border-border bg-background p-5 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-xl font-bold text-foreground">
                {abierto ? "Editar laboratorio" : "Nuevo laboratorio"}
              </Dialog.Title>
              <Dialog.Close
                aria-label="Cerrar"
                className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Datos del laboratorio</Dialog.Description>
            {abierto !== undefined && (
              <Formulario key={abierto?.id ?? "nuevo"} laboratorio={abierto} onClose={() => setAbierto(undefined)} />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
