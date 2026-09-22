import type { LucideIcon } from "lucide-react";
import { CalendarDays, FileImage, LayoutDashboard, Receipt, ShieldCheck, Settings, Users } from "lucide-react";
import type { ModuloKey } from "@prisma/client";
import type { Permisos } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  modulo?: ModuloKey; // si no está definido, siempre visible (ej: Dashboard)
  requierePermiso?: keyof Permisos;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/pacientes", label: "Pacientes", icon: Users, modulo: "PACIENTES" },
  { href: "/turnos", label: "Turnos", icon: CalendarDays, modulo: "TURNOS" },
  { href: "/estudios", label: "Estudios", icon: FileImage, modulo: "ESTUDIOS" },
  { href: "/facturacion", label: "Facturación", icon: Receipt, modulo: "FACTURACION" },
];

export const NAV_ITEMS_SECONDARY: NavItem[] = [
  { href: "/auditoria", label: "Auditoría", icon: ShieldCheck, requierePermiso: "verAuditoria" },
  { href: "/configuracion", label: "Configuración", icon: Settings, requierePermiso: "gestionarConfiguracion" },
];
