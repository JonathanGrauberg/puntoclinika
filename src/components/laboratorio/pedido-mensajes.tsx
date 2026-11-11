"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { sileo } from "sileo";
import { enviarMensajePedido } from "@/lib/actions/pedidos-laboratorio";

interface Mensaje {
  id: string;
  autorTipo: string;
  autorNombre: string;
  texto: string;
  creadoEn: Date;
}

function cuando(d: Date) {
  return new Date(d).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function PedidoMensajes({
  pedidoId,
  mensajes,
  puedeEscribir,
}: {
  pedidoId: string;
  mensajes: Mensaje[];
  puedeEscribir: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [texto, setTexto] = useState("");

  function enviar() {
    if (!texto.trim()) return;
    start(async () => {
      const r = await enviarMensajePedido(pedidoId, texto);
      if (r.error) return void sileo.error({ title: r.error });
      setTexto("");
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-muted-foreground">Mensajes</h2>
      {mensajes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay mensajes en este pedido.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {mensajes.map((m) => {
            const propio = m.autorTipo === "CONSULTORIO";
            return (
              <li
                key={m.id}
                className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${
                  propio ? "self-end bg-primary/10" : "self-start bg-muted"
                }`}
              >
                <p className="text-xs font-semibold text-muted-foreground">
                  {m.autorNombre}
                  {!propio && " (laboratorio)"} · {cuando(m.creadoEn)}
                </p>
                <p className="whitespace-pre-wrap text-base text-foreground">{m.texto}</p>
              </li>
            );
          })}
        </ul>
      )}
      {puedeEscribir && (
        <div className="flex gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribí un mensaje para el laboratorio..."
            className="min-h-12 flex-1 rounded-xl border border-border bg-background p-3 text-base text-foreground outline-none focus:border-foreground"
          />
          <button
            type="button"
            onClick={enviar}
            disabled={pending || !texto.trim()}
            aria-label="Enviar mensaje"
            className="flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      )}
    </section>
  );
}
