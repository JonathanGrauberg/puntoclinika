import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CuentaDetalleVista } from "@/components/dueno/cuenta-detalle";
import { obtenerCuenta } from "@/lib/actions/dueno";

export default async function CuentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cuenta = await obtenerCuenta(id);
  if (!cuenta) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/dueno" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Cuentas
      </Link>
      <CuentaDetalleVista cuenta={cuenta} ahoraMs={Date.now()} />
    </div>
  );
}
