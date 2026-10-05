import { compareISO, diffInDays, weekdayOf } from "@/lib/dates";
import type { HabitSchedule } from "@/types/domain";

/** Resolve qual schedule estava vigente numa data (faixas start_date/end_date). */
export function activeScheduleOn(
  schedules: HabitSchedule[],
  dateISO: string,
): HabitSchedule | null {
  return (
    schedules.find((s) => {
      if (compareISO(s.start_date, dateISO) > 0) return false;
      if (s.end_date && compareISO(s.end_date, dateISO) < 0) return false;
      return true;
    }) ?? null
  );
}

/** Hábito de cota semanal ("X vezes por semana") vigente nessa data? */
export function isQuotaOn(schedules: HabitSchedule[], dateISO: string): boolean {
  return activeScheduleOn(schedules, dateISO)?.schedule_type === "x_per_week";
}

/**
 * Primeiro dia em que o hábito passou a valer, no calendário local do
 * usuário (start_date da agenda mais antiga). Usar isso em vez de
 * created_at, que é UTC e pode cair no dia seguinte.
 */
export function habitStartDate(schedules: HabitSchedule[]): string | null {
  if (schedules.length === 0) return null;
  return schedules.reduce(
    (min, s) => (compareISO(s.start_date, min) < 0 ? s.start_date : min),
    schedules[0].start_date,
  );
}

/**
 * Hábito estava programado para acontecer em `dateISO`?
 * Base para score e streak — dias não programados nunca entram no
 * denominador nem quebram sequência.
 */
export function isScheduledOn(
  schedules: HabitSchedule[],
  dateISO: string,
): boolean {
  const schedule = activeScheduleOn(schedules, dateISO);
  if (!schedule) return false;

  switch (schedule.schedule_type) {
    case "daily":
      return true;
    case "weekdays":
      return (schedule.weekdays ?? []).includes(weekdayOf(dateISO));
    case "x_per_week":
      // elegível todo dia; a meta (frequency_target) é avaliada em lib/scoring
      return true;
    case "specific_date":
      return schedule.specific_date === dateISO;
    case "interval": {
      if (!schedule.interval_days || schedule.interval_days <= 0) return false;
      const diff = diffInDays(dateISO, schedule.start_date);
      return diff >= 0 && diff % schedule.interval_days === 0;
    }
    default:
      return false;
  }
}
