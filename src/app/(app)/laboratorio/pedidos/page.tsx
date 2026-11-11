import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { PedidosLista } from "@/components/laboratorio/pedidos-lista";
import { listarPedidos } from "@/lib/actions/pedidos-laboratorio";
import { hoyArgentina } from "@/lib/date-utils";
import { permisosDe } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

export default async function PedidosPage() {
  const session = await requireSession();
  const pedidos = await listarPedidos();
  if (!pedidos) redirect("/dashboard");

  return (
    <>
      <PageTitle title="Pedidos de laboratorio" />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/laboratorio"
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Laboratorio
          </Link>
          {permisosDe(session.rol).gestionarLaboratorio && (
            <Link
              href="/laboratorio/pedidos/nuevo"
              className="flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-5 w-5" />
              Nuevo pedido
            </Link>
          )}
        </div>
        <PedidosLista pedidos={pedidos} hoyMs={hoyArgentina().getTime()} />
      </div>
    </>
  );
}
