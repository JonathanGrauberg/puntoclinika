import type { Metadata } from "next";
import { PedidoPublicoVista } from "@/components/laboratorio/pedido-publico";
import { obtenerPedidoPublico } from "@/lib/actions/pedido-publico";

// El link es privado: que ningún buscador lo indexe ni lo copie en la vista previa.
export const metadata: Metadata = {
  title: "Pedido de laboratorio",
  robots: { index: false, follow: false },
};

export default async function PedidoPorEnlacePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pedido = await obtenerPedidoPublico(token);

  if ("error" in pedido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-lg font-bold text-foreground">No se puede abrir este pedido</p>
          <p className="mt-2 text-sm text-muted-foreground">{pedido.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PedidoPublicoVista token={token} pedido={pedido} />
    </div>
  );
}
