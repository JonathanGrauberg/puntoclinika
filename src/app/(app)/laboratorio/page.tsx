import { redirect } from "next/navigation";
import { Building2, ClipboardList, Hammer } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { ActionCard } from "@/components/dashboard/action-card";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";

export default async function LaboratorioPage() {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).verLaboratorio || !session.enabledModules.includes("LABORATORIO")) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageTitle title="Laboratorio" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ActionCard
          href="/laboratorio/laboratorios"
          label="Mis laboratorios"
          descripcion="Los laboratorios con los que trabajás"
          icon={Building2}
          destacada
        />
        <ActionCard
          href="/laboratorio/trabajos"
          label="Trabajos"
          descripcion="Tu lista de trabajos para pedir"
          icon={Hammer}
        />
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border p-5 opacity-70">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-base font-bold text-foreground">Pedidos</p>
            <p className="text-sm text-muted-foreground">Próximamente: pedir y seguir cada trabajo</p>
          </div>
        </div>
      </div>
    </>
  );
}
