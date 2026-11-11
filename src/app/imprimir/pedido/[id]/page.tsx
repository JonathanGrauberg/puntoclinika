import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { ImprimirButton } from "@/components/historia-clinica/imprimir-button";
import { obtenerEnlacePedido } from "@/lib/actions/pedido-enlace";
import { obtenerPedido } from "@/lib/actions/pedidos-laboratorio";
import { formatFechaArgentina } from "@/lib/date-utils";
import { numeroPedido, textoPiezas } from "@/lib/pedidos-lab";
import { requireSession } from "@/lib/session";

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-neutral-300 py-2">
      <dt className="text-sm text-neutral-500">{etiqueta}</dt>
      <dd className="text-base font-semibold text-neutral-900">{children}</dd>
    </div>
  );
}

/** Orden de trabajo para imprimir y mandar con el trabajo físico. Siempre en blanco y negro sobre fondo blanco. */
export default async function ImprimirPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const pedido = await obtenerPedido(id);
  if (!pedido) {
    notFound();
    return null;
  }
  if (!session.tenantId) redirect("/login");

  // El QR lleva al link del laboratorio (sin cuenta). Si está vencido o desactivado, no se imprime uno que no funciona.
  const enlace = await obtenerEnlacePedido(pedido.id);
  const qr =
    enlace?.estado === "vigente"
      ? await QRCode.toString(enlace.url, { type: "svg", margin: 0, errorCorrectionLevel: "M" })
      : null;

  return (
    <div className="min-h-screen bg-white p-6 text-neutral-900 print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex justify-end print:hidden [&>button]:!border-neutral-400 [&>button]:!text-neutral-900 [&>button:hover]:!bg-neutral-100">
          <ImprimirButton />
        </div>

        <div className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{session.tenantName}</p>
            <h1 className="text-2xl font-bold">Orden de trabajo</h1>
            <p className="text-lg font-bold">{numeroPedido(pedido.numero)}</p>
          </div>
          {qr ? (
            <div
              className="h-28 w-28 shrink-0 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qr }}
              aria-label="Código QR del pedido"
            />
          ) : (
            <p className="w-40 text-right text-xs text-neutral-500 print:hidden">
              Sin QR: el link del laboratorio está vencido o desactivado. Renovalo desde el pedido.
            </p>
          )}
        </div>

        <dl className="mt-2">
          <Fila etiqueta="Fecha">{formatFechaArgentina(pedido.creadoEn, { dateStyle: "long" })}</Fila>
          <Fila etiqueta="Laboratorio">{pedido.laboratorio.nombre}</Fila>
          {pedido.laboratorio.numeroCliente && (
            <Fila etiqueta="N° de cliente">{pedido.laboratorio.numeroCliente}</Fila>
          )}
          <Fila etiqueta="Paciente">
            {pedido.paciente.apellido}, {pedido.paciente.nombre}
          </Fila>
          <Fila etiqueta="Trabajo">{pedido.trabajo}</Fila>
          {pedido.piezas.length > 0 && <Fila etiqueta="Piezas">{textoPiezas(pedido.piezas)}</Fila>}
          {pedido.color && <Fila etiqueta="Color">{pedido.color}</Fila>}
          <Fila etiqueta="Entrega">
            {pedido.fechaEntrega ? formatFechaArgentina(pedido.fechaEntrega, { dateStyle: "long" }) : "A coordinar"}
          </Fila>
          {pedido.archivos.length > 0 && (
            <Fila etiqueta="Archivos">{pedido.archivos.length} adjunto(s) en el pedido digital</Fila>
          )}
        </dl>

        {pedido.notas && (
          <div className="mt-4 rounded border border-neutral-400 p-3">
            <p className="text-sm text-neutral-500">Indicaciones</p>
            <p className="whitespace-pre-wrap text-base">{pedido.notas}</p>
          </div>
        )}

        <div className="mt-16 grid grid-cols-2 gap-10 text-center text-sm text-neutral-500">
          <div className="border-t border-neutral-400 pt-1">Firma del odontólogo</div>
          <div className="border-t border-neutral-400 pt-1">Recibido en el laboratorio</div>
        </div>
      </div>
    </div>
  );
}
