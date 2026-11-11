"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Download, FileImage, FileText, Paperclip, Send, Upload } from "lucide-react";
import { sileo } from "sileo";
import type { EstadoPedidoLab } from "@prisma/client";
import {
  cambiarEstadoPublico,
  enviarMensajePublico,
  prepararSubidaPublica,
  registrarArchivoPublico,
  urlDescargaPublica,
  type PedidoPublico,
} from "@/lib/actions/pedido-publico";
import {
  ESTADOS_PEDIDO,
  EXTENSIONES_ARCHIVO_PEDIDO,
  MAX_BYTES_ARCHIVO_PEDIDO,
  estaAtrasado,
  extensionDe,
  formatoBytes,
  numeroPedido,
  textoPiezas,
} from "@/lib/pedidos-lab";

const CLAVE_NOMBRE = "clinika-lab-nombre";
const ACEPTA = EXTENSIONES_ARCHIVO_PEDIDO.map((e) => `.${e}`).join(",");
/** Lo que el laboratorio puede marcar, en el orden en que suele pasar. */
const PASOS: EstadoPedidoLab[] = ["RECIBIDO", "EN_PROCESO", "EN_PRUEBA", "TERMINADO"];

const fechaHora = (d: Date) =>
  new Date(d).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });

function icono(nombre: string) {
  const e = extensionDe(nombre);
  if (["stl", "ply", "obj"].includes(e)) return Box;
  if (e === "pdf") return FileText;
  if (["jpg", "jpeg", "png", "webp", "heic"].includes(e)) return FileImage;
  return Paperclip;
}

function subir(url: string, archivo: File, tipo: string, onProgreso: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", tipo);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgreso(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("No se pudo subir")));
    xhr.onerror = () => reject(new Error("Se cortó la conexión al subir"));
    xhr.send(archivo);
  });
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-muted-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

