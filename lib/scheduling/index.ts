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
