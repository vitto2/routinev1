import { ICONS_BY_NAME } from "@/lib/constants/appearance";
import { cn } from "@/lib/utils";
import { CardHeading, HeadingValue } from "@/components/ui/panel";
import { surfaceVariants } from "@/components/ui/surface";
import { formatHabitValue, formatNumber, pluralize, relativeDays } from "@/lib/format";
import { formatStreak } from "@/lib/gamification";
import { daysSince, type HabitPeriodStats } from "@/lib/progress/period";
import type { HabitStreak } from "@/lib/data/streaks";
import { DayStrip } from "@/components/progress/DayStrip";
import { StreakBadge } from "@/components/habits/StreakBadge";
import { Sparkles } from "lucide-react";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">{children}</dd>
    </div>
  );
}

/**
 * Quantas vezes o hábito foi feito no período, com a régua dia a dia,
 * totais registrados (ml, minutos) e a sequência atual.
 */
export function HabitPeriodCard({
  stats,
  streak,
  color,
  iconName,
  today,
  periodLabel,
  index = 0,
}: {
  stats: HabitPeriodStats;
  streak?: HabitStreak;
  color?: string | null;
  iconName?: string | null;
  today: string;
  periodLabel: string;
  index?: number;
}) {
  const { habit } = stats;
  const Icon = (iconName && ICONS_BY_NAME[iconName]) || Sparkles;
  const percent = stats.score.percent === null ? null : Math.round(stats.score.percent * 100);
  const since = daysSince(stats.lastDone, today);
  const unit = habit.target_unit;

  const headline =
    stats.kind === "quota"
      ? `${pluralize(stats.timesDone, "vez", "vezes")} · meta de ${stats.weeklyTarget ?? "?"} por semana`
      : `Feito ${stats.timesDone} de ${stats.scheduledDays} ${stats.scheduledDays === 1 ? "vez" : "vezes"}`;

  return (
    <article
      data-ui="habit-period-card"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={cn(surfaceVariants(), "animate-rise space-y-3")}
      aria-label={habit.name}
    >
      <CardHeading
        as="h3"
        align="center"
        icon={Icon}
        accent={color ?? null}
        title={habit.name}
        description={
          <>
            {headline}
            {stats.kind === "fixed" && stats.partialDays > 0
              ? ` · ${pluralize(stats.partialDays, "parcial", "parciais")}`
              : ""}
            {stats.kind === "fixed" && stats.missed > 0
              ? ` · ${pluralize(stats.missed, "não feita", "não feitas")}`
              : ""}
          </>
        }
        aside={<HeadingValue>{percent === null ? "—" : `${percent}%`}</HeadingValue>}
      />

      <DayStrip cells={stats.strip} label={`${habit.name}, ${periodLabel}`} />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {stats.totalValue !== null && stats.totalValue > 0 ? (
          <Fact label="Total registrado">{formatHabitValue(stats.totalValue, unit)}</Fact>
        ) : null}
        {stats.averageValue !== null ? (
          <Fact label="Média nos dias com registro">
            {formatHabitValue(stats.averageValue, unit)}
          </Fact>
        ) : null}
        <Fact label="Frequência">{pluralize(stats.perWeek, "vez", "vezes")} por semana</Fact>
        <Fact label="Última vez">
          {since === null ? "Nenhuma conclusão no período" : relativeDays(since)}
        </Fact>
        <Fact label="Sequência atual">
          {streak && streak.current > 0 ? (
            <StreakBadge current={streak.current} unit={streak.unit} capped={streak.capped} />
          ) : (
            "Nenhuma"
          )}
        </Fact>
        {streak && streak.best > 0 ? (
          <Fact label="Melhor sequência">{formatStreak(streak.best, streak.unit)}</Fact>
        ) : null}
        {stats.kind === "fixed" && stats.bestRun > 1 ? (
          <Fact label="Maior seguida no período">{formatNumber(stats.bestRun)} dias</Fact>
        ) : null}
      </dl>
    </article>
  );
}
