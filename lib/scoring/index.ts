import { addDaysISO, compareISO } from "@/lib/dates";
import { isScheduledOn } from "@/lib/scheduling";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

export interface Score {
  scheduled: number;
  completed: number;
  /** null quando não havia nada programado (evita mostrar 0% ou 100% enganosos) */
  percent: number | null;
}

function habitExistsOn(habit: HabitWithSchedules, dateISO: string): boolean {
  return compareISO(habit.created_at.slice(0, 10), dateISO) <= 0;
}

export function scheduledHabitsOn(
  habits: HabitWithSchedules[],
  dateISO: string,
): HabitWithSchedules[] {
  return habits.filter(
    (h) =>
      h.active &&
      habitExistsOn(h, dateISO) &&
      isScheduledOn(h.habit_schedules, dateISO),
  );
}

/**
 * Score diário = hábitos concluídos / hábitos programados naquele dia.
 * Tarefas nunca entram nesse cálculo (progresso delas é exibido separado).
 */
export function dailyScore(
  habits: HabitWithSchedules[],
  logsForDateByHabitId: Map<string, HabitLog>,
  dateISO: string,
): Score {
  const scheduled = scheduledHabitsOn(habits, dateISO);
  const completed = scheduled.filter(
    (h) => logsForDateByHabitId.get(h.id)?.completed,
  ).length;

  return {
    scheduled: scheduled.length,
    completed,
    percent: scheduled.length === 0 ? null : completed / scheduled.length,
  };
}

/**
 * Score semanal = soma(concluídos)/soma(programados) nos 7 dias — mais
 * robusto que média de scores diários quando o nº de hábitos varia por dia.
 */
export function weeklyScore(
  habits: HabitWithSchedules[],
  logsByHabitAndDate: Map<string, HabitLog>, // key: `${habitId}:${dateISO}`
  days: string[],
): Score {
  let scheduled = 0;
  let completed = 0;

  for (const day of days) {
    const dayScheduled = scheduledHabitsOn(habits, day);
    scheduled += dayScheduled.length;
    completed += dayScheduled.filter(
      (h) => logsByHabitAndDate.get(`${h.id}:${day}`)?.completed,
    ).length;
  }

  return {
    scheduled,
    completed,
    percent: scheduled === 0 ? null : completed / scheduled,
  };
}

export interface StreakResult {
  current: number;
  best: number;
}

/**
 * Percorre apenas as datas em que o hábito estava programado (não o
 * calendário inteiro), então dias não programados nunca quebram a sequência.
 * "Hoje" pendente não quebra o streak em andamento — fica como "em aberto".
 */
export function computeStreak(
  habit: HabitWithSchedules,
  logsByDate: Map<string, HabitLog>, // todos os logs desse hábito, key = log_date
  todayISODate: string,
  lookbackDays = 365,
): StreakResult {
  const habitStart = habit.created_at.slice(0, 10);
  const scheduledDates: string[] = [];

  for (let i = lookbackDays; i >= 0; i--) {
    const day = addDaysISO(todayISODate, -i);
    if (compareISO(day, habitStart) < 0) continue;
    if (isScheduledOn(habit.habit_schedules, day)) scheduledDates.push(day);
  }

  let best = 0;
  let run = 0;

  for (const day of scheduledDates) {
    const done = logsByDate.get(day)?.completed ?? false;
    const isToday = day === todayISODate;

    if (done) {
      run += 1;
      best = Math.max(best, run);
    } else if (!isToday) {
      run = 0;
    }
    // isToday && !done: pendente, mantém `run` como está (não quebra ainda)
  }

  return { current: run, best };
}
