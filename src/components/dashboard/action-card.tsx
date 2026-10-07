import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface ActionCardProps {
  href: string;
  label: string;
  descripcion?: string;
  icon: LucideIcon;
  /** Número chico arriba a la derecha (ej: pacientes en espera). */
  badge?: number;
  /** Resalta la card (acción principal). */
  destacada?: boolean;
}

export function ActionCard({ href, label, descripcion, icon: Icon, badge, destacada }: ActionCardProps) {
  return (
    <Link
      href={href}
      className={`group relative flex min-h-36 flex-col justify-between gap-4 rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        destacada
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full ${
            destacada ? "bg-primary-foreground/15" : "bg-muted"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        {badge !== undefined && badge > 0 && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              destacada ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-base font-bold">{label}</p>
        {descripcion && (
          <p className={`mt-0.5 text-sm ${destacada ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
            {descripcion}
          </p>
        )}
      </div>
    </Link>
  );
}
