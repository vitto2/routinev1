import "server-only";
import { addDaysISO } from "@/lib/dates";
import { groupLogsByHabit } from "@/lib/data/logs";
import { computeStreak } from "@/lib/scoring";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

export interface HabitStreak {
  current: number;
  best: number;
  unit: "days" | "weeks";
  /** a janela de cálculo acabou antes de a sequência terminar: o valor real pode ser maior */
  capped: boolean;
}

/** Janela usada nos selos da tela Hoje: barata (uma leitura) e suficiente para o dia a dia. */
export const QUICK_STREAK_WINDOW_DAYS = 90;

/** Sequência de cada hábito a partir de logs já carregados (`${habitId}:${data}` -> log). */
export function streaksFromLogs(
  habits: HabitWithSchedules[],
  logs: Map<string, HabitLog>,
  today: string,
  windowDays: number,
): Map<string, HabitStreak> {
  const byHabit = groupLogsByHabit(logs);
  const result = new Map<string, HabitStreak>();

  for (const habit of habits) {
    const streak = computeStreak(habit, byHabit.get(habit.id) ?? new Map(), today, windowDays);
    const limit = streak.unit === "weeks" ? Math.floor(windowDays / 7) : windowDays;
    result.set(habit.id, { ...streak, capped: streak.current >= limit });
  }

  return result;
}

export function windowStart(today: string, windowDays: number) {
  return addDaysISO(today, -windowDays);
}
