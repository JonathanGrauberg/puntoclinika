import type { EstadoHallazgo, EstadoPedidoLab, EstadoTurno, SuperficieDental, TipoHallazgo } from "@prisma/client";
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

// [paciente, pieza, tipo, estado, caras]
const HALLAZGOS_DEMO: [number, number, TipoHallazgo, EstadoHallazgo, SuperficieDental[]][] = [
  [0, 36, "CARIES", "A_REALIZAR", ["OCLUSAL"]],
  [0, 16, "OBTURACION", "EXISTENTE", ["MESIAL", "OCLUSAL"]],
  [0, 26, "CORONA", "EXISTENTE", []],
  [0, 46, "AUSENTE", "EXISTENTE", []],
  [1, 18, "EXTRACCION", "A_REALIZAR", []],
  [1, 21, "CORONA", "EXISTENTE", []],
  [1, 11, "FRACTURA", "A_REALIZAR", ["OCLUSAL"]],
  [1, 38, "AUSENTE", "EXISTENTE", []],
  [2, 14, "CARIES", "A_REALIZAR", ["MESIAL", "OCLUSAL"]],
  [2, 24, "SELLADOR", "EXISTENTE", ["OCLUSAL"]],
  [2, 36, "ENDODONCIA", "EXISTENTE", []],
  [3, 17, "EXTRACCION", "A_REALIZAR", []],
  [3, 47, "IMPLANTE", "EXISTENTE", []],
  [4, 15, "CARIES", "A_REALIZAR", ["DISTAL"]],
  [4, 25, "OBTURACION", "EXISTENTE", ["OCLUSAL"]],
];

// [paciente, pieza, texto, hace cuántos días]
const PRESTACIONES_DEMO: [number, number, string, number][] = [
  [0, 16, "Arreglo de caries (obturación) — pieza 16 (MO)", 14],
  [0, 26, "Corona — pieza 26", 45],
  [2, 36, "Endodoncia (conducto) — pieza 36", 30],
];

// [paciente, pieza, trabajo, estado, laboratorio (0/1), días hasta la entrega (negativo = ya pasó)]
const PEDIDOS_DEMO: [number, number[], string, EstadoPedidoLab, number, number][] = [
  [0, [36], "Corona de zirconio", "EN_PROCESO", 0, 5],
  [1, [], "Prótesis parcial acrílica", "ENVIADO", 1, 12],
  [2, [], "Placa de relajación (bruxismo)", "TERMINADO", 1, 1],
  [3, [25], "Corona de porcelana sobre metal", "EN_PRUEBA", 0, -2],
];

const LABORATORIOS_DEMO = [
  { nombre: "Laboratorio Sonrisa (ejemplo)", contacto: "Marcelo", telefono: "3434 55-0201", especialidades: ["Zirconio", "Prótesis fija"] },
  { nombre: "Protesis Paraná (ejemplo)", contacto: "Laura", telefono: "3434 55-0202", especialidades: ["Prótesis removible", "Ortodoncia"] },
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

  const idDe = (i: number) => idPorApellido.get(PACIENTES_DEMO[i].apellido)!;
  await tx.hallazgoDental.createMany({
    data: HALLAZGOS_DEMO.map(([i, pieza, tipo, estado, superficies]) => ({
      tenantId: opts.tenantId,
      pacienteId: idDe(i),
      profesionalId: opts.profesionalId,
      pieza,
      tipo,
      estado,
      superficies,
      esDemo: true,
    })),
  });
  await tx.historiaClinicaEntry.createMany({
    data: PRESTACIONES_DEMO.map(([i, pieza, contenido, hace]) => ({
      tenantId: opts.tenantId,
      pacienteId: idDe(i),
      profesionalId: opts.profesionalId,
      tipo: "PRESTACION" as const,
      contenido,
      piezas: [pieza],
      fecha: new Date(Date.now() - hace * 86_400_000),
      esDemo: true,
    })),
  });

  const laboratorios = await tx.laboratorio.createManyAndReturn({
    data: LABORATORIOS_DEMO.map((l) => ({ tenantId: opts.tenantId, ...l, esDemo: true })),
    select: { id: true, nombre: true },
  });
  const idLab = (i: number) => laboratorios.find((l) => l.nombre === LABORATORIOS_DEMO[i].nombre)!.id;
  const ultimo = await tx.pedidoLaboratorio.aggregate({ where: { tenantId: opts.tenantId }, _max: { numero: true } });
  let numero = ultimo._max.numero ?? 0;
  const hoyDia = hoyArgentina();
  const pedidos = await tx.pedidoLaboratorio.createManyAndReturn({
    data: PEDIDOS_DEMO.map(([i, piezas, trabajo, estado, lab, dias]) => ({
      tenantId: opts.tenantId,
      numero: ++numero,
      pacienteId: idDe(i),
      laboratorioId: idLab(lab),
      trabajo,
      piezas,
      estado,
      fechaEntrega: addDays(hoyDia, dias),
      creadoEn: new Date(Date.now() - 6 * 86_400_000),
      esDemo: true,
    })),
    select: { id: true, estado: true },
  });
  const orden: EstadoPedidoLab[] = ["ENVIADO", "RECIBIDO", "EN_PROCESO", "EN_PRUEBA", "TERMINADO"];
  await tx.pedidoEstado.createMany({
    data: pedidos.flatMap((p, k) =>
      orden.slice(0, orden.indexOf(p.estado) + 1).map((estado, j) => ({
        tenantId: opts.tenantId,
        pedidoId: p.id,
        estado,
        autor: "Datos de ejemplo",
        creadoEn: new Date(Date.now() - (6 - j - k * 0.1) * 86_400_000),
      }))
    ),
  });
  return { pacientes: pacientes.length, turnos: turnos.length };
}

/**
 * Borra los datos de ejemplo. Si alguien ya escribió algo en la ficha de un
 * paciente de ejemplo (historia, cobros), esa ficha se conserva como real en
 * vez de perder lo escrito.
 */
export async function borrarDemo(tx: TenantClient, tenantId: string) {
  // El filtro por centro es explícito (además de RLS): este código también lo usa el seed, que corre sin RLS.
  await tx.pedidoLaboratorio.deleteMany({ where: { esDemo: true, tenantId } });
  await tx.laboratorio.deleteMany({ where: { esDemo: true, tenantId, pedidos: { none: {} } } });
  await tx.laboratorio.updateMany({ where: { esDemo: true, tenantId }, data: { esDemo: false } });
  await tx.turno.deleteMany({ where: { esDemo: true, tenantId } });
  await tx.hallazgoDental.deleteMany({ where: { esDemo: true, tenantId } });
  await tx.historiaClinicaEntry.deleteMany({ where: { esDemo: true, tenantId } });
  const { count: borrados } = await tx.paciente.deleteMany({
    where: {
      esDemo: true,
      tenantId,
      turnos: { none: {} },
      historia: { none: {} },
      facturas: { none: {} },
      estudios: { none: {} },
      pedidosLaboratorio: { none: {} },
    },
  });
  const { count: conservados } = await tx.paciente.updateMany({
    where: { esDemo: true, tenantId },
    data: { esDemo: false },
  });
  return { borrados, conservados };
}
