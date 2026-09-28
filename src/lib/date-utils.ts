// Todo lo que toca "hoy", "esta semana" o "las 20:00" en este archivo está
// pensado para un solo huso horario: Argentina (UTC-3, sin horario de
// verano desde 2009 — el offset es siempre fijo). El bug real que esto
// arregla: en dev local el proceso corre en hora de Argentina, pero en
// Vercel corre en UTC, así que `new Date("2026-09-28T20:00:00")` daba un
// instante distinto según dónde corriera — apareció como "se guardó 3
// horas antes". Por eso todo acá pasa por Intl con timeZone explícito en
// vez de los getters locales (getHours, getDate, etc.), que dependen del
// huso del proceso que los llama.

export const ARG_TIME_ZONE = "America/Argentina/Buenos_Aires";
const ARG_OFFSET = "-03:00";

const DIAS_SEMANA = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function partesEnArgentina(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ARG_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: parts.hour === "24" ? 0 : Number(parts.hour),
    minute: Number(parts.minute),
    weekday: DIAS_SEMANA.indexOf(parts.weekday),
  };
}

function isoDesdePartes(p: { year: number; month: number; day: number }) {
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/**
 * El instante real de una fecha+hora tal como la completa alguien en
 * Argentina (inputs "YYYY-MM-DD" y "HH:mm") — da el mismo resultado sin
 * importar en qué huso corre el proceso. Usar esto (nunca `new Date(...)`
 * a mano) en cualquier lado donde se combine un input de fecha y de hora.
 */
export function combinarFechaHoraArgentina(fechaISO: string, horaHHmm: string): Date {
  return new Date(`${fechaISO}T${horaHHmm}:00${ARG_OFFSET}`);
}

/** Medianoche de esa fecha, en Argentina. */
export function inicioDiaArgentina(fechaISO: string): Date {
  return combinarFechaHoraArgentina(fechaISO, "00:00");
}

/** "Hoy" tal como lo ve alguien en Argentina ahora mismo, sin importar el huso del server. */
export function hoyArgentina(): Date {
  return inicioDiaArgentina(isoDesdePartes(partesEnArgentina(new Date())));
}

export function getMonday(date: Date): Date {
  const p = partesEnArgentina(date);
  const diff = p.weekday === 0 ? -6 : 1 - p.weekday;
  return addDays(inicioDiaArgentina(isoDesdePartes(p)), diff);
}

export function addDays(date: Date, days: number): Date {
  const p = partesEnArgentina(date);
  // Date.UTC acá es solo una calculadora de calendario (maneja el
  // desborde de mes/año solo) — no representa un instante real.
  const corrido = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return inicioDiaArgentina(
    `${corrido.getUTCFullYear()}-${String(corrido.getUTCMonth() + 1).padStart(2, "0")}-${String(corrido.getUTCDate()).padStart(2, "0")}`
  );
}

/** Fecha (YYYY-MM-DD) tal como se ve en Argentina, sin importar el huso del proceso. */
export function toISODate(date: Date): string {
  return isoDesdePartes(partesEnArgentina(date));
}

const DIA_LABEL = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

export function diaLabel(date: Date): string {
  return DIA_LABEL[partesEnArgentina(date).weekday];
}

/** Para mostrar fecha en pantallas server-rendered (páginas sin "use client"). */
export function formatFechaArgentina(date: Date, opts?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString("es-AR", { timeZone: ARG_TIME_ZONE, ...opts });
}

/** Ídem para fecha+hora. */
export function formatFechaHoraArgentina(date: Date, opts?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleString("es-AR", { timeZone: ARG_TIME_ZONE, ...opts });
}
