import Link from "next/link";
import {
  CalendarDays,
  DoorOpen,
  FileImage,
  HeartPulse,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PageTitle } from "@/components/app-shell/page-title-context";
import { ActionCard, type ActionCardProps } from "@/components/dashboard/action-card";
import { requireSessionWithModules, obtenerMiProfesionalId } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant-context";
import { permisosDe, type Permisos } from "@/lib/permissions";
import { listarFacturas } from "@/lib/actions/facturacion";
import {
  hoyArgentina,
  addDays,
  toISODate,
  inicioDiaArgentina,
  formatHoraArgentina,
} from "@/lib/date-utils";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

interface Atajo extends Omit<ActionCardProps, "badge"> {
  key: string;
  modulo?: string;
  permiso?: keyof Permisos;
}

const ESTADO_LABEL: Record<string, string> = {
  RESERVADO: "Reservado",
  CONFIRMADO: "Confirmado",
  EN_ESPERA: "En espera",
  EN_ATENCION: "En atención",
};

export default async function DashboardPage() {
  const session = await requireSessionWithModules();
  const permisos = permisosDe(session.rol);
  const esMedico = session.rol === "MEDICO";

  const hoy = hoyArgentina();
  const manana = addDays(hoy, 1);
  const inicioMes = inicioDiaArgentina(`${toISODate(hoy).slice(0, 7)}-01`);

  const miProfesionalId = !permisos.verTodosLosTurnos
    ? await obtenerMiProfesionalId(session.userId, session.tenantId)
    : null;
  const filtroProfesional = miProfesionalId ? { profesionalId: miProfesionalId } : {};

  const verFacturacion = permisos.gestionarFacturacion || permisos.verTodaFacturacion;

  // Una sola transacción para todos los conteos: el pool de conexiones es
  // chico y varias transacciones en paralelo lo agotan (P2028).
  const [[pacientesCount, turnosHoyCount, enEsperaCount, estudiosPendientesCount, proximos], facturas] =
    await Promise.all([
      withTenantContext(session.tenantId, async (tx) => {
        const delDia = { fechaHora: { gte: hoy, lt: manana }, ...filtroProfesional };
        return Promise.all([
          tx.paciente.count(),
          tx.turno.count({ where: { ...delDia, estado: { not: "CANCELADO" } } }),
          tx.turno.count({ where: { ...delDia, estado: "EN_ESPERA" } }),
          tx.estudio.count({ where: { estado: "PENDIENTE" } }),
          tx.turno.findMany({
            where: { ...delDia, estado: { in: ["RESERVADO", "CONFIRMADO", "EN_ESPERA", "EN_ATENCION"] } },
            include: { paciente: true, practica: true, profesional: true },
            orderBy: { fechaHora: "asc" },
            take: 6,
          }),
        ] as const);
      }),
      verFacturacion ? listarFacturas(toISODate(inicioMes)) : Promise.resolve([]),
    ]);

  const facturadoMes = facturas.reduce((acc, f) => acc + Number(f.montoTotal), 0);

  // Catálogo de atajos; cada rol ve los que tienen sentido para su trabajo
  // (permiso + módulo habilitado), en el orden en que los usaría.
  const catalogo: Record<string, Atajo> = {
    pacientes: {
      key: "pacientes",
      href: "/pacientes",
      label: "Pacientes",
      descripcion: esMedico ? "Buscá uno para atenderlo" : "Buscar, ver y cargar fichas",
      icon: Users,
      modulo: "PACIENTES",
    },
    agenda: {
      key: "agenda",
      href: "/turnos",
      label: esMedico ? "Mi agenda" : "Agenda",
      descripcion: esMedico ? "Tus turnos de la semana" : "Turnos de la semana",
      icon: CalendarDays,
      modulo: "TURNOS",
    },
    sala: {
      key: "sala",
      href: "/sala-espera",
      label: "Sala de espera",
      descripcion: esMedico ? "Llamá al próximo paciente" : "Quién llegó y quién falta",
      icon: DoorOpen,
      modulo: "TURNOS",
      permiso: "gestionarTurnos",
    },
    estudios: {
      key: "estudios",
      href: "/estudios",
      label: "Estudios e informes",
      descripcion: permisos.informarEstudios ? "Informá los pendientes" : "Cargar y consultar estudios",
      icon: FileImage,
      modulo: "ESTUDIOS",
    },
    facturacion: {
      key: "facturacion",
      href: "/facturacion",
      label: "Facturación",
      descripcion: "Cobros y comprobantes",
      icon: Receipt,
      modulo: "FACTURACION",
    },
    obrasSociales: {
      key: "obrasSociales",
      href: "/obras-sociales",
      label: "Obras sociales",
      descripcion: "Catálogo y afiliaciones",
      icon: HeartPulse,
      modulo: "OBRAS_SOCIALES",
    },
    configuracion: {
      key: "configuracion",
      href: "/configuracion",
      label: "Configuración",
      descripcion: "Profesionales, prácticas y usuarios",
      icon: Settings,
      permiso: "gestionarConfiguracion",
    },
    auditoria: {
      key: "auditoria",
      href: "/auditoria",
      label: "Auditoría",
      descripcion: "Quién hizo qué y cuándo",
      icon: ShieldCheck,
      permiso: "verAuditoria",
    },
  };

  const ordenPorRol: Record<string, string[]> = {
    MEDICO: ["agenda", "sala", "pacientes", "estudios"],
    SECRETARIA: ["agenda", "sala", "pacientes", "facturacion", "estudios", "obrasSociales"],
    ADMIN: ["agenda", "sala", "pacientes", "estudios", "facturacion", "obrasSociales", "configuracion", "auditoria"],
    AUDITOR: ["auditoria", "agenda", "facturacion", "pacientes"],
  };

  const badges: Record<string, number> = {
    sala: enEsperaCount,
    estudios: permisos.informarEstudios ? estudiosPendientesCount : 0,
  };

  const atajos = (ordenPorRol[session.rol] ?? [])
    .map((k) => catalogo[k])
    .filter((a) => (!a.modulo || session.enabledModules.includes(a.modulo as never)) && (!a.permiso || permisos[a.permiso]));

  const stats = [
    { label: esMedico ? "Mis turnos hoy" : "Turnos hoy", value: turnosHoyCount.toLocaleString("es-AR") },
    { label: "En sala ahora", value: enEsperaCount.toLocaleString("es-AR") },
    { label: "Estudios por informar", value: estudiosPendientesCount.toLocaleString("es-AR") },
    ...(verFacturacion ? [{ label: "Facturado este mes", value: currency.format(facturadoMes) }] : []),
    { label: "Pacientes", value: pacientesCount.toLocaleString("es-AR") },
  ];

  return (
    <>
      <PageTitle title="Inicio" />
      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">¿Qué querés hacer?</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {atajos.map((a, i) => (
              <ActionCard
                key={a.key}
                href={a.href}
                label={a.label}
                descripcion={a.descripcion}
                icon={a.icon}
                badge={badges[a.key]}
                destacada={i === 0}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Turnos de hoy</h2>
              <Link href="/turnos" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                Ver agenda
              </Link>
            </div>
            {proximos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No quedan turnos pendientes para hoy.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {proximos.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-4">
                      <span className="w-14 shrink-0 text-sm font-semibold text-foreground">
                        {formatHoraArgentina(t.fechaHora)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {t.paciente.apellido}, {t.paciente.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.practica.nombre}
                          {!esMedico && ` — Dr/a. ${t.profesional.apellido}`}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      {ESTADO_LABEL[t.estado] ?? t.estado}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 self-start lg:grid-cols-1">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
