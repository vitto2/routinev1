import { compareISO, WEEKDAY_LABELS, weekdayOf } from "@/lib/dates";
import { isQuotaOn, isScheduledOn } from "@/lib/scheduling";
import { cn } from "@/lib/utils";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

type CellStatus = "done" | "missed" | "pending" | "not-scheduled";

function statusFor(
  habit: HabitWithSchedules,
  day: string,
  todayISODate: string,
  log: HabitLog | undefined,
): CellStatus {
  if (!isScheduledOn(habit.habit_schedules, day)) return "not-scheduled";

  const isFuture = compareISO(day, todayISODate) > 0;
  const isToday = day === todayISODate;
  const done = log?.completed ?? false;

  if (done) return "done";
  // Cota semanal: dias sem registro são só oportunidades, não falhas.
  if (isQuotaOn(habit.habit_schedules, day)) return "pending";
  if (isFuture || isToday) return "pending";
  return "missed";
}

const SYMBOL: Record<CellStatus, string> = {
  done: "✓",
  missed: "✕",
  pending: "○",
  "not-scheduled": "—",
};

const STYLE: Record<CellStatus, string> = {
  done: "text-emerald-600 dark:text-emerald-400",
  missed: "text-destructive",
  pending: "text-muted-foreground/50",
  "not-scheduled": "text-muted-foreground/25",
};

export function WeekGrid({
  habits,
  days,
  logsByHabitAndDate,
  todayISODate,
}: {
  habits: HabitWithSchedules[];
  days: string[];
  logsByHabitAndDate: Map<string, HabitLog>;
  todayISODate: string;
}) {
  if (habits.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[420px] text-center text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="w-28 px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              Hábito
            </th>
            {days.map((day) => (
              <th
                key={day}
                className={cn(
                  "px-1 py-2 text-xs font-medium text-muted-foreground",
                  day === todayISODate && "text-foreground",
                )}
              >
                {WEEKDAY_LABELS[weekdayOf(day)]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {habits.map((habit) => (
            <tr key={habit.id} className="border-b border-border last:border-0">
              <td className="truncate px-3 py-2 text-left font-medium">{habit.name}</td>
              {days.map((day) => {
                const status = statusFor(
                  habit,
                  day,
                  todayISODate,
                  logsByHabitAndDate.get(`${habit.id}:${day}`),
                );
                return (
                  <td key={day} className={cn("px-1 py-2 font-medium", STYLE[status])}>
                    {SYMBOL[status]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
