"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ClipboardList, FlaskConical, History, Pencil, Stethoscope, X } from "lucide-react";
import { sileo } from "sileo";
import type { EstadoHallazgo, SuperficieDental, TipoHallazgo } from "@prisma/client";
import { anotarHallazgo, anularHallazgo, registrarTratamiento, type HallazgoVista } from "@/lib/actions/odontograma";
import {
  ESTADO_LABEL,
  HALLAZGOS,
  ORDEN_HALLAZGOS,
  ORDEN_TRATAMIENTOS,
  TRATAMIENTOS,
  etiquetaSuperficie,
  infoPieza,
  resumenSuperficies,
  type TipoTratamiento,
} from "@/lib/odontograma";
import { formatFechaArgentina } from "@/lib/date-utils";
import { COLOR_AZUL, COLOR_ROJO, DienteSvg, colorDeEstado } from "./diente";

type Modo = "menu" | "hallazgo" | "tratamiento";

const botonGrande =
  "flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 text-left text-base font-semibold text-foreground transition-colors hover:bg-muted";

function describir(h: Pick<HallazgoVista, "tipo" | "superficies" | "pieza">) {
  const caras = h.superficies.length > 0 ? ` (${resumenSuperficies(h.superficies, h.pieza)})` : "";
  return `${HALLAZGOS[h.tipo].label}${caras}`;
}

