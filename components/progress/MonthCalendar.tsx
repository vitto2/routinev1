import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import { WEEKDAY_LABELS, WEEKDAY_NAMES, formatDisplayDate, monthLabel } from "@/lib/dates";
import type { CalendarCell, DayLevel, MonthGrid } from "@/lib/progress/calendar";
import { cn } from "@/lib/utils";

const LEVEL_LABEL: Record<Exclude<DayLevel, "future" | "none">, string> = {
  great: "ótimo dia",
  partial: "parcial",
  low: "baixa conclusão",
};

const LEVEL_STYLE: Record<DayLevel, string> = {
  great: "bg-success/12",
  partial: "bg-warning/12",
  low: "bg-destructive/12",
  none: "bg-card",
  future: "bg-transparent",
};

function LevelIcon({ level }: { level: DayLevel }) {
  if (level === "great") return <Check className="size-3.5 text-success" strokeWidth={3} aria-hidden />;
  if (level === "partial") return <Minus className="size-3.5 text-warning" strokeWidth={3} aria-hidden />;
  if (level === "low") return <X className="size-3.5 text-destructive" strokeWidth={3} aria-hidden />;
  return null;
}

function cellLabel(cell: CalendarCell) {
  const date = formatDisplayDate(cell.date);
  if (cell.level === "future") return `${date}: dia futuro`;
  if (cell.percent === null) return `${date}: nenhum hábito de dia fixo programado. Abrir o dia`;
  const level = LEVEL_LABEL[cell.level as keyof typeof LEVEL_LABEL];
  return `${date}: ${Math.round(cell.percent * 100)}% (${cell.completed} de ${cell.scheduled} hábitos), ${level}. Abrir o dia`;
}

const BASE =
  "relative flex h-14 w-full flex-col justify-between rounded-xl border p-1.5 text-left transition-colors";

export function MonthCalendar({ month, grid }: { month: string; grid: MonthGrid }) {
  return (
    <div className="space-y-3">
      <table className="w-full table-fixed border-separate border-spacing-1">
        <caption className="sr-only">Desempenho diário em {monthLabel(month)}</caption>
        <thead>
          <tr>
            {WEEKDAY_LABELS.slice(1)
              .concat(WEEKDAY_LABELS[0])
              .map((label, i) => (
                <th
                  key={label}
                  scope="col"
                  abbr={WEEKDAY_NAMES[(i + 1) % 7]}
                  className="pb-1 text-center text-[11px] font-semibold text-muted-foreground"
                >
                  {label}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {grid.weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((cell, ci) => (
                <td key={ci} className="p-0 align-top">
                  {cell === null ? null : cell.level === "future" ? (
                    <div
                      className={cn(BASE, "border-transparent text-muted-foreground")}
                      aria-label={cellLabel(cell)}
                    >
                      <span className="text-xs font-medium">{cell.day}</span>
                    </div>
                  ) : (
                    <Link
                      href={`/day/${cell.date}`}
                      aria-label={cellLabel(cell)}
                      aria-current={cell.isToday ? "date" : undefined}
                      className={cn(
                        BASE,
                        LEVEL_STYLE[cell.level],
                        "hover:brightness-95 active:scale-95",
                        cell.isToday ? "border-primary ring-2 ring-primary" : "border-border",
                      )}
                    >
                      <span className="flex items-start justify-between">
                        <span className="text-xs font-bold leading-none">{cell.day}</span>
                        <LevelIcon level={cell.level} />
                      </span>
                      <span className="text-[11px] font-semibold tabular-nums leading-none">
                        {cell.percent === null ? "—" : `${Math.round(cell.percent * 100)}%`}
                      </span>
                    </Link>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-1">
          <Check className="size-3.5 text-success" strokeWidth={3} aria-hidden /> 80% ou mais
        </li>
        <li className="flex items-center gap-1">
          <Minus className="size-3.5 text-warning" strokeWidth={3} aria-hidden /> 40% a 79%
        </li>
        <li className="flex items-center gap-1">
          <X className="size-3.5 text-destructive" strokeWidth={3} aria-hidden /> menos de 40%
        </li>
        <li className="flex items-center gap-1">
          <span className="font-semibold">—</span> sem hábitos
        </li>
      </ul>
    </div>
  );
}
