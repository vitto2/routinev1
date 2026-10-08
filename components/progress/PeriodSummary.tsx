import { CalendarCheck, CheckCheck, ListChecks, Repeat } from "lucide-react";
import { formatNumber, pointsLabel } from "@/lib/format";
import type { Score } from "@/lib/scoring";

const pct = (value: number) => Math.round(value * 100);

function Mini({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-card/80 p-2.5 text-center ring-1 ring-border">
      <div className="mb-1 flex justify-center text-primary" aria-hidden>
        {icon}
      </div>
      <p className="text-lg font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

export function PeriodSummary({
  title,
  range,
  score,
  previous,
  previousLabel,
  perfectDays,
  activeDays,
  perWeek,
  tasksDone,
}: {
  title: string;
  range: string;
  score: Score;
  previous: Score;
  previousLabel: string;
  perfectDays: number;
  activeDays: number;
  perWeek: number;
  tasksDone: number;
}) {
  const delta =
    score.percent !== null && previous.percent !== null
      ? pct(score.percent) - pct(previous.percent)
      : null;

  return (
    <section
      aria-label={title}
      className="animate-rise space-y-4 rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-sm"
    >
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{range}</p>
      </div>

      {score.scheduled === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há hábitos programados neste período.
        </p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-bold leading-none tabular-nums">
                {formatNumber(score.completed)}
                <span className="text-xl font-semibold text-muted-foreground">
                  {" "}
                  de {formatNumber(score.scheduled)}
                </span>
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {score.completed === 1 ? "hábito concluído" : "hábitos concluídos"}
              </p>
            </div>
            <p className="text-3xl font-bold tabular-nums">
              {score.percent === null ? "—" : `${pct(score.percent)}%`}
            </p>
          </div>

          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={title}
            aria-valuenow={score.percent === null ? 0 : pct(score.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${score.percent === null ? 0 : pct(score.percent)}%` }}
            />
          </div>

          {delta !== null ? (
            <p className="text-sm text-muted-foreground">
              {delta === 0
                ? `Igual aos ${previousLabel}`
                : `${pointsLabel(delta)} em relação aos ${previousLabel} (${pct(previous.percent ?? 0)}%)`}
            </p>
          ) : null}
        </>
      )}

      <div className="grid grid-cols-4 gap-2">
        <Mini icon={<CheckCheck className="size-4" />} value={String(perfectDays)} label="dias com 100%" />
        <Mini icon={<CalendarCheck className="size-4" />} value={String(activeDays)} label="dias ativos" />
        <Mini icon={<Repeat className="size-4" />} value={formatNumber(perWeek)} label="feitos por semana" />
        <Mini icon={<ListChecks className="size-4" />} value={String(tasksDone)} label={tasksDone === 1 ? "tarefa feita" : "tarefas feitas"} />
      </div>
    </section>
  );
}
