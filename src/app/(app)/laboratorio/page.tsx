import { redirect } from "next/navigation";
import { Building2, ClipboardList, Hammer } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { ActionCard } from "@/components/dashboard/action-card";
import { listarPedidos } from "@/lib/actions/pedidos-laboratorio";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";

export default async function LaboratorioPage() {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).verLaboratorio || !session.enabledModules.includes("LABORATORIO")) {
    redirect("/dashboard");
  }
  const pedidos = (await listarPedidos()) ?? [];
  const enCurso = pedidos.filter((p) => p.estado !== "ENTREGADO").length;

  return (
    <>
      <PageTitle title="Laboratorio" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ActionCard
          href="/laboratorio/pedidos"
          label="Pedidos"
          descripcion="Pedir un trabajo y seguirlo"
          icon={ClipboardList}
          badge={enCurso || undefined}
          destacada
        />
        <ActionCard
          href="/laboratorio/laboratorios"
          label="Mis laboratorios"
          descripcion="Los laboratorios con los que trabajás"
          icon={Building2}
        />
        <ActionCard
          href="/laboratorio/trabajos"
          label="Trabajos"
          descripcion="Tu lista de trabajos para pedir"
          icon={Hammer}
        />
      </div>
    </>
  );
}
