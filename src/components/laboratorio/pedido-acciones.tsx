"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Undo2 } from "lucide-react";
import { sileo } from "sileo";
import type { EstadoPedidoLab } from "@prisma/client";
import { cambiarEstadoPedido } from "@/lib/actions/pedidos-laboratorio";
import { ESTADOS_PEDIDO, ORDEN_ESTADOS, SIGUIENTE } from "@/lib/pedidos-lab";

/** El botón grande para avanzar el pedido, más los otros estados por si hay que saltar o devolver. */
export function PedidoAcciones({ pedidoId, estado }: { pedidoId: string; estado: EstadoPedidoLab }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nota, setNota] = useState("");
  const [otros, setOtros] = useState(false);

  const siguiente = SIGUIENTE[estado];

  function cambiar(nuevo: EstadoPedidoLab) {
    start(async () => {
      const r = await cambiarEstadoPedido(pedidoId, nuevo, nota);
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: `Ahora está: ${ESTADOS_PEDIDO[nuevo].label.toLowerCase()}` });
      setNota("");
      setOtros(false);
      router.refresh();
    });
  }

  const alternativos = ORDEN_ESTADOS.filter((e) => e !== estado && e !== siguiente);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-muted-foreground">¿Qué pasó con este trabajo?</h2>

      {siguiente ? (
        <button
          type="button"
          onClick={() => cambiar(siguiente)}
          disabled={pending}
          className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-primary text-lg font-bold text-primary-foreground disabled:opacity-50"
        >
          {ESTADOS_PEDIDO[siguiente].accion}
          <ArrowRight className="h-5 w-5" />
        </button>
      ) : (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">El trabajo ya está entregado. Listo.</p>
      )}

      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Agregar una nota al cambio (opcional)"
        className="min-h-16 rounded-xl border border-border bg-background p-3 text-base text-foreground outline-none focus:border-foreground"
      />

      {estado !== "DEVUELTO" && estado !== "ENTREGADO" && (
        <button
          type="button"
          onClick={() => cambiar("DEVUELTO")}
          disabled={pending}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-destructive/40 text-base font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50"
        >
          <Undo2 className="h-4 w-4" />
          Devolver con observaciones
        </button>
      )}

      <button
        type="button"
        onClick={() => setOtros((v) => !v)}
        className="h-10 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        {otros ? "Ocultar" : "Cambiar a otro estado"}
      </button>
      {otros && (
        <div className="flex flex-wrap gap-2">
          {alternativos
            .filter((e) => e !== "DEVUELTO")
            .map((e) => (
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
      )}
    </section>
  );
}
