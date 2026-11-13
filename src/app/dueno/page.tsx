import { notFound } from "next/navigation";
import { CuentasLista } from "@/components/dueno/cuentas-lista";
import { listarCuentas } from "@/lib/actions/dueno";

export default async function DuenoPage() {
  const cuentas = await listarCuentas();
  if (!cuentas) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">Cuentas</h1>
      <CuentasLista cuentas={cuentas} ahoraMs={Date.now()} />
    </div>
  );
}
