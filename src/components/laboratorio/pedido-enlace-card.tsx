"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Mail, MessageCircle, RefreshCw, Ban, Link2 } from "lucide-react";
import { sileo } from "sileo";
import {
  enviarEnlacePorMail,
  renovarEnlacePedido,
  revocarEnlacePedido,
  type EnlaceVista,
} from "@/lib/actions/pedido-enlace";

const fecha = (d: Date) =>
  new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });

const boton =
  "flex h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 text-base font-semibold text-foreground hover:bg-muted disabled:opacity-50";

/** El link para que el laboratorio vea el pedido sin tener cuenta: copiar, mandar, renovar o desactivar. */
export function PedidoEnlaceCard({
  pedidoId,
  enlace,
  laboratorio,
  textoPedido,
}: {
  pedidoId: string;
  enlace: EnlaceVista | null;
  laboratorio: { nombre: string; email: string | null };
  textoPedido: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  function correr(fn: () => Promise<{ error?: string }>, ok: string) {
    start(async () => {
      const r = await fn();
      if (r.error) return void sileo.error({ title: r.error });
      sileo.success({ title: ok });
      setConfirmando(false);
      router.refresh();
    });
  }

  async function copiar(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      sileo.success({ title: "Link copiado" });
    } catch {
      sileo.error({ title: "No se pudo copiar. Seleccionalo y copialo a mano." });
    }
  }

  const vigente = enlace?.estado === "vigente";
  const mensaje = enlace
    ? `Hola! Te mando el pedido ${textoPedido}. Mirá los detalles, bajá los archivos y avisame cómo va desde acá (no necesitás cuenta): ${enlace.url}`
    : "";

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
        <Link2 className="h-4 w-4" />
        Link para {laboratorio.nombre}
      </h2>

      {!enlace || enlace.estado === "revocado" ? (
        <>
          <p className="text-sm text-muted-foreground">
            {enlace ? "El link anterior está desactivado y ya no funciona." : "Todavía no hay link para este pedido."}{" "}
            Con uno nuevo, el laboratorio ve el pedido y avisa cómo va, sin crear cuenta.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => correr(() => renovarEnlacePedido(pedidoId), "Link creado")}
            className="h-12 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
          >
            Crear link nuevo
          </button>
        </>
      ) : (
        <>
          <div className="rounded-xl bg-muted px-4 py-3">
            <p className="break-all text-sm text-foreground">{enlace.url}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {vigente ? `Vale hasta el ${fecha(enlace.venceEn)}` : `Venció el ${fecha(enlace.venceEn)}`}
              {enlace.usos > 0 && ` · lo abrieron ${enlace.usos} ${enlace.usos === 1 ? "vez" : "veces"}`}
            </p>
          </div>

          {vigente ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => copiar(enlace.url)} className={boton}>
                <Copy className="h-5 w-5" />
                Copiar link
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={boton}
              >
                <MessageCircle className="h-5 w-5" />
                Mandar por WhatsApp
              </a>
              {laboratorio.email && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => correr(() => enviarEnlacePorMail(pedidoId), `Enviado a ${laboratorio.email}`)}
                  className={boton}
                >
                  <Mail className="h-5 w-5" />
                  Mandar por mail
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-destructive">Este link venció: ya no abre el pedido. Renovalo para volver a usarlo.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => correr(() => renovarEnlacePedido(pedidoId), "Renovado por 30 días")}
              className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Renovar 30 días
            </button>
            {vigente &&
              (confirmando ? (
                <span className="flex items-center gap-2 text-sm">
                  ¿Desactivar? Deja de funcionar ya.
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => correr(() => revocarEnlacePedido(pedidoId), "Link desactivado")}
                    className="h-9 rounded-lg bg-destructive px-3 text-sm font-semibold text-destructive-foreground"
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    className="h-9 rounded-lg border border-border px-3 text-sm font-semibold"
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmando(true)}
                  className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-destructive/5"
                >
                  <Ban className="h-4 w-4" />
                  Desactivar
                </button>
              ))}
          </div>
        </>
      )}
    </section>
  );
}
