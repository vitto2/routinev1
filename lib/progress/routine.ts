import { addDaysISO } from "@/lib/dates";
import { dailyScore } from "@/lib/scoring";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

/** Fração mínima de hábitos concluídos para o dia contar como "rotina em dia". */
export const ROUTINE_THRESHOLD = 0.8;

export interface RoutineStreak {
  current: number;
  best: number;
}

/**
 * Dias seguidos com a rotina em dia (>= 80% dos hábitos de dia fixo).
 * - Dias sem nada programado são neutros: não somam nem quebram.
 * - "Hoje" abaixo da meta ainda não quebra (o dia não acabou).
 */
export function routineStreak(
  habits: HabitWithSchedules[],
  logs: Map<string, HabitLog>, // key: `${habitId}:${data}`
  today: string,
  lookbackDays: number,
): RoutineStreak {
  let run = 0;
  let best = 0;

  for (let i = lookbackDays; i >= 0; i--) {
    const date = addDaysISO(today, -i);
    const logsForDay = new Map<string, HabitLog>();
    for (const habit of habits) {
      const log = logs.get(`${habit.id}:${date}`);
      if (log) logsForDay.set(habit.id, log);
    }

    const { percent } = dailyScore(habits, logsForDay, date);
    if (percent === null) continue;

    if (percent >= ROUTINE_THRESHOLD) {
      run += 1;
      best = Math.max(best, run);
    } else if (date !== today) {
      run = 0;
    }
  }

  return { current: run, best };
}
