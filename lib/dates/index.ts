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

export const WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"] as const;
