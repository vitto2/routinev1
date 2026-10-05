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

const LABEL: Record<CellStatus, string> = {
  done: "Feito",
  missed: "Não feito",
  pending: "Em aberto",
  "not-scheduled": "Não programado",
};

const STYLE: Record<CellStatus, string> = {
  done: "text-success",
  missed: "text-destructive",
  pending: "text-muted-foreground",
  "not-scheduled": "text-muted-foreground",
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
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[420px] text-center text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-28 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                Hábito
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className={cn(
                    "px-1 py-2.5 text-xs font-semibold text-muted-foreground",
                    day === todayISODate && "bg-primary/10 text-primary",
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
                <th scope="row" className="max-w-28 truncate px-3 py-3 text-left text-sm font-medium">
                  {habit.name}
                </th>
                {days.map((day) => {
                  const status = statusFor(
                    habit,
                    day,
                    todayISODate,
                    logsByHabitAndDate.get(`${habit.id}:${day}`),
                  );
                  return (
                    <td
                      key={day}
                      aria-label={LABEL[status]}
                      className={cn(
                        "px-1 py-3 text-base font-bold",
                        STYLE[status],
                        day === todayISODate && "bg-primary/10",
                      )}
                    >
                      {SYMBOL[status]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li><span className="font-bold text-success">✓</span> feito</li>
        <li><span className="font-bold text-destructive">✕</span> não feito</li>
        <li><span className="font-bold">○</span> em aberto</li>
        <li><span className="font-bold">—</span> não programado</li>
      </ul>
    </div>
  );
}
