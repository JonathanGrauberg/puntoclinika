import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, Phone } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { PedidoAcciones } from "@/components/laboratorio/pedido-acciones";
import { PedidoMensajes } from "@/components/laboratorio/pedido-mensajes";
import { obtenerPedido } from "@/lib/actions/pedidos-laboratorio";
import { formatFechaArgentina, formatFechaHoraArgentina, hoyArgentina } from "@/lib/date-utils";
import { ESTADOS_PEDIDO, estaAtrasado, numeroPedido, textoPiezas } from "@/lib/pedidos-lab";
import { permisosDe } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{etiqueta}</dt>
      <dd className="text-base text-foreground">{children}</dd>
    </div>
  );
}

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const pedido = await obtenerPedido(id);
  if (!pedido) {
    // null = sin permiso o módulo apagado; si no, simplemente no existe.
    if (!permisosDe(session.rol).verLaboratorio) redirect("/dashboard");
    notFound();
  }

  const puedeGestionar = permisosDe(session.rol).gestionarLaboratorio;
  const atrasado = estaAtrasado(pedido.estado, pedido.fechaEntrega, hoyArgentina());

  return (
    <>
      <PageTitle title={`Pedido ${numeroPedido(pedido.numero)}`} />
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link
          href="/laboratorio/pedidos"
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Pedidos
        </Link>

        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-muted-foreground">{numeroPedido(pedido.numero)}</p>
              <h1 className="text-xl font-bold text-foreground">{pedido.trabajo}</h1>
              {pedido.piezas.length > 0 && (
                <p className="text-base text-foreground">Pieza {textoPiezas(pedido.piezas)}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${ESTADOS_PEDIDO[pedido.estado].chip}`}>
                {ESTADOS_PEDIDO[pedido.estado].label}
              </span>
              {atrasado && (
                <span className="flex items-center gap-1 text-sm font-bold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Atrasado
                </span>
              )}
            </div>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <Dato etiqueta="Paciente">
              <Link href={`/pacientes/${pedido.paciente.id}`} className="font-semibold underline-offset-2 hover:underline">
                {pedido.paciente.apellido}, {pedido.paciente.nombre}
              </Link>
            </Dato>
            <Dato etiqueta="Laboratorio">
              <span className="font-semibold">{pedido.laboratorio.nombre}</span>
              {pedido.laboratorio.telefono && (
                <a
                  href={`tel:${pedido.laboratorio.telefono}`}
                  className="mt-1 flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {pedido.laboratorio.telefono}
                </a>
              )}
            </Dato>
            <Dato etiqueta="Fecha de entrega">
              {pedido.fechaEntrega ? formatFechaArgentina(pedido.fechaEntrega, { dateStyle: "long" }) : "Sin fecha"}
            </Dato>
            <Dato etiqueta="Color">{pedido.color || "—"}</Dato>
          </dl>

          {pedido.notas && (
            <div className="rounded-xl bg-muted px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground">Indicaciones</p>
              <p className="whitespace-pre-wrap text-base text-foreground">{pedido.notas}</p>
            </div>
          )}
        </section>

        {puedeGestionar && <PedidoAcciones pedidoId={pedido.id} estado={pedido.estado} />}

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-muted-foreground">Recorrido del pedido</h2>
          <ol className="flex flex-col gap-3">
            {[...pedido.estados].reverse().map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${ESTADOS_PEDIDO[e.estado].chip}`} />
                <div>
                  <p className="text-base font-semibold text-foreground">{ESTADOS_PEDIDO[e.estado].label}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.autor}
                    {e.autorTipo === "LABORATORIO" && " (laboratorio)"} ·{" "}
                    {formatFechaHoraArgentina(e.creadoEn, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  {e.nota && <p className="mt-1 text-sm text-foreground">{e.nota}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <PedidoMensajes pedidoId={pedido.id} mensajes={pedido.mensajes} puedeEscribir={puedeGestionar} />
      </div>
    </>
  );
}
