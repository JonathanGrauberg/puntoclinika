"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { sileo } from "sileo";
import {
  actualizarTrabajo,
  crearTrabajo,
  eliminarTrabajo,
  type LaboratorioVisto,
  type TrabajoVista,
} from "@/lib/actions/laboratorio";
import { CATEGORIA_NUEVA_POR_DEFECTO } from "@/lib/laboratorio-catalogo";

const input =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-foreground";

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function FilaTrabajo({
  trabajo,
  categorias,
  laboratorios,
  puedeEditar,
}: {
  trabajo: TrabajoVista;
  categorias: string[];
  laboratorios: LaboratorioVisto[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [nombre, setNombre] = useState(trabajo.nombre);
  const [categoria, setCategoria] = useState(trabajo.categoria);
  const [laboratorioId, setLaboratorioId] = useState(trabajo.laboratorioId ?? "");
  const lab = laboratorios.find((l) => l.id === trabajo.laboratorioId);

  function guardar() {
    start(async () => {
      const r = await actualizarTrabajo(trabajo.id, { nombre, categoria, laboratorioId: laboratorioId || null });
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: "Guardado" });
      setEditando(false);
      router.refresh();
    });
  }

  function borrar() {
    start(async () => {
      const r = await eliminarTrabajo(trabajo.id);
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: "Trabajo borrado" });
      router.refresh();
    });
  }

  if (editando) {
    return (
      <li className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-muted/30 p-3">
        <input className={input} value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre" />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={input}
            value={categoria}
            list="categorias-lab"
            onChange={(e) => setCategoria(e.target.value)}
            aria-label="Categoría"
          />
          <select className={input} value={laboratorioId} onChange={(e) => setLaboratorioId(e.target.value)}>
            <option value="">Sin laboratorio fijo</option>
            {laboratorios
              .filter((l) => l.activo || l.id === trabajo.laboratorioId)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
          </select>
        </div>
        <datalist id="categorias-lab">
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="h-11 rounded-xl border border-border px-4 text-base font-semibold text-foreground hover:bg-muted"
          >
            Cancelar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base text-foreground">{trabajo.nombre}</p>
        {lab && <p className="truncate text-xs text-muted-foreground">Siempre en: {lab.nombre}</p>}
      </div>
      {puedeEditar &&
        (confirmando ? (
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">¿Borrar?</span>
            <button
              type="button"
              onClick={borrar}
              disabled={pending}
              className="h-10 rounded-lg bg-destructive px-3 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="h-10 rounded-lg border border-border px-3 text-sm font-semibold text-foreground"
            >
              No
            </button>
          </div>
        ) : (
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setEditando(true)}
              aria-label={`Editar ${trabajo.nombre}`}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              aria-label={`Borrar ${trabajo.nombre}`}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
    </li>
  );
}

export function TrabajosCatalogo({
  trabajos,
  laboratorios,
  puedeEditar,
}: {
  trabajos: TrabajoVista[];
  laboratorios: LaboratorioVisto[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [laboratorioId, setLaboratorioId] = useState("");

  const categorias = useMemo(() => [...new Set(trabajos.map((t) => t.categoria))].sort(), [trabajos]);
  const grupos = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const filtrados = q ? trabajos.filter((t) => normalizar(`${t.nombre} ${t.categoria}`).includes(q)) : trabajos;
    const mapa = new Map<string, TrabajoVista[]>();
    for (const t of filtrados) mapa.set(t.categoria, [...(mapa.get(t.categoria) ?? []), t]);
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [trabajos, busqueda]);

  function agregar() {
    start(async () => {
      const r = await crearTrabajo({
        nombre,
        categoria: categoria.trim() || CATEGORIA_NUEVA_POR_DEFECTO,
        laboratorioId: laboratorioId || null,
      });
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: "Trabajo agregado" });
      setNombre("");
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className={input}
          placeholder="Buscar un trabajo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {puedeEditar && (
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground hover:opacity-90"
          >
            {abierto ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {abierto ? "Cerrar" : "Agregar trabajo"}
          </button>
        )}
      </div>

      {abierto && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
          <input
            className={input}
            placeholder="Nombre del trabajo (ej: Corona de zirconio)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={input}
              placeholder={`Categoría (ej: ${CATEGORIA_NUEVA_POR_DEFECTO})`}
              list="categorias-lab"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
            <select className={input} value={laboratorioId} onChange={(e) => setLaboratorioId(e.target.value)}>
              <option value="">Sin laboratorio fijo</option>
              {laboratorios
                .filter((l) => l.activo)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
            </select>
          </div>
          <datalist id="categorias-lab">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={agregar}
            disabled={pending || !nombre.trim()}
            className="h-12 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Guardando..." : "Agregar al catálogo"}
          </button>
        </div>
      )}

      {trabajos.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
          No hay trabajos. Agregá el primero con el botón de arriba.
        </p>
      )}
      {trabajos.length > 0 && grupos.length === 0 && (
        <p className="p-6 text-center text-muted-foreground">No encontré ningún trabajo con “{busqueda}”.</p>
      )}

      {grupos.map(([cat, lista]) => (
        <section key={cat} className="rounded-2xl border border-border bg-card p-2">
          <h2 className="px-3 pb-1 pt-2 text-sm font-bold text-muted-foreground">{cat}</h2>
          <ul className="flex flex-col">
            {lista.map((t) => (
              <FilaTrabajo
                key={t.id}
                trabajo={t}
                categorias={categorias}
                laboratorios={laboratorios}
                puedeEditar={puedeEditar}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
