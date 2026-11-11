import type { EstadoTurno } from "@prisma/client";
import type { TenantClient } from "./tenant-context";
import { addDays, combinarFechaHoraArgentina, hoyArgentina, toISODate } from "./date-utils";

const PACIENTES_DEMO = [
  { nombre: "Lucía", apellido: "Fernández", telefono: "3434 55-0101" },
  { nombre: "Martín", apellido: "Gómez", telefono: "3434 55-0102" },
  { nombre: "Valentina", apellido: "Romero", telefono: "3434 55-0103" },
  { nombre: "Santiago", apellido: "Acosta", telefono: "3434 55-0104" },
  { nombre: "Camila", apellido: "Benítez", telefono: "3434 55-0105" },
  { nombre: "Joaquín", apellido: "Sosa", telefono: "3434 55-0106" },
  { nombre: "Agustina", apellido: "Molina", telefono: "3434 55-0107" },
  { nombre: "Tomás", apellido: "Herrera", telefono: "3434 55-0108" },
];

// [paciente, hora, día (0 = hoy, 1 = mañana), práctica, estado]
const TURNOS_DEMO: [number, string, number, string, EstadoTurno][] = [
  [0, "09:00", 0, "Consulta", "ATENDIDO"],
  [1, "10:30", 0, "Limpieza", "EN_ESPERA"],
  [2, "11:30", 0, "Arreglo de caries", "CONFIRMADO"],
  [3, "16:00", 0, "Extracción", "RESERVADO"],
  [4, "17:00", 0, "Corona", "RESERVADO"],
  [5, "09:30", 1, "Tratamiento de conducto", "CONFIRMADO"],
  [6, "10:30", 1, "Consulta", "RESERVADO"],
];

export async function cargarDemoDental(
  tx: TenantClient,
  opts: {
    tenantId: string;
    profesionalId: string;
    practicas: { id: string; nombre: string; duracionMin: number }[];
  }
) {
  const hoy = toISODate(hoyArgentina());
  const manana = toISODate(addDays(hoyArgentina(), 1));
  const porNombre = new Map(opts.practicas.map((p) => [p.nombre, p]));
  const fallback = opts.practicas[0];
  if (!fallback) return { pacientes: 0, turnos: 0 };

  // Inserciones en lote: pocas consultas, así no se acerca al límite de tiempo de la transacción.
  const pacientes = await tx.paciente.createManyAndReturn({
    data: PACIENTES_DEMO.map((p) => ({
      tenantId: opts.tenantId,
      nombre: p.nombre,
      apellido: p.apellido,
      telefono: p.telefono,
      esDemo: true,
    })),
    select: { id: true, apellido: true },
  });
  // createManyAndReturn no garantiza el orden: se reubica por apellido.
  const idPorApellido = new Map(pacientes.map((p) => [p.apellido, p.id]));

  const turnos = TURNOS_DEMO.map(([idx, hora, dia, nombrePractica, estado]) => {
    const practica = porNombre.get(nombrePractica) ?? fallback;
    return {
      tenantId: opts.tenantId,
      pacienteId: idPorApellido.get(PACIENTES_DEMO[idx].apellido)!,
      profesionalId: opts.profesionalId,
      practicaId: practica.id,
      fechaHora: combinarFechaHoraArgentina(dia === 0 ? hoy : manana, hora),
      duracionMin: practica.duracionMin,
      estado,
      origen: "secretaria",
      esDemo: true,
    };
  });
  await tx.turno.createMany({ data: turnos });
  return { pacientes: pacientes.length, turnos: turnos.length };
}

/**
 * Borra los datos de ejemplo. Si alguien ya escribió algo en la ficha de un
 * paciente de ejemplo (historia, cobros), esa ficha se conserva como real en
 * vez de perder lo escrito.
 */
export async function borrarDemo(tx: TenantClient, tenantId: string) {
  // El filtro por centro es explícito (además de RLS): este código también lo usa el seed, que corre sin RLS.
  await tx.turno.deleteMany({ where: { esDemo: true, tenantId } });
  const { count: borrados } = await tx.paciente.deleteMany({
    where: {
      esDemo: true,
      tenantId,
      turnos: { none: {} },
      historia: { none: {} },
      facturas: { none: {} },
      estudios: { none: {} },
    },
  });
  const { count: conservados } = await tx.paciente.updateMany({
    where: { esDemo: true, tenantId },
    data: { esDemo: false },
  });
  return { borrados, conservados };
}
