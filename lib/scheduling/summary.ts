import { WEEKDAY_LABELS } from "@/lib/dates";
import type { HabitSchedule } from "@/types/domain";

export function scheduleSummary(schedule: HabitSchedule | undefined): string {
  if (!schedule) return "Sem frequência definida";

  switch (schedule.schedule_type) {
    case "daily":
      return "Todos os dias";
    case "weekdays":
      return (schedule.weekdays ?? [])
        .slice()
        .sort()
        .map((d) => WEEKDAY_LABELS[d])
        .join(", ");
    case "x_per_week":
      return `${schedule.frequency_target}x por semana`;
    case "specific_date":
      return schedule.specific_date ? `Em ${schedule.specific_date}` : "Data específica";
    case "interval":
      return `A cada ${schedule.interval_days} dias`;
    default:
      return "";
  }
}
