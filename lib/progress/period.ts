import { addDaysISO, compareISO, diffInDays, weekdayOf } from "@/lib/dates";
import { activeScheduleOn, isQuotaOn, isScheduledOn } from "@/lib/scheduling";
import { dailyScore, scoreForDays, type Score } from "@/lib/scoring";
import type { HabitLog, HabitWithSchedules, Task } from "@/types/domain";

type LogMap = Map<string, HabitLog>; // key: `${habitId}:${data}`

/** Datas de um período que termina em `today`, da mais antiga para hoje. */
export function periodDays(today: string, length: number): string[] {
  return Array.from({ length }, (_, i) => addDaysISO(today, -(length - 1 - i)));
}

export type StripState = "done" | "partial" | "missed" | "open" | "pending" | "off";

export interface StripCell {
  date: string;
  state: StripState;
}

export interface HabitPeriodStats {
  habit: HabitWithSchedules;
  /** hábito de cota semanal ("X vezes por semana") em vez de dias fixos */
  kind: "fixed" | "quota";
  /** consistência no período (já considera a cota semanal) */
  score: Score;
  /** vezes em que foi concluído (em dias em que estava programado) */
  timesDone: number;
  /** dias fixos programados até hoje (0 para cota semanal) */
  scheduledDays: number;
  /** dias fixos programados e já encerrados sem nenhum progresso (hoje não conta) */
  missed: number;
  /** dias encerrados com progresso, mas abaixo da meta (quantidade/tempo) */
  partialDays: number;
  /** meta semanal, quando é cota */
  weeklyTarget: number | null;
  /** média de conclusões por semana no período */
  perWeek: number;
  /** soma dos valores registrados (ml, minutos); null para hábitos de marcar */
  totalValue: number | null;
  /** média por dia em que houve registro de valor */
  averageValue: number | null;
  /** última data concluída dentro do período */
  lastDone: string | null;
  /** maior sequência de dias programados concluídos dentro do período */
  bestRun: number;
  strip: StripCell[];
}

export function habitPeriodStats(
  habit: HabitWithSchedules,
  logs: LogMap,
  days: string[],
  today: string,
): HabitPeriodStats {
  const quota = days.some((d) => isQuotaOn(habit.habit_schedules, d));
  const past = days.filter((d) => compareISO(d, today) <= 0);

  let timesDone = 0;
  let scheduledDays = 0;
  let missed = 0;
  let partialDays = 0;
  let totalValue = 0;
  let valueDays = 0;
  let lastDone: string | null = null;
  let run = 0;
  let bestRun = 0;

  const strip: StripCell[] = past.map((date) => {
    const scheduled = isScheduledOn(habit.habit_schedules, date);
    const log = logs.get(`${habit.id}:${date}`);
    const done = Boolean(log?.completed);
    const dayQuota = isQuotaOn(habit.habit_schedules, date);

    if (log?.value && log.value > 0) {
      totalValue += Number(log.value);
      valueDays += 1;
    }

    if (!scheduled) return { date, state: "off" as const };

    if (done) {
      timesDone += 1;
      lastDone = date;
      if (!dayQuota) {
        scheduledDays += 1;
        run += 1;
        bestRun = Math.max(bestRun, run);
      }
      return { date, state: "done" as const };
    }

    if (dayQuota) return { date, state: date === today ? ("pending" as const) : ("open" as const) };

    scheduledDays += 1;
    if (Number(log?.value ?? 0) > 0) {
      // Houve progresso, mas a meta não foi atingida: não é "nada feito".
      if (date !== today) {
        partialDays += 1;
        run = 0;
      }
      return { date, state: "partial" as const };
    }
    if (date === today) return { date, state: "pending" as const };
    missed += 1;
    run = 0;
    return { date, state: "missed" as const };
  });

  const measured = habit.tracking_type !== "checkbox";
  const weeklyTarget = quota
    ? (activeScheduleOn(habit.habit_schedules, today)?.frequency_target ??
      activeScheduleOn(habit.habit_schedules, days[days.length - 1])?.frequency_target ??
      null)
    : null;

  return {
    habit,
    kind: quota ? "quota" : "fixed",
    score: scoreForDays([habit], logs, days, today),
    timesDone,
    scheduledDays,
    missed,
    partialDays,
    weeklyTarget,
    perWeek: past.length === 0 ? 0 : Math.round((timesDone / (past.length / 7)) * 10) / 10,
    totalValue: measured ? Math.round(totalValue * 100) / 100 : null,
    averageValue: measured && valueDays > 0 ? Math.round((totalValue / valueDays) * 10) / 10 : null,
    lastDone,
    bestRun,
    strip,
  };
}

