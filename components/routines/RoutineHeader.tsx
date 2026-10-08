import { Clock3, Moon, Sun, Sunrise, type LucideIcon } from "lucide-react";
import { PERIOD_BY_VALUE } from "@/lib/constants/routines";
import type { RoutinePeriod } from "@/types/database.types";
import { cn } from "@/lib/utils";

const ICONS: Record<RoutinePeriod, LucideIcon> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
  custom: Clock3,
};

/** Cabeçalho de um bloco de hábitos no Hoje: nome da rotina, andamento e "agora". */
export function RoutineHeader({
  name,
  period,
  done,
  total,
  isNow,
}: {
  name: string;
  period: RoutinePeriod | null;
  done: number;
  total: number;
  isNow: boolean;
}) {
  const Icon = period ? ICONS[period] : Clock3;
  const complete = total > 0 && done === total;

  return (
    <div data-ui="routine-header" className="flex min-h-6 items-center gap-2">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      <h3 className="text-sm font-bold">{name}</h3>
      {period ? (
        <span className="text-xs text-muted-foreground">{PERIOD_BY_VALUE[period].label}</span>
      ) : null}
      {isNow ? (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          Agora
        </span>
      ) : null}
      <span
        className={cn(
          "ml-auto text-xs font-semibold tabular-nums",
          complete ? "text-success" : "text-muted-foreground",
        )}
        aria-label={`${done} de ${total} concluídos`}
      >
        {done}/{total}
      </span>
    </div>
  );
}