export function PanelPieza({
  pieza,
  pacienteId,
  hallazgos,
  puedeEditar,
  puedePedirLab,
  onClose,
  onVerHistoria,
}: {
  pieza: number | null;
  pacienteId: string;
  hallazgos: HallazgoVista[];
  puedeEditar: boolean;
  puedePedirLab: boolean;
  onClose: () => void;
  onVerHistoria: (pieza: number) => void;
}) {
  return (
    <Dialog.Root open={pieza !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[32rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          {pieza !== null && (
            <ContenidoPanel
              key={pieza}
              pieza={pieza}
              pacienteId={pacienteId}
              hallazgos={hallazgos.filter((h) => h.pieza === pieza)}
              puedeEditar={puedeEditar}
              puedePedirLab={puedePedirLab}
              onClose={onClose}
              onVerHistoria={onVerHistoria}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ContenidoPanel({
  pieza,
  pacienteId,
  hallazgos,
  puedeEditar,
  puedePedirLab,
  onClose,
  onVerHistoria,
}: {
  pieza: number;
  pacienteId: string;
  hallazgos: HallazgoVista[];
  puedeEditar: boolean;
  puedePedirLab: boolean;
  onClose: () => void;
  onVerHistoria: (pieza: number) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modo, setModo] = useState<Modo>("menu");
  const [error, setError] = useState<string>();
  const [verHistorial, setVerHistorial] = useState(false);

  const [tipo, setTipo] = useState<TipoHallazgo | null>(null);
  const [estado, setEstado] = useState<EstadoHallazgo>("A_REALIZAR");
  const [tratamiento, setTratamiento] = useState<TipoTratamiento | null>(null);
  const [caras, setCaras] = useState<SuperficieDental[]>([]);
  const [nota, setNota] = useState("");

  const info = infoPieza(pieza);
  const vigentes = hallazgos.filter((h) => !h.anuladoEn);
  const porCara = modo === "hallazgo" ? (tipo ? HALLAZGOS[tipo].porCara : false) : tratamiento ? TRATAMIENTOS[tratamiento].porCara : false;

  function volver() {
    setModo("menu");
    setTipo(null);
    setTratamiento(null);
    setCaras([]);
    setNota("");
    setError(undefined);
  }

  function alternarCara(s: SuperficieDental) {
    setCaras((c) => (c.includes(s) ? c.filter((x) => x !== s) : [...c, s]));
  }

  function elegirTipo(t: TipoHallazgo) {
    setTipo(t);
    setEstado(HALLAZGOS[t].estadoSugerido);
    if (!HALLAZGOS[t].porCara) setCaras([]);
  }

  function guardar() {
    setError(undefined);
    startTransition(async () => {
      const res =
        modo === "hallazgo" && tipo
          ? await anotarHallazgo({ pacienteId, pieza, superficies: caras, tipo, estado, nota })
          : tratamiento
            ? await registrarTratamiento({ pacienteId, pieza, superficies: caras, tratamiento, nota })
            : { error: "Elegí una opción." };
      if (res.error) {
        setError(res.error);
        return;
      }
      sileo.success({ title: modo === "hallazgo" ? "Anotado" : "Tratamiento registrado" });
      router.refresh();
      volver();
    });
  }

  function anular(id: string) {
    startTransition(async () => {
      const res = await anularHallazgo(id);
      if (res.error) sileo.error({ title: res.error });
      else {
        sileo.success({ title: "Listo, lo sacamos" });
        router.refresh();
      }
    });
  }

  const puedeGuardar = modo === "hallazgo" ? Boolean(tipo) : Boolean(tratamiento);

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {modo !== "menu" && (
            <button
              type="button"
              onClick={volver}
              aria-label="Volver"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <Dialog.Title className="text-lg font-bold text-foreground">Pieza {pieza}</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {info.nombre} · {info.arcada} {info.ladoPaciente === "derecha" ? "derecho" : "izquierdo"}
            </Dialog.Description>
          </div>
        </div>
        <Dialog.Close className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </Dialog.Close>
      </div>

      {modo === "menu" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 rounded-xl border border-border p-3">
            <DienteSvg pieza={pieza} hallazgos={vigentes} className="h-20 w-20 shrink-0" />
            <div className="min-w-0 flex-1">
              {vigentes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin nada anotado en esta pieza.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {vigentes.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 text-foreground">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full"
                          style={{ background: colorDeEstado(h.estado) }}
                        />
                        {describir(h)} <span className="text-muted-foreground">· {ESTADO_LABEL[h.estado].toLowerCase()}</span>
                      </span>
                      {puedeEditar && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => anular(h.id)}
                          className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                        >
                          Me equivoqué
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {puedeEditar && (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setModo("hallazgo")} className={botonGrande}>
                <Pencil className="h-5 w-5 shrink-0" />
                <span>
                  Anotar lo que tiene
                  <span className="block text-sm font-normal text-muted-foreground">Caries, algo que hay que hacer, lo que ya tiene</span>
                </span>
              </button>
              <button type="button" onClick={() => setModo("tratamiento")} className={botonGrande}>
                <Stethoscope className="h-5 w-5 shrink-0" />
                <span>
                  Registré un tratamiento hoy
                  <span className="block text-sm font-normal text-muted-foreground">Se pinta de azul y queda en la historia</span>
                </span>
              </button>
              {puedePedirLab && (
                <Link href={`/laboratorio/pedidos/nuevo?pacienteId=${pacienteId}&piezas=${pieza}`} className={botonGrande}>
                  <FlaskConical className="h-5 w-5 shrink-0" />
                  <span>
                    Pedir trabajo de laboratorio
                    <span className="block text-sm font-normal text-muted-foreground">Con la pieza {pieza} ya elegida</span>
                  </span>
                </Link>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onVerHistoria(pieza);
                onClose();
              }}
              className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <ClipboardList className="h-4 w-4" />
              Ver en la historia
            </button>
            <button
              type="button"
              onClick={() => setVerHistorial((v) => !v)}
              className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <History className="h-4 w-4" />
              Historial de la pieza
            </button>
          </div>

          {verHistorial && (
            <ul className="flex flex-col gap-2 border-t border-border pt-3">
              {hallazgos.length === 0 && <li className="text-sm text-muted-foreground">Todavía no hay movimientos.</li>}
              {hallazgos.map((h) => (
                <li key={h.id} className="text-sm">
                  <span className="font-semibold text-foreground">{describir(h)}</span>{" "}
                  <span style={{ color: colorDeEstado(h.estado) }}>{ESTADO_LABEL[h.estado].toLowerCase()}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatFechaArgentina(new Date(h.fecha))} · {h.profesional}
                    {h.anuladoEn && ` · cerrado el ${formatFechaArgentina(new Date(h.anuladoEn))}`}
                    {h.nota && ` · ${h.nota}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {modo !== "menu" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-foreground">
            {modo === "hallazgo" ? "¿Qué tiene o qué hay que hacer?" : "¿Qué tratamiento hiciste?"}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {modo === "hallazgo"
              ? ORDEN_HALLAZGOS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => elegirTipo(t)}
                    className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
                      tipo === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {HALLAZGOS[t].label}
                  </button>
                ))
              : ORDEN_TRATAMIENTOS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTratamiento(t);
                      if (!TRATAMIENTOS[t].porCara) setCaras([]);
                    }}
                    className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
                      tratamiento === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {TRATAMIENTOS[t].label}
                  </button>
                ))}
          </div>

          {porCara && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border p-3">
              <p className="self-start text-sm font-semibold text-foreground">¿En qué cara? (tocá una o varias)</p>
              <DienteSvg pieza={pieza} seleccionadas={caras} onCara={alternarCara} className="h-44 w-44" />
              <p className="text-sm text-muted-foreground">
                {caras.length === 0 ? "Ninguna elegida" : caras.map((c) => etiquetaSuperficie(c, pieza)).join(" · ")}
              </p>
            </div>
          )}

          {modo === "hallazgo" && tipo && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEstado("A_REALIZAR")}
                className={`min-h-12 rounded-xl border-2 px-3 text-sm font-semibold ${
                  estado === "A_REALIZAR" ? "text-white" : "text-foreground"
                }`}
                style={{ borderColor: COLOR_ROJO, background: estado === "A_REALIZAR" ? COLOR_ROJO : "transparent" }}
              >
                Hay que hacerlo
              </button>
              <button
                type="button"
                onClick={() => setEstado("EXISTENTE")}
                className={`min-h-12 rounded-xl border-2 px-3 text-sm font-semibold ${
                  estado === "EXISTENTE" ? "text-white" : "text-foreground"
                }`}
                style={{ borderColor: COLOR_AZUL, background: estado === "EXISTENTE" ? COLOR_AZUL : "transparent" }}
              >
                Ya está hecho
              </button>
            </div>
          )}

          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder={tratamiento === "OTRO" ? "¿Qué hiciste? *" : "Nota (opcional)"}
            maxLength={500}
            className="h-12 rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-foreground"
          />

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={guardar}
            disabled={pending || !puedeGuardar}
            className="h-12 rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Guardando..." : modo === "hallazgo" ? "Guardar" : "Registrar tratamiento"}
          </button>
        </div>
      )}
    </>
  );
}
