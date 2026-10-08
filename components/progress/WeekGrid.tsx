import Link from "next/link";
import { Check, Circle, Minus, X, type LucideIcon } from "lucide-react";
import { compareISO, formatDisplayDate, WEEKDAY_LABELS, weekdayOf } from "@/lib/dates";
import { isQuotaOn, isScheduledOn } from "@/lib/scheduling";
import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/surface";
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

/** Ícones do mesmo tamanho (16 px) em todas as células: nada de caracteres de texto com larguras diferentes. */
const ICON: Record<CellStatus, LucideIcon> = {
  done: Check,
  missed: X,
  pending: Circle,
  "not-scheduled": Minus,
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
  "not-scheduled": "text-muted-foreground/70",
};

function StatusIcon({ status }: { status: CellStatus }) {
  const Icon = ICON[status];
  return (
    <Icon
      className={cn("size-4", STYLE[status], status === "pending" && "size-3.5")}
      strokeWidth={status === "done" || status === "missed" ? 3 : 2}
      aria-hidden
    />
  );
}

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
      <div
        data-ui="week-grid"
        className={cn(surfaceVariants({ padding: "none" }), "overflow-hidden")}
      >
        {/* Colunas fixas: o nome ocupa o que sobra e os 7 dias cabem na tela do celular. */}
        <table className="w-[calc(100%-0.5rem)] table-fixed text-center">
          <colgroup>
            <col className="w-[26%]" />
            {days.map((day) => (
              <col key={day} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">
                Hábito
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className={cn(
                    "py-3 text-xs font-semibold text-muted-foreground",
                    day === todayISODate && "bg-primary/10 text-primary",
                  )}
                >
                  {compareISO(day, todayISODate) <= 0 ? (
                    <Link
                      href={`/day/${day}`}
                      aria-label={`Abrir ${formatDisplayDate(day)}`}
                      className="block rounded-md underline-offset-4 hover:underline"
                    >
                      {WEEKDAY_LABELS[weekdayOf(day)]}
                    </Link>
                  ) : (
                    WEEKDAY_LABELS[weekdayOf(day)]
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => (
              <tr key={habit.id} className="border-b border-border last:border-0">
                <th scope="row" className="px-3 py-2 text-left text-sm font-medium leading-snug">
                  <span className="line-clamp-2 break-words">{habit.name}</span>
                </th>
                {days.map((day) => {
                  const status = statusFor(
                    habit,
                    day,
                    todayISODate,
                    logsByHabitAndDate.get(`${habit.id}:${day}`),
                  );
                  const isFuture = compareISO(day, todayISODate) > 0;
                  return (
                    <td
                      key={day}
                      aria-label={status === "not-scheduled" || isFuture ? LABEL[status] : undefined}
                      className={cn("p-0", day === todayISODate && "bg-primary/10")}
                    >
                      {status !== "not-scheduled" && !isFuture ? (
                        <Link
                          href={`/day/${day}`}
                          aria-label={`${LABEL[status]}, ${habit.name}, ${formatDisplayDate(day)}. Abrir o dia`}
                          className="flex h-12 items-center justify-center rounded-lg transition-colors hover:bg-accent"
                        >
                          <StatusIcon status={status} />
                        </Link>
                      ) : (
                        <span className="flex h-12 items-center justify-center">
                          <StatusIcon status={status} />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {(["done", "missed", "pending", "not-scheduled"] as const).map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <StatusIcon status={status} />
            {LABEL[status].toLowerCase()}
          </li>
        ))}
      </ul>
    </div>
  );
}
