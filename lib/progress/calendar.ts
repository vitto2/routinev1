import { compareISO, daysOfMonth, weekdayOf } from "@/lib/dates";
import { dailyScore, scoreForDays, type Score } from "@/lib/scoring";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

/** Faixas de desempenho do dia. O número (%) e um ícone acompanham sempre a cor. */
export type DayLevel = "future" | "none" | "low" | "partial" | "great";

export interface CalendarCell {
  date: string;
  day: number;
  level: DayLevel;
  percent: number | null;
  scheduled: number;
  completed: number;
  isToday: boolean;
}

export interface MonthGrid {
  /** semanas de segunda a domingo; null = espaço antes do dia 1 / depois do último dia */
  weeks: (CalendarCell | null)[][];
  month: Score;
  perfectDays: number;
  scoredDays: number;
}

export const GREAT_FROM = 0.8;
export const PARTIAL_FROM = 0.4;

export function levelFor(percent: number | null): Exclude<DayLevel, "future"> {
  if (percent === null) return "none";
  if (percent >= GREAT_FROM) return "great";
  if (percent >= PARTIAL_FROM) return "partial";
  return "low";
}

export function buildMonthGrid(
  month: string,
  today: string,
  habits: HabitWithSchedules[],
  logs: Map<string, HabitLog>,
): MonthGrid {
  const dates = daysOfMonth(month);
  let perfectDays = 0;
  let scoredDays = 0;

  const cells: CalendarCell[] = dates.map((date) => {
    const isFuture = compareISO(date, today) > 0;
    const logsForDay = new Map<string, HabitLog>();
    for (const habit of habits) {
      const log = logs.get(`${habit.id}:${date}`);
      if (log) logsForDay.set(habit.id, log);
    }

    const score = isFuture
      ? { scheduled: 0, completed: 0, percent: null }
      : dailyScore(habits, logsForDay, date);

    if (!isFuture && score.percent !== null) {
      scoredDays += 1;
      if (score.percent === 1) perfectDays += 1;
    }

    return {
      date,
      day: Number(date.slice(8, 10)),
      level: isFuture ? "future" : levelFor(score.percent),
      percent: score.percent,
      scheduled: score.scheduled,
      completed: score.completed,
      isToday: date === today,
    };
  });

  // Semana começa na segunda: quantos espaços vazios antes do dia 1.
  const leading = (weekdayOf(dates[0]) + 6) % 7;
  const padded: (CalendarCell | null)[] = [...Array(leading).fill(null), ...cells];
  while (padded.length % 7 !== 0) padded.push(null);

  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  return {
    weeks,
    month: scoreForDays(habits, logs, dates, today),
    perfectDays,
    scoredDays,
  };
}
