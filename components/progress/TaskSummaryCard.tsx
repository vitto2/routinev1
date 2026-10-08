import Link from "next/link";
import { AlarmClock, ListChecks } from "lucide-react";
import type { TaskPeriodStats, TaskPriority } from "@/lib/progress/period";
import { pluralize } from "@/lib/format";

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
      className="animate-rise space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ListChecks className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Tarefas</h3>
          <p className="text-sm text-muted-foreground">
            {stats.total === 0
              ? `Nenhuma tarefa com data nos ${periodLabel}`
              : `${stats.completed} de ${pluralize(stats.total, "tarefa", "tarefas")} concluídas`}
          </p>
        </div>
        {stats.rate !== null ? (
          <p className="text-xl font-bold tabular-nums">{pct(stats.rate)}%</p>
        ) : null}
      </div>

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

          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-muted p-2.5">
              <dd className="text-lg font-bold tabular-nums">{stats.completed}</dd>
              <dt className="text-[11px] text-muted-foreground">
                {stats.completed === 1 ? "concluída" : "concluídas"}
              </dt>
            </div>
            <div className="rounded-xl bg-muted p-2.5">
              <dd className="text-lg font-bold tabular-nums">{stats.openToday}</dd>
              <dt className="text-[11px] text-muted-foreground">para hoje</dt>
            </div>
            <div className="rounded-xl bg-muted p-2.5">
              <dd
                className={
                  stats.overdue > 0
                    ? "text-lg font-bold tabular-nums text-destructive"
                    : "text-lg font-bold tabular-nums"
                }
              >
                {stats.overdue}
              </dd>
              <dt className="text-[11px] text-muted-foreground">
                {stats.overdue === 1 ? "atrasada" : "atrasadas"}
              </dt>
            </div>
          </dl>

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
            <Link
              href="/today"
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-input bg-card text-sm font-medium transition-colors hover:bg-accent"
            >
              <AlarmClock className="size-4 text-destructive" aria-hidden />
              Ver {pluralize(stats.overdue, "tarefa atrasada", "tarefas atrasadas")}
            </Link>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
