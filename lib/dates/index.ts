import { formatInTimeZone } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Datas de negócio (log_date, due_date, etc.) são strings "YYYY-MM-DD" puras,
 * calculadas a partir do timezone do perfil do usuário — nunca derivadas de
 * `now()`/`new Date()` interpretado no timezone do servidor. Isso evita que
 * um registro feito às 23:50 "pule" de dia por causa de UTC.
 */
export function todayISO(timezone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

export function currentHour(timezone: string = DEFAULT_TIMEZONE): number {
  return Number(formatInTimeZone(new Date(), timezone, "H"));
}

function toUTCDate(dateISO: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyy-MM-dd");
}

/** 0 = domingo .. 6 = sábado — mesma convenção de habit_schedules.weekdays. */
export function weekdayOf(dateISO: string): number {
  return toUTCDate(dateISO).getUTCDay();
}

export function addDaysISO(dateISO: string, amount: number): string {
  const date = toUTCDate(dateISO);
  date.setUTCDate(date.getUTCDate() + amount);
  return toISO(date);
}

/** Dias entre duas datas ISO (a - b), em dias inteiros. */
export function diffInDays(aISO: string, bISO: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((toUTCDate(aISO).getTime() - toUTCDate(bISO).getTime()) / msPerDay);
}

export function compareISO(aISO: string, bISO: string): number {
  return aISO < bISO ? -1 : aISO > bISO ? 1 : 0;
}

export interface WeekRange {
  start: string;
  end: string;
  days: string[];
}

/** Semana SEG–DOM que contém dateISO. */
export function weekRangeOf(dateISO: string): WeekRange {
  const weekday = weekdayOf(dateISO); // 0=dom..6=sab
  const daysSinceMonday = (weekday + 6) % 7; // segunda=0
  const start = addDaysISO(dateISO, -daysSinceMonday);
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
  return { start, end: days[6], days };
}

/** "2026-10-15" -> "15/10/2026" */
export function formatDisplayDate(dateISO: string): string {
  const [y, m, d] = dateISO.split("-");
  return `${d}/${m}/${y}`;
}

/** Valida um identificador IANA (ex.: "America/Sao_Paulo"). */
export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Nomes completos, índice 0 = domingo (mesma convenção de habit_schedules.weekdays). */
export const WEEKDAY_NAMES = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
] as const;

/** Plural para frases ("às terças"), índice 0 = domingo. */
export const WEEKDAY_PLURAL = [
  "domingos",
  "segundas",
  "terças",
  "quartas",
  "quintas",
  "sextas",
  "sábados",
] as const;

export const WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"] as const;

// ---------------------------------------------------------------------------
// Meses ("AAAA-MM")
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

const MONTH_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isValidMonth(value: string): boolean {
  return MONTH_REGEX.test(value);
}

/** "2026-10-08" -> "2026-10" */
export function monthOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

/** "2026-10" -> "2026-10-01" */
export function monthStart(month: string): string {
  return `${month}-01`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Último dia do mês: "2026-10" -> "2026-10-31" */
export function monthEnd(month: string): string {
  return `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

export function addMonths(month: string, amount: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + amount;
  const year = Math.floor(total / 12);
  const monthIndex = ((total % 12) + 12) % 12;
  return `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/** "2026-10" -> "outubro de 2026" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} de ${y}`;
}

/** "2026-10" -> "out" (para eixos de gráfico) */
export function monthShort(month: string): string {
  const [, m] = month.split("-").map(Number);
  return MONTH_NAMES[m - 1].slice(0, 3);
}

/** Todas as datas de um mês, em ordem. */
export function daysOfMonth(month: string): string[] {
  return Array.from({ length: daysInMonth(month) }, (_, i) =>
    `${month}-${String(i + 1).padStart(2, "0")}`,
  );
}
