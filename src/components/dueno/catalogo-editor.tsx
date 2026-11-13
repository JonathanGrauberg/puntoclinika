"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { sileo } from "sileo";
import type { ModuloKey, TipoCentro } from "@prisma/client";
import {
  actualizarPlan,
  crearPlan,
  eliminarPlan,
  guardarModuloCatalogo,
  type CatalogoModulo,
  type PlanVista,
} from "@/lib/actions/dueno";
import { ETIQUETA_TIPO, formatoPrecio } from "@/lib/cuentas-estado";

const input =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-foreground";

const aNumero = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

function FilaModulo({ m }: { m: CatalogoModulo }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nombre, setNombre] = useState(m.nombre);
  const [descripcion, setDescripcion] = useState(m.descripcion);
  const [precio, setPrecio] = useState(m.precioMensual ? String(m.precioMensual) : "");
  const [vendible, setVendible] = useState(m.vendible);

  const cambio =
    nombre !== m.nombre || descripcion !== m.descripcion || aNumero(precio) !== m.precioMensual || vendible !== m.vendible;

  function guardar() {
    start(async () => {
      const r = await guardarModuloCatalogo(m.modulo, { nombre, descripcion, precioMensual: aNumero(precio), vendible });
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: "Guardado" });
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
        <input className={input} value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre" />
        <input
          className={input}
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          inputMode="decimal"
          placeholder="Precio / mes"
          aria-label={`Precio mensual de ${m.nombre}`}
        />
      </div>
      <input
        className={input}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        aria-label="Descripción"
        placeholder="Qué incluye"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-foreground">
          <input type="checkbox" className="h-5 w-5" checked={vendible} onChange={(e) => setVendible(e.target.checked)} />
          Se vende suelto
        </label>
        <button
          type="button"
          onClick={guardar}
          disabled={pending || !cambio}
          className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
    </li>
  );
}

function PlanForm({
  plan,
  modulos,
  onListo,
}: {
  plan: PlanVista | null;
  modulos: CatalogoModulo[];
  onListo: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nombre, setNombre] = useState(plan?.nombre ?? "");
  const [tipo, setTipo] = useState<TipoCentro>(plan?.tipo ?? "ODONTOLOGIA");
  const [descripcion, setDescripcion] = useState(plan?.descripcion ?? "");
  const [precio, setPrecio] = useState(plan?.precioMensual ? String(plan.precioMensual) : "");
  const [incluidos, setIncluidos] = useState<ModuloKey[]>(plan?.modulos ?? []);
  const [activo, setActivo] = useState(plan?.activo ?? true);
  const [confirmando, setConfirmando] = useState(false);

  function alternar(m: ModuloKey) {
    setIncluidos((x) => (x.includes(m) ? x.filter((y) => y !== m) : [...x, m]));
  }

  function guardar() {
    start(async () => {
      const datos = { nombre, tipo, descripcion, precioMensual: aNumero(precio), modulos: incluidos, activo };
      const r = plan ? await actualizarPlan(plan.id, datos) : await crearPlan(datos);
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: plan ? "Plan guardado" : "Plan creado" });
      onListo();
      router.refresh();
    });
  }

  function borrar() {
    if (!plan) return;
    start(async () => {
      const r = await eliminarPlan(plan.id);
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: plan.cuentas > 0 ? "Plan retirado (tiene cuentas)" : "Plan borrado" });
      onListo();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-muted/30 p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_12rem_9rem]">
        <input className={input} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del plan" />
        <select className={input} value={tipo} onChange={(e) => setTipo(e.target.value as TipoCentro)} disabled={Boolean(plan && plan.cuentas > 0)}>
          {(["ODONTOLOGIA", "LABORATORIO", "MEDICO"] as TipoCentro[]).map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_TIPO[t]}
            </option>
          ))}
        </select>
        <input className={input} value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" placeholder="Precio / mes" />
      </div>
      <input className={input} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción corta" />
      <div className="flex flex-wrap gap-2">
        {modulos.map((m) => {
          const on = incluidos.includes(m.modulo);
          return (
            <button
              key={m.modulo}
              type="button"
              aria-pressed={on}
              onClick={() => alternar(m.modulo)}
              className={`h-10 rounded-full border px-4 text-sm font-semibold ${
                on ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"
              }`}
            >
              {m.nombre}
            </button>
          );
        })}
      </div>
      <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-foreground">
        <input type="checkbox" className="h-5 w-5" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
        Se ofrece (si lo desmarcás, deja de aparecer para elegir)
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={pending || !nombre.trim()}
          className="h-11 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-50"
        >
          {plan ? "Guardar plan" : "Crear plan"}
        </button>
        <button type="button" onClick={onListo} className="h-11 rounded-xl border border-border px-4 text-base font-semibold text-foreground">
          Cancelar
        </button>
        {plan &&
          (confirmando ? (
            <button type="button" onClick={borrar} disabled={pending} className="h-11 rounded-xl bg-destructive px-4 text-base font-semibold text-destructive-foreground">
              {plan.cuentas > 0 ? "Sí, retirar" : "Sí, borrar"}
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmando(true)} className="h-11 rounded-xl px-4 text-base font-semibold text-destructive hover:bg-destructive/5">
              {plan.cuentas > 0 ? "Retirar" : "Borrar"}
            </button>
          ))}
      </div>
    </div>
  );
}

export function CatalogoEditor({ modulos, planes }: { modulos: CatalogoModulo[]; planes: PlanVista[] }) {
  const [editando, setEditando] = useState<string | null>(null); // id de plan, "nuevo" o null
  const nombreDe = (m: ModuloKey) => modulos.find((x) => x.modulo === m)?.nombre ?? m;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-foreground">Planes cerrados</h2>
          <button
            type="button"
            onClick={() => setEditando("nuevo")}
            className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Nuevo plan
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Un precio que incluye varios módulos, para un tipo de cuenta. Lo que una cuenta tenga fuera de su plan se suma a precio de módulo suelto.
        </p>

        {editando === "nuevo" && <PlanForm plan={null} modulos={modulos} onListo={() => setEditando(null)} />}

        <ul className="flex flex-col gap-2">
          {planes.map((p) =>
            editando === p.id ? (
              <li key={p.id}>
                <PlanForm plan={p} modulos={modulos} onListo={() => setEditando(null)} />
              </li>
            ) : (
              <li key={p.id} className={`rounded-xl border border-border bg-card p-4 ${p.activo ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-foreground">
                      {p.nombre}
                      <span className="ml-2 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">{ETIQUETA_TIPO[p.tipo]}</span>
                      {!p.activo && <span className="ml-2 text-xs font-semibold text-muted-foreground">retirado</span>}
                    </p>
                    {p.descripcion && <p className="text-sm text-muted-foreground">{p.descripcion}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{formatoPrecio(p.precioMensual)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.cuentas} {p.cuentas === 1 ? "cuenta" : "cuentas"}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-foreground">{p.modulos.map(nombreDe).join(" · ") || "Sin módulos"}</p>
                <button
                  type="button"
                  onClick={() => setEditando(p.id)}
                  className="mt-2 h-10 rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Editar
                </button>
              </li>
            )
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-foreground">Módulos sueltos</h2>
        <p className="text-sm text-muted-foreground">El precio mensual de cada módulo cuando se vende por separado.</p>
        <ul className="flex flex-col gap-2">
          {modulos.map((m) => (
            <FilaModulo key={m.modulo} m={m} />
          ))}
        </ul>
      </section>
    </div>
  );
}