/** Quantos dias atrás foi a última conclusão (null se nunca no período). */
export function daysSince(lastDone: string | null, today: string): number | null {
  return lastDone === null ? null : diffInDays(today, lastDone);
}

export interface WeekdayStat {
  /** 0 = domingo ... 6 = sábado */
  weekday: number;
  scheduled: number;
  completed: number;
  percent: number | null;
}

/** Desempenho por dia da semana (hábitos de dia fixo), somando todos os dias do período. */
export function weekdayPattern(
  habits: HabitWithSchedules[],
  logs: LogMap,
  days: string[],
  today: string,
): WeekdayStat[] {
  const buckets = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    scheduled: 0,
    completed: 0,
  }));

  for (const date of days) {
    if (compareISO(date, today) > 0) continue;
    const logsForDay = new Map<string, HabitLog>();
    for (const habit of habits) {
      const log = logs.get(`${habit.id}:${date}`);
      if (log) logsForDay.set(habit.id, log);
    }
    const score = dailyScore(habits, logsForDay, date);
    const bucket = buckets[weekdayOf(date)];
    bucket.scheduled += score.scheduled;
    bucket.completed += score.completed;
  }

  return buckets.map((b) => ({
    ...b,
    percent: b.scheduled === 0 ? null : b.completed / b.scheduled,
  }));
}

/** Melhor e pior dia da semana, só com dados suficientes para a comparação ser justa. */
export function bestAndWorstWeekday(
  stats: WeekdayStat[],
  minScheduled = 3,
): { best: WeekdayStat | null; worst: WeekdayStat | null } {
  const usable = stats.filter((s) => s.percent !== null && s.scheduled >= minScheduled);
  if (usable.length < 2) return { best: null, worst: null };

  const best = usable.reduce((a, b) => ((b.percent ?? 0) > (a.percent ?? 0) ? b : a));
  const worst = usable.reduce((a, b) => ((b.percent ?? 0) < (a.percent ?? 0) ? b : a));
  return best.weekday === worst.weekday ? { best: null, worst: null } : { best, worst };
}

/** Dias do período em que ao menos um hábito foi concluído. */
export function activeDays(
  habits: HabitWithSchedules[],
  logs: LogMap,
  days: string[],
  today: string,
): number {
  return days.filter(
    (date) =>
      compareISO(date, today) <= 0 &&
      habits.some((h) => logs.get(`${h.id}:${date}`)?.completed),
  ).length;
}

export type TaskPriority = Task["priority"];

export interface TaskPeriodStats {
  total: number;
  completed: number;
  /** não concluídas e com data anterior a hoje */
  overdue: number;
  /** não concluídas com data de hoje (ainda dá tempo) */
  openToday: number;
  /** concluídas / total (null sem tarefas) */
  rate: number | null;
  byPriority: Record<TaskPriority, { total: number; completed: number }>;
}

export function taskStats(
  tasks: Pick<Task, "due_date" | "completed" | "priority">[],
  today: string,
): TaskPeriodStats {
  const byPriority: TaskPeriodStats["byPriority"] = {
    high: { total: 0, completed: 0 },
    medium: { total: 0, completed: 0 },
    low: { total: 0, completed: 0 },
  };
  let completed = 0;
  let overdue = 0;
  let openToday = 0;

  for (const task of tasks) {
    byPriority[task.priority].total += 1;
    if (task.completed) {
      completed += 1;
      byPriority[task.priority].completed += 1;
    } else if (compareISO(task.due_date, today) < 0) {
      overdue += 1;
    } else {
      openToday += 1;
    }
  }

  return {
    total: tasks.length,
    completed,
    overdue,
    openToday,
    rate: tasks.length === 0 ? null : completed / tasks.length,
    byPriority,
  };
}
