import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { NuevoPedidoForm } from "@/components/laboratorio/nuevo-pedido-form";
import { datosNuevoPedido } from "@/lib/actions/pedidos-laboratorio";
import { obtenerPaciente } from "@/lib/actions/pacientes";
import { esPiezaValida } from "@/lib/odontograma";
import { permisosDe } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

export default async function NuevoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ pacienteId?: string; piezas?: string }>;
}) {
  const session = await requireSession();
  if (!permisosDe(session.rol).gestionarLaboratorio) redirect("/laboratorio/pedidos");
  const datos = await datosNuevoPedido();
  if (!datos) redirect("/dashboard");

  const { pacienteId, piezas } = await searchParams;
  const paciente = pacienteId ? await obtenerPaciente(pacienteId) : null;
  const piezasIniciales = (piezas ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && esPiezaValida(n));

  return (
    <>
      <PageTitle title="Nuevo pedido" />
      <div className="flex flex-col gap-4">
        <Link
          href="/laboratorio/pedidos"
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Pedidos
        </Link>
        {datos.laboratorios.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-base font-semibold text-foreground">Primero cargá un laboratorio</p>
            <p className="mt-1 text-sm text-muted-foreground">Lo necesitás para poder mandarle el pedido.</p>
            <Link
              href="/laboratorio/laboratorios"
              className="mt-4 inline-flex h-12 items-center rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground"
            >
              Agregar laboratorio
            </Link>
          </div>
        ) : (
          <NuevoPedidoForm
            trabajos={datos.trabajos}
            laboratorios={datos.laboratorios}
            pacienteInicial={
              paciente ? { id: paciente.id, nombre: paciente.nombre, apellido: paciente.apellido } : null
            }
            piezasIniciales={piezasIniciales}
          />
        )}
      </div>
    </>
  );
}
