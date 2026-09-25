import { redirect } from "next/navigation";
import Link from "next/link";
import { Stethoscope, ClipboardList, UsersRound } from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { requireSessionWithModules } from "@/lib/session";
import { permisosDe } from "@/lib/permissions";

const items = [
  {
    href: "/configuracion/profesionales",
    label: "Profesionales",
    desc: "Médicos y profesionales que atienden en el centro.",
    icon: Stethoscope,
  },
  {
    href: "/configuracion/practicas",
    label: "Prácticas",
    desc: "Catálogo de prácticas: nombre, duración y precio particular.",
    icon: ClipboardList,
  },
  {
    href: "/configuracion/usuarios",
    label: "Usuarios",
    desc: "Quién puede entrar al sistema y con qué rol.",
    icon: UsersRound,
  },
];

export default async function ConfiguracionPage() {
  const session = await requireSessionWithModules();
  if (!permisosDe(session.rol).gestionarConfiguracion) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageTitle title="Configuración" />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col gap-3 rounded-md border border-border bg-card p-5 transition-colors hover:bg-muted/50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground">
              <item.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