export function PedidoPublicoVista({ token, pedido }: { token: string; pedido: PedidoPublico }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nombre, setNombre] = useState("");
  const [nota, setNota] = useState("");
  const [texto, setTexto] = useState("");
  const [subiendo, setSubiendo] = useState<{ nombre: string; pct: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setNombre(localStorage.getItem(CLAVE_NOMBRE) ?? "");
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  }, []);

  function guardarNombre(v: string) {
    setNombre(v);
    try {
      localStorage.setItem(CLAVE_NOMBRE, v);
    } catch {
      /* idem */
    }
  }

  const atrasado = estaAtrasado(pedido.estado, pedido.fechaEntrega ? new Date(pedido.fechaEntrega) : null, new Date());
  const actual = PASOS.indexOf(pedido.estado);
  const siguiente = pedido.estado === "DEVUELTO" || pedido.estado === "ENVIADO" ? "RECIBIDO" : PASOS[actual + 1];

  function cambiar(estado: EstadoPedidoLab) {
    start(async () => {
      const r = await cambiarEstadoPublico(token, estado, nota, nombre);
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: `Marcado: ${ESTADOS_PEDIDO[estado].label.toLowerCase()}` });
      setNota("");
      router.refresh();
    });
  }

  function mandarMensaje() {
    if (!texto.trim()) return;
    start(async () => {
      const r = await enviarMensajePublico(token, texto, nombre);
      if (r.error) return void sileo.error({ title: r.error });
      setTexto("");
      router.refresh();
    });
  }

  async function elegidos(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES_ARCHIVO_PEDIDO) {
        sileo.error({ title: `${f.name} pesa más de 50 MB` });
        continue;
      }
      setSubiendo({ nombre: f.name, pct: 0 });
      try {
        const tipo = f.type || "application/octet-stream";
        const prep = await prepararSubidaPublica(token, f.name, tipo, f.size);
        if ("error" in prep) throw new Error(prep.error);
        await subir(prep.url, f, tipo, (pct) => setSubiendo({ nombre: f.name, pct }));
        const reg = await registrarArchivoPublico(token, prep.key, f.name, tipo, nombre);
        if (reg.error) throw new Error(reg.error);
        sileo.success({ title: `${f.name} subido` });
      } catch (e) {
        sileo.error({ title: e instanceof Error ? e.message : "No se pudo subir el archivo" });
      }
    }
    setSubiendo(null);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function descargar(id: string) {
    const r = await urlDescargaPublica(token, id);
    if ("error" in r) return void sileo.error({ title: r.error });
    const a = document.createElement("a");
    a.href = r.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Trabajo de {pedido.consultorio}
        </p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-muted-foreground">{numeroPedido(pedido.numero)}</p>
            <h1 className="text-2xl font-bold text-foreground">{pedido.trabajo}</h1>
            {pedido.piezas.length > 0 && (
              <p className="text-base text-foreground">Pieza {textoPiezas(pedido.piezas)}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${ESTADOS_PEDIDO[pedido.estado].chip}`}>
              {ESTADOS_PEDIDO[pedido.estado].label}
            </span>
            {atrasado && <span className="text-sm font-bold text-destructive">Atrasado</span>}
          </div>
        </div>
      </header>

      <Tarjeta titulo="Datos del trabajo">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-muted-foreground">Paciente</dt>
            <dd className="text-base text-foreground">
              {pedido.paciente.apellido}, {pedido.paciente.nombre}
            </dd>
          </div>
          {pedido.laboratorio.numeroCliente && (
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">Número / casillero</dt>
              <dd className="text-2xl font-bold text-foreground">{pedido.laboratorio.numeroCliente}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-semibold text-muted-foreground">Fecha de entrega</dt>
            <dd className="text-base text-foreground">
              {pedido.fechaEntrega
                ? new Date(pedido.fechaEntrega).toLocaleDateString("es-AR", {
                    dateStyle: "long",
                    timeZone: "America/Argentina/Buenos_Aires",
                  })
                : "A coordinar"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted-foreground">Color</dt>
            <dd className="text-base text-foreground">{pedido.color || "—"}</dd>
          </div>
        </dl>
        {pedido.notas && (
          <div className="rounded-xl bg-muted px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">Indicaciones</p>
            <p className="whitespace-pre-wrap text-base text-foreground">{pedido.notas}</p>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Quién sos (opcional)">
        <input
          value={nombre}
          onChange={(e) => guardarNombre(e.target.value)}
          placeholder={pedido.laboratorio.nombre}
          maxLength={60}
          className="h-12 rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-foreground"
        />
        <p className="text-xs text-muted-foreground">Así el consultorio sabe quién avisó. Se recuerda en este dispositivo.</p>
      </Tarjeta>

      {pedido.puedeActuar ? (
        <Tarjeta titulo="¿Cómo va el trabajo?">
          {siguiente && (
            <button
              type="button"
              onClick={() => cambiar(siguiente)}
              disabled={pending}
              className="h-14 rounded-2xl bg-primary text-lg font-bold text-primary-foreground disabled:opacity-50"
            >
              {siguiente === "RECIBIDO" && "Lo recibimos"}
              {siguiente === "EN_PROCESO" && "Está en proceso"}
              {siguiente === "EN_PRUEBA" && "Pasó a prueba"}
              {siguiente === "TERMINADO" && "Está terminado"}
            </button>
          )}
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Una nota para el consultorio (opcional)"
            className="min-h-16 rounded-xl border border-border bg-background p-3 text-base text-foreground outline-none focus:border-foreground"
          />
          <div className="flex flex-wrap gap-2">
            {PASOS.filter((e) => e !== pedido.estado && e !== siguiente).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => cambiar(e)}
                disabled={pending}
                className={`h-10 rounded-full px-4 text-sm font-semibold disabled:opacity-50 ${ESTADOS_PEDIDO[e].chip}`}
              >
                {ESTADOS_PEDIDO[e].label}
              </button>
            ))}
          </div>
        </Tarjeta>
      ) : (
        <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-foreground">
          Este trabajo ya fue entregado. Podés mirarlo y bajar los archivos, pero no modificarlo.
        </p>
      )}

      <Tarjeta titulo="Archivos">
        {pedido.archivos.length === 0 && !subiendo && (
          <p className="text-sm text-muted-foreground">Todavía no hay archivos.</p>
        )}
        <ul className="flex flex-col gap-2">
          {pedido.archivos.map((a) => {
            const Icono = icono(a.nombre);
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                <Icono className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base text-foreground">{a.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatoBytes(a.tamano)} · {a.subidoPor}
                    {a.autorTipo === "LABORATORIO" && " (laboratorio)"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => descargar(a.id)}
                  aria-label={`Descargar ${a.nombre}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                >
                  <Download className="h-5 w-5" />
                </button>
              </li>
            );
          })}
        </ul>
        {subiendo && (
          <div className="rounded-xl bg-muted px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">Subiendo {subiendo.nombre}...</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full bg-primary transition-all" style={{ width: `${subiendo.pct}%` }} />
            </div>
          </div>
        )}
        {pedido.puedeActuar && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACEPTA}
              className="hidden"
              onChange={(e) => elegidos(e.target.files)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo !== null}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border text-base font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              <Upload className="h-5 w-5" />
              Subir archivos
            </button>
          </>
        )}
      </Tarjeta>

      <Tarjeta titulo="Mensajes">
        {pedido.mensajes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay mensajes.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pedido.mensajes.map((m) => {
              const propio = m.autorTipo === "LABORATORIO";
              return (
                <li
                  key={m.id}
                  className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${propio ? "self-end bg-primary/10" : "self-start bg-muted"}`}
                >
                  <p className="text-xs font-semibold text-muted-foreground">
                    {m.autorNombre} · {fechaHora(m.creadoEn)}
                  </p>
                  <p className="whitespace-pre-wrap text-base text-foreground">{m.texto}</p>
                </li>
              );
            })}
          </ul>
        )}
        {pedido.puedeActuar && (
          <div className="flex gap-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribile al consultorio..."
              className="min-h-12 flex-1 rounded-xl border border-border bg-background p-3 text-base text-foreground outline-none focus:border-foreground"
            />
            <button
              type="button"
              onClick={mandarMensaje}
              disabled={pending || !texto.trim()}
              aria-label="Enviar mensaje"
              className="flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Recorrido">
        <ol className="flex flex-col gap-3">
          {[...pedido.estados].reverse().map((e) => (
            <li key={e.id} className="flex gap-3">
              <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${ESTADOS_PEDIDO[e.estado].chip}`} />
              <div>
                <p className="text-base font-semibold text-foreground">{ESTADOS_PEDIDO[e.estado].label}</p>
                <p className="text-xs text-muted-foreground">
                  {e.autor} · {fechaHora(e.creadoEn)}
                </p>
                {e.nota && <p className="mt-1 text-sm text-foreground">{e.nota}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Tarjeta>

      <p className="pb-6 text-center text-xs text-muted-foreground">
        Este link es solo para este pedido y vale hasta el{" "}
        {new Date(pedido.venceEn).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}.
        <br />
        Hecho con .clinika
      </p>
    </div>
  );
}
