"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import type { ModuloKey } from "@prisma/client";
import {
  activarModuloCuenta,
  aplicarPlanCuenta,
  cambiarEstadoCuenta,
  extenderPrueba,
  fijarPrecioEspecial,
  guardarNotasCuenta,
  type CuentaDetalle,
} from "@/lib/actions/dueno";
import {
  CHIP_ESTADO,
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  diasDePrueba,
  estadoDeCuenta,
  formatoPrecio,
} from "@/lib/cuentas-estado";

const input =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-foreground";

const fecha = (d: Date | string) =>
  new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-muted-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

function FilaModulo({ cuentaId, m }: { cuentaId: string; m: CuentaDetalle["modulos"][number] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [precio, setPrecio] = useState(m.precioEspecial !== null ? String(m.precioEspecial) : "");

  function alternar() {
    start(async () => {
      const r = await activarModuloCuenta(cuentaId, m.modulo as ModuloKey, !m.habilitado);
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: m.habilitado ? `${m.nombre} apagado` : `${m.nombre} activado` });
      router.refresh();
    });
  }

  function guardarPrecio() {
    const valor = precio.trim() === "" ? null : Number(precio.replace(",", "."));
    start(async () => {
      const r = await fijarPrecioEspecial(cuentaId, m.modulo as ModuloKey, valor);
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: valor === null ? "Vuelve al precio de catálogo" : "Precio especial guardado" });
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border px-3 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-foreground">
          {m.nombre}
          {m.enPlan && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">en el plan</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {m.descripcion} · catálogo: {formatoPrecio(m.precioCatalogo)}
        </p>
      </div>
      {!m.enPlan && m.habilitado && (
        <div className="flex items-center gap-2">
          <input
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            onBlur={() => precio !== (m.precioEspecial !== null ? String(m.precioEspecial) : "") && guardarPrecio()}
            inputMode="decimal"
            placeholder="Precio especial"
            aria-label={`Precio especial de ${m.nombre}`}
            className="h-10 w-32 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-foreground"
          />
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={m.habilitado}
        aria-label={`${m.nombre}: ${m.habilitado ? "activado" : "apagado"}`}
        onClick={alternar}
        disabled={pending}
        className={`h-10 w-24 shrink-0 rounded-full text-sm font-bold disabled:opacity-50 ${
          m.habilitado ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {m.habilitado ? "Activado" : "Apagado"}
      </button>
    </li>
  );
}

export function CuentaDetalleVista({ cuenta, ahoraMs }: { cuenta: CuentaDetalle; ahoraMs: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [planId, setPlanId] = useState(cuenta.plan?.id ?? "");
  const [notas, setNotas] = useState(cuenta.notasInternas ?? "");
  const [confirmando, setConfirmando] = useState(false);

  const estado = estadoDeCuenta(cuenta, ahoraMs);
  const dias = diasDePrueba(cuenta.trialHasta, ahoraMs);

  function correr(fn: () => Promise<{ error?: string }>, ok: string) {
    start(async () => {
      const r = await fn();
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: ok });
      setConfirmando(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{cuenta.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {ETIQUETA_TIPO[cuenta.tipo]} · creada el {fecha(cuenta.creadoEn)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${CHIP_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
          <span className="text-lg font-bold text-foreground">
            {formatoPrecio(cuenta.totalMensual)}
            <span className="text-xs font-normal text-muted-foreground"> / mes</span>
          </span>
        </div>
      </div>

      <Tarjeta titulo="Plan">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select className={input} value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">Sin plan (módulos sueltos)</option>
            {cuenta.planesDisponibles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} — {formatoPrecio(p.precioMensual)}
                {!p.activo && " (retirado)"}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || planId === (cuenta.plan?.id ?? "")}
            onClick={() => correr(() => aplicarPlanCuenta(cuenta.id, planId || null), "Plan aplicado")}
            className="h-11 shrink-0 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-50"
          >
            Aplicar plan
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Al aplicar un plan se prenden sus módulos. No se apaga ninguno que ya tenga: lo que quede fuera del plan se cobra suelto.
        </p>
      </Tarjeta>

      <Tarjeta titulo="Módulos">
        <ul className="flex flex-col gap-2">
          {cuenta.modulos.map((m) => (
            <FilaModulo key={m.modulo} cuentaId={cuenta.id} m={m} />
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta titulo="Prueba gratis">
        <p className="text-base text-foreground">
          {cuenta.trialHasta
            ? dias !== null && dias >= 0
              ? `Vence el ${fecha(cuenta.trialHasta)} (quedan ${dias} ${dias === 1 ? "día" : "días"}).`
              : `Venció el ${fecha(cuenta.trialHasta)}.`
            : "Esta cuenta no tiene período de prueba."}
        </p>
        <div className="flex flex-wrap gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              disabled={pending}
              onClick={() => correr(() => extenderPrueba(cuenta.id, d), `Prueba extendida ${d} días`)}
              className="h-11 rounded-xl border border-border px-4 text-base font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              +{d} días
            </button>
          ))}
        </div>
      </Tarjeta>

      <Tarjeta titulo={`Usuarios (${cuenta.usuarios.length})`}>
        <ul className="flex flex-col gap-1.5">
          {cuenta.usuarios.map((u) => (
            <li key={u.email} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-foreground">
                {u.nombre} <span className="text-muted-foreground">· {u.email}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                {u.rol}
                {!u.activo && " · inactivo"}
              </span>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta titulo="Notas internas (solo las ves vos)">
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej: lo conoce Jero, pidió probar el laboratorio gratis"
          className="min-h-24 rounded-xl border border-border bg-background p-3 text-base text-foreground outline-none focus:border-foreground"
        />
        <button
          type="button"
          disabled={pending || notas === (cuenta.notasInternas ?? "")}
          onClick={() => correr(() => guardarNotasCuenta(cuenta.id, notas), "Notas guardadas")}
          className="h-11 self-start rounded-xl border border-border px-5 text-base font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          Guardar notas
        </button>
      </Tarjeta>

      <Tarjeta titulo="Estado de la cuenta">
        {cuenta.activo ? (
          confirmando ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/40 p-3">
              <span className="text-sm text-foreground">¿Suspender? Nadie de esta cuenta va a poder entrar hasta que la reactives.</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => correr(() => cambiarEstadoCuenta(cuenta.id, false), "Cuenta suspendida")}
                className="h-10 rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground"
              >
                Sí, suspender
              </button>
              <button type="button" onClick={() => setConfirmando(false)} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold">
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="h-11 self-start rounded-xl border border-destructive/40 px-5 text-base font-semibold text-destructive hover:bg-destructive/5"
            >
              Suspender cuenta
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => correr(() => cambiarEstadoCuenta(cuenta.id, true), "Cuenta reactivada")}
            className="h-11 self-start rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-50"
          >
            Reactivar cuenta
          </button>
        )}
      </Tarjeta>
    </div>
  );
}
