"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { sileo } from "sileo";
import { crearPedido } from "@/lib/actions/pedidos-laboratorio";
import { buscarPacientesRapido } from "@/lib/actions/pacientes";
import { SelectorPiezas } from "./selector-piezas";

interface Trabajo {
  id: string;
  nombre: string;
  categoria: string;
  laboratorioId: string | null;
}
interface PacienteMin {
  id: string;
  nombre: string;
  apellido: string;
}

const input =
  "h-12 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-foreground";

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-3 text-base font-bold text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
          {n}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function fechaEnDias(dias: number) {
  const d = new Date(Date.now() + dias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(d);
}

export function NuevoPedidoForm({
  trabajos,
  laboratorios,
  pacienteInicial,
  piezasIniciales,
}: {
  trabajos: Trabajo[];
  laboratorios: { id: string; nombre: string }[];
  pacienteInicial: PacienteMin | null;
  piezasIniciales: number[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [paciente, setPaciente] = useState<PacienteMin | null>(pacienteInicial);
  const [busquedaPac, setBusquedaPac] = useState("");
  const [resultados, setResultados] = useState<PacienteMin[]>([]);

  const [trabajo, setTrabajo] = useState<Trabajo | null>(null);
  const [busquedaTrab, setBusquedaTrab] = useState("");

  const [laboratorioId, setLaboratorioId] = useState(laboratorios.length === 1 ? laboratorios[0].id : "");
  const [piezas, setPiezas] = useState<number[]>(piezasIniciales);
  const [color, setColor] = useState("");
  const [notas, setNotas] = useState("");
  const [fecha, setFecha] = useState("");

  useEffect(() => {
    if (busquedaPac.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(() => {
      buscarPacientesRapido(busquedaPac).then(setResultados);
    }, 250);
    return () => clearTimeout(t);
  }, [busquedaPac]);

  const trabajosFiltrados = useMemo(() => {
    const q = normalizar(busquedaTrab.trim());
    return q ? trabajos.filter((t) => normalizar(`${t.nombre} ${t.categoria}`).includes(q)) : trabajos;
  }, [trabajos, busquedaTrab]);

  function elegirTrabajo(t: Trabajo) {
    setTrabajo(t);
    setBusquedaTrab("");
    // El laboratorio fijo del trabajo se completa solo.
    if (t.laboratorioId && laboratorios.some((l) => l.id === t.laboratorioId)) setLaboratorioId(t.laboratorioId);
  }

  const listo = Boolean(paciente && trabajo && laboratorioId);

  function enviar() {
    if (!paciente || !trabajo) return;
    start(async () => {
      const r = await crearPedido({
        pacienteId: paciente.id,
        tipoTrabajoId: trabajo.id,
        laboratorioId,
        piezas,
        color,
        notas,
        fechaEntrega: fecha,
      });
      if (r.error || !r.id) return void sileo.error({ title: r.error ?? "No se pudo crear el pedido" });
      sileo.success({ title: "Pedido creado" });
      router.push(`/laboratorio/pedidos/${r.id}`);
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Paso n={1} titulo="¿Para qué paciente?">
        {paciente ? (
          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
            <span className="text-base font-semibold text-foreground">
              {paciente.apellido}, {paciente.nombre}
            </span>
            <button
              type="button"
              onClick={() => setPaciente(null)}
              aria-label="Cambiar paciente"
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-background"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${input} pl-9`}
                placeholder="Buscá por nombre, apellido o teléfono..."
                value={busquedaPac}
                onChange={(e) => setBusquedaPac(e.target.value)}
                autoFocus
              />
            </div>
            {resultados.length > 0 && (
              <ul className="flex flex-col overflow-hidden rounded-xl border border-border">
                {resultados.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setPaciente(p)}
                      className="flex min-h-12 w-full items-center px-4 text-left text-base text-foreground hover:bg-muted"
                    >
                      {p.apellido}, {p.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {busquedaPac.trim().length >= 2 && resultados.length === 0 && (
              <p className="text-sm text-muted-foreground">No encontré a nadie con ese nombre.</p>
            )}
          </>
        )}
      </Paso>

      <Paso n={2} titulo="¿Qué trabajo es?">
        {trabajo ? (
          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
            <div>
              <p className="text-base font-semibold text-foreground">{trabajo.nombre}</p>
              <p className="text-xs text-muted-foreground">{trabajo.categoria}</p>
            </div>
            <button
              type="button"
              onClick={() => setTrabajo(null)}
              aria-label="Cambiar trabajo"
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-background"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${input} pl-9`}
                placeholder="Buscá el trabajo (corona, placa, prótesis...)"
                value={busquedaTrab}
                onChange={(e) => setBusquedaTrab(e.target.value)}
              />
            </div>
            <ul className="flex max-h-72 flex-col overflow-y-auto rounded-xl border border-border">
              {trabajosFiltrados.length === 0 && (
                <li className="p-4 text-sm text-muted-foreground">No encontré ese trabajo en tu lista.</li>
              )}
              {trabajosFiltrados.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => elegirTrabajo(t)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left hover:bg-muted"
                  >
                    <span className="text-base text-foreground">{t.nombre}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{t.categoria}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Paso>

      <Paso n={3} titulo="¿A qué laboratorio?">
        <select className={input} value={laboratorioId} onChange={(e) => setLaboratorioId(e.target.value)}>
          <option value="">Elegí el laboratorio</option>
          {laboratorios.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </select>
      </Paso>

      <Paso n={4} titulo="Piezas (si corresponde)">
        <SelectorPiezas value={piezas} onChange={setPiezas} />
      </Paso>

      <Paso n={5} titulo="Detalles (opcional)">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold text-foreground">
            Color
            <input className={input} placeholder="Ej: A2" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-foreground">
            Fecha de entrega
            <input className={input} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {[7, 10, 15].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setFecha(fechaEnDias(d))}
              className="h-10 rounded-full border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              En {d} días
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold text-foreground">
          Indicaciones para el laboratorio
          <textarea
            className="min-h-24 rounded-xl border border-border bg-background p-3 text-base text-foreground outline-none focus:border-foreground"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </label>
      </Paso>

      <button
        type="button"
        onClick={enviar}
        disabled={!listo || pending}
        className="h-14 rounded-2xl bg-primary text-lg font-bold text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Creando..." : "Crear pedido"}
      </button>
      {!listo && (
        <p className="text-center text-sm text-muted-foreground">
          Falta elegir {[!paciente && "el paciente", !trabajo && "el trabajo", !laboratorioId && "el laboratorio"]
            .filter(Boolean)
            .join(", ")}
          .
        </p>
      )}
    </div>
  );
}
