import Link from "next/link";
import { AlarmClock, ListChecks } from "lucide-react";
import type { TaskPeriodStats, TaskPriority } from "@/lib/progress/period";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CardHeading, HeadingValue } from "@/components/ui/panel";
import { StatTile } from "@/components/ui/stat-tile";
import { surfaceVariants } from "@/components/ui/surface";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const pct = (value: number) => Math.round(value * 100);

export function TaskSummaryCard({
  stats,
  periodLabel,
}: {
  stats: TaskPeriodStats;
  periodLabel: string;
}) {
  return (
    <section
      aria-label={`Tarefas, ${periodLabel}`}
      data-ui="task-summary"
      className={cn(surfaceVariants(), "animate-rise space-y-4")}
    >
      <CardHeading
        as="h3"
        align="center"
        icon={ListChecks}
        title="Tarefas"
        description={
          stats.total === 0
            ? `Nenhuma tarefa com data nos ${periodLabel}`
            : `${stats.completed} de ${pluralize(stats.total, "tarefa", "tarefas")} concluídas`
        }
        aside={stats.rate !== null ? <HeadingValue>{pct(stats.rate)}%</HeadingValue> : undefined}
      />

      {stats.total > 0 ? (
        <>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Tarefas concluídas"
            aria-valuenow={stats.rate === null ? 0 : pct(stats.rate)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-success transition-[width] duration-500 ease-out"
              style={{ width: `${stats.rate === null ? 0 : pct(stats.rate)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatTile
              value={String(stats.completed)}
              label={stats.completed === 1 ? "concluída" : "concluídas"}
            />
            <StatTile value={String(stats.openToday)} label="para hoje" />
            <StatTile
              value={String(stats.overdue)}
              tone={stats.overdue > 0 ? "danger" : "default"}
              label={stats.overdue === 1 ? "atrasada" : "atrasadas"}
            />
          </div>

          <ul className="space-y-1.5 text-sm" aria-label="Por prioridade">
            {(["high", "medium", "low"] as const).map((priority) => {
              const row = stats.byPriority[priority];
              if (row.total === 0) return null;
              return (
                <li key={priority} className="flex items-center justify-between">
                  <span className="text-muted-foreground">Prioridade {PRIORITY_LABEL[priority].toLowerCase()}</span>
                  <span className="font-semibold tabular-nums">
                    {row.completed}/{row.total}
                  </span>
                </li>
              );
            })}
          </ul>

          {stats.overdue > 0 ? (
            <Link href="/today" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              <AlarmClock className="text-destructive" aria-hidden />
              Ver {pluralize(stats.overdue, "tarefa atrasada", "tarefas atrasadas")}
            </Link>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
