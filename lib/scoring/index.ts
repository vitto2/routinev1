import { addDaysISO, compareISO, weekRangeOf } from "@/lib/dates";
import {
  activeScheduleOn,
  habitStartDate,
  isQuotaOn,
  isScheduledOn,
} from "@/lib/scheduling";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

export interface Score {
  scheduled: number;
  completed: number;
  /** null quando não havia nada programado (evita mostrar 0% ou 100% enganosos) */
  percent: number | null;
}

function toScore(scheduled: number, completed: number): Score {
  return {
    scheduled,
    completed,
    percent: scheduled === 0 ? null : completed / scheduled,
  };
}

function startedBy(habit: HabitWithSchedules, dateISO: string): boolean {
  const start = habitStartDate(habit.habit_schedules);
  return start !== null && compareISO(start, dateISO) <= 0;
}

/**
 * Hábitos de dia fixo programados para `dateISO`. Hábitos de cota semanal
 * ("X vezes por semana") ficam de fora: eles entram no score da semana.
 */
export function scheduledHabitsOn(
  habits: HabitWithSchedules[],
  dateISO: string,
): HabitWithSchedules[] {
  return habits.filter(
    (h) =>
      startedBy(h, dateISO) &&
      isScheduledOn(h.habit_schedules, dateISO) &&
      !isQuotaOn(h.habit_schedules, dateISO),
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

  return toScore(scheduled.length, completed);
}

type LogMap = Map<string, HabitLog>; // key: `${habitId}:${dateISO}`

/** Quantas vezes o hábito foi concluído nos dias informados. */
export function completionsIn(
  habitId: string,
  logs: LogMap,
  days: string[],
): number {
  return days.filter((d) => logs.get(`${habitId}:${d}`)?.completed).length;
}

/**
 * Contribuição de um hábito de cota semanal numa semana.
 * - Semana encerrada: meta cheia (limitada ao nº de dias considerados).
 * - Semana em andamento: só conta como "perdido" o que já não dá mais para
 *   cumprir (não punitivo): se ainda há dias suficientes, vale só o já feito.
 */
function quotaWeek(
  habit: HabitWithSchedules,
  logs: LogMap,
  weekDays: string[], // dias da semana que estão no período, já limitados a <= hoje
  weekEnd: string,
  todayISODate: string,
): { scheduled: number; completed: number } {
  // Só contam dias em que a cota está vigente: o início do hábito e as pausas
  // (lacunas nas agendas) reduzem a meta possível da semana.
  const quotaDays = (days: string[]) =>
    days.filter((d) => isQuotaOn(habit.habit_schedules, d));

  const eligibleDays = quotaDays(weekDays);
  if (eligibleDays.length === 0) return { scheduled: 0, completed: 0 };

  const lastEligible = eligibleDays[eligibleDays.length - 1];
  const target = activeScheduleOn(habit.habit_schedules, lastEligible)?.frequency_target;
  if (!target) return { scheduled: 0, completed: 0 };

  const weekEnded = compareISO(weekEnd, todayISODate) < 0;
  const wholeWeek = Array.from({ length: 7 }, (_, i) => addDaysISO(addDaysISO(weekEnd, -6), i));
  // Semana em andamento: a meta considera a semana inteira, não só os dias já vividos.
  const potentialDays = weekEnded ? eligibleDays : quotaDays(wholeWeek);
  const goal = Math.min(target, potentialDays.length);
  const done = Math.min(completionsIn(habit.id, logs, eligibleDays), goal);

  if (weekEnded) return { scheduled: goal, completed: done };

  // Dias que ainda dá para cumprir: os que restam depois de hoje + hoje (se não feito).
  const doneToday = logs.get(`${habit.id}:${todayISODate}`)?.completed ?? false;
  const daysAfterToday = quotaDays(wholeWeek).filter((d) => compareISO(d, todayISODate) > 0).length;
  const todayAvailable = isQuotaOn(habit.habit_schedules, todayISODate) && !doneToday ? 1 : 0;
  const canStillDo = daysAfterToday + todayAvailable;

  const need = goal - done;
  if (need <= canStillDo) return { scheduled: done, completed: done };
  return { scheduled: done + (need - canStillDo), completed: done };
}

/**
 * Score de um conjunto de dias (semana, mês...). Dias futuros são ignorados.
 * Dias fixos: soma(concluídos)/soma(programados), mais robusto que média de
 * scores diários quando o nº de hábitos varia por dia.
 */
export function scoreForDays(
  habits: HabitWithSchedules[],
  logs: LogMap,
  days: string[],
  todayISODate: string,
): Score {
  const pastDays = days.filter((d) => compareISO(d, todayISODate) <= 0);

  let scheduled = 0;
  let completed = 0;

  for (const day of pastDays) {
    const dayScheduled = scheduledHabitsOn(habits, day);
    scheduled += dayScheduled.length;
    completed += dayScheduled.filter((h) => logs.get(`${h.id}:${day}`)?.completed)
      .length;
  }

  const quotaHabits = habits.filter((h) =>
    pastDays.some((d) => isQuotaOn(h.habit_schedules, d)),
  );

  if (quotaHabits.length > 0) {
    const weeks = new Map<string, string[]>();
    for (const day of pastDays) {
      const key = weekRangeOf(day).start;
      weeks.set(key, [...(weeks.get(key) ?? []), day]);
    }

    for (const [weekStart, weekDays] of weeks) {
      const weekEnd = addDaysISO(weekStart, 6);
      for (const habit of quotaHabits) {
        if (!weekDays.some((d) => isQuotaOn(habit.habit_schedules, d))) continue;
        const result = quotaWeek(habit, logs, weekDays, weekEnd, todayISODate);
        scheduled += result.scheduled;
        completed += result.completed;
      }
    }
  }

  return toScore(scheduled, completed);
}

/** Atalho: score semanal (dias futuros da semana corrente não entram). */
export function weeklyScore(
  habits: HabitWithSchedules[],
  logs: LogMap,
  days: string[],
  todayISODate: string,
): Score {
  return scoreForDays(habits, logs, days, todayISODate);
}

export interface StreakResult {
  current: number;
  best: number;
  unit: "days" | "weeks";
}

/**
 * Percorre apenas as datas em que o hábito estava programado (não o
 * calendário inteiro), então dias não programados nunca quebram a sequência.
 * "Hoje" pendente não quebra o streak em andamento — fica como "em aberto".
 * Hábitos de cota semanal contam em semanas que bateram a meta.
 */
export function computeStreak(
  habit: HabitWithSchedules,
  logsByDate: Map<string, HabitLog>, // todos os logs desse hábito, key = log_date
  todayISODate: string,
  lookbackDays = 365,
): StreakResult {
  const start = habitStartDate(habit.habit_schedules);
  const logs: LogMap = new Map(
    Array.from(logsByDate.entries()).map(([date, log]) => [`${habit.id}:${date}`, log]),
  );

  if (isQuotaOn(habit.habit_schedules, todayISODate)) {
    const thisWeek = weekRangeOf(todayISODate).start;
    const weekStarts: string[] = [];
    for (let i = Math.floor(lookbackDays / 7); i >= 0; i--) {
      const ws = addDaysISO(thisWeek, -7 * i);
      if (start && compareISO(addDaysISO(ws, 6), start) >= 0) weekStarts.push(ws);
    }

    let best = 0;
    let run = 0;
    for (const ws of weekStarts) {
      const days = Array.from({ length: 7 }, (_, i) => addDaysISO(ws, i));
      const target = activeScheduleOn(habit.habit_schedules, days[6])?.frequency_target ?? 0;
      const met = target > 0 && completionsIn(habit.id, logs, days) >= target;
      if (met) {
        run += 1;
        best = Math.max(best, run);
      } else if (ws !== thisWeek) {
        run = 0;
      }
    }
    return { current: run, best, unit: "weeks" };
  }

  const scheduledDates: string[] = [];
  for (let i = lookbackDays; i >= 0; i--) {
    const day = addDaysISO(todayISODate, -i);
    if (start && compareISO(day, start) < 0) continue;
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

  return { current: run, best, unit: "days" };
}
