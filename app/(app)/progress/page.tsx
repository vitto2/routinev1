import Link from "next/link";
import { CalendarDays, ChevronRight, ClipboardList, Flame, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getPillars } from "@/lib/data/pillars";
import { getLogsForRange } from "@/lib/data/logs";
import { getTasksInRange } from "@/lib/data/tasks";
import { streaksFromLogs } from "@/lib/data/streaks";
import {
  WEEKDAY_LABELS,
  WEEKDAY_PLURAL,
  addDaysISO,
  formatDisplayDate,
  todayISO,
} from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { formatStreak } from "@/lib/gamification";
import { dailyScore, scoreForDays } from "@/lib/scoring";
import {
  activeDays,
  bestAndWorstWeekday,
  habitPeriodStats,
  periodDays,
  taskStats,
  weekdayPattern,
} from "@/lib/progress/period";
import { monthlySeries, seriesTrend, weeklySeries, type SeriesPoint } from "@/lib/progress/series";
import { routineStreak } from "@/lib/progress/routine";
import { challengeOf } from "@/lib/challenges";
import { BarChart } from "@/components/progress/BarChart";
import { ChallengeCard } from "@/components/progress/ChallengeCard";
import { DayStripLegend } from "@/components/progress/DayStrip";
import { HabitPeriodCard } from "@/components/progress/HabitPeriodCard";
import { PeriodSummary } from "@/components/progress/PeriodSummary";
import { PeriodSwitch, parsePeriod } from "@/components/progress/PeriodSwitch";
import { TaskSummaryCard } from "@/components/progress/TaskSummaryCard";
import { EmptyState } from "@/components/layout/EmptyState";
import type { HabitLog } from "@/types/domain";

/** Janela de leitura: cobre sequências (400 dias), o período (até 60 dias x2) e os 6 meses do gráfico. */
const LOOKBACK_DAYS = 400;

const pct = (value: number) => Math.round(value * 100);

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const period = parsePeriod(p);

  const { user } = await requireUser();
  const supabase = await createClient();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const days = periodDays(today, period);
  const previousDays = periodDays(addDaysISO(today, -period), period);

  const [habits, logs, pillars, tasks] = await Promise.all([
    getHabitsWithSchedules(supabase),
    getLogsForRange(supabase, addDaysISO(today, -LOOKBACK_DAYS), today),
    getPillars(supabase, { includeArchived: true }),
    getTasksInRange(supabase, days[0], today),
  ]);
  const pillarById = new Map(pillars.map((pillar) => [pillar.id, pillar]));
  const activeHabits = habits.filter((h) => h.active);

  const score = scoreForDays(habits, logs, days, today);
  const previous = scoreForDays(habits, logs, previousDays, today);
  const taskSummary = taskStats(tasks, today);

  const perfectDays = days.filter((day) => {
    const dayLogs = new Map<string, HabitLog>();
    for (const habit of habits) {
      const log = logs.get(`${habit.id}:${day}`);
      if (log) dayLogs.set(habit.id, log);
    }
    const daily = dailyScore(habits, dayLogs, day);
    return daily.scheduled > 0 && daily.percent === 1;
  }).length;

  const streaks = streaksFromLogs(activeHabits, logs, today, LOOKBACK_DAYS);
  const routine = routineStreak(habits, logs, today, LOOKBACK_DAYS);

  const habitStats = habits
    .map((habit) => habitPeriodStats(habit, logs, days, today))
    .filter((s) => s.score.scheduled > 0 || s.timesDone > 0);

  const challenges = activeHabits
    .map((habit) => ({ habit, info: challengeOf(habit, logs, today) }))
    .filter((c): c is { habit: (typeof activeHabits)[number]; info: NonNullable<typeof c.info> } => c.info !== null)
    .sort((a, b) => {
      // em andamento primeiro, depois os que ainda vão começar, por fim os encerrados
      const order = { active: 0, upcoming: 1, finished: 2 } as const;
      return order[a.info.status] - order[b.info.status];
    });

  const weekdays = weekdayPattern(habits, logs, days, today);
  const { best, worst } = bestAndWorstWeekday(weekdays, 3);
  const weekdayPoints: SeriesPoint[] = [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
    const stat = weekdays[weekday];
    return {
      key: String(weekday),
      label: WEEKDAY_LABELS[weekday].charAt(0) + WEEKDAY_LABELS[weekday].slice(1).toLowerCase(),
      detail: WEEKDAY_PLURAL[weekday].charAt(0).toUpperCase() + WEEKDAY_PLURAL[weekday].slice(1),
      percent: stat.percent,
      scheduled: stat.scheduled,
      completed: stat.completed,
      partial: false,
    };
  });

  const weekly = weeklySeries(habits, logs, today, 8);
  const monthly = monthlySeries(habits, logs, today, 6);

  const periodLabel = `últimos ${period} dias`;
  const highlight =
    routine.current >= 2
      ? {
          title: `Rotina em dia há ${formatStreak(routine.current, "days")}`,
          text:
            routine.best > routine.current
              ? `Dias seguidos com 80% ou mais dos hábitos. Seu recorde é ${formatStreak(routine.best, "days")}.`
              : "Dias seguidos com 80% ou mais dos hábitos. Esse é o seu recorde.",
        }
      : null;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Progresso</h1>
          <p className="text-sm text-muted-foreground">Quanto você já fez e como está evoluindo</p>
        </div>
        <PeriodSwitch active={period} />
      </header>

      {highlight ? (
        <div className="animate-rise flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Flame className="size-5" />
          </span>
          <div>
            <p className="font-semibold">{highlight.title}</p>
            <p className="text-sm text-muted-foreground">{highlight.text}</p>
          </div>
        </div>
      ) : null}

      <PeriodSummary
        title={`Resumo dos ${periodLabel}`}
        range={`${formatDisplayDate(days[0])} a ${formatDisplayDate(today)}`}
        score={score}
        previous={previous}
        previousLabel={`${period} dias anteriores`}
        perfectDays={perfectDays}
        activeDays={activeDays(habits, logs, days, today)}
        perWeek={Math.round((score.completed / (period / 7)) * 10) / 10}
        tasksDone={taskSummary.completed}
      />

      {challenges.length > 0 ? (
        <section className="space-y-3" aria-labelledby="challenges-heading">
          <h2
            id="challenges-heading"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Desafios
          </h2>
          <div className="space-y-3">
            {challenges.map(({ habit, info }, i) => (
              <ChallengeCard key={habit.id} habitId={habit.id} name={habit.name} info={info} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3" aria-labelledby="habits-heading">
        <div className="space-y-2">
          <h2
            id="habits-heading"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Hábitos nos {periodLabel}
          </h2>
          {habitStats.length > 0 ? <DayStripLegend /> : null}
        </div>

        {habitStats.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Nenhum hábito neste período."
            description="Crie hábitos para acompanhar quantas vezes você os faz."
            actionLabel="Criar hábito"
            actionHref="/habits/new"
          />
        ) : (
          <div className="space-y-3">
            {habitStats.map((stats, i) => {
              const pillar = stats.habit.pillar_id
                ? pillarById.get(stats.habit.pillar_id)
                : undefined;
              return (
                <HabitPeriodCard
                  key={stats.habit.id}
                  stats={stats}
                  streak={streaks.get(stats.habit.id)}
                  color={stats.habit.color ?? pillar?.color}
                  iconName={stats.habit.icon ?? pillar?.icon}
                  today={today}
                  periodLabel={periodLabel}
                  index={i}
                />
              );
            })}
          </div>
        )}
      </section>

      {period >= 30 ? (
        <BarChart
          title="Quais dias da semana rendem mais"
          points={weekdayPoints}
          period="semana"
          footnote={
            best && worst
              ? `Você é mais constante às ${WEEKDAY_PLURAL[best.weekday]} (${pct(best.percent ?? 0)}%) e tem mais dificuldade aos ${WEEKDAY_PLURAL[worst.weekday]} (${pct(worst.percent ?? 0)}%).`
              : "Com mais alguns dias de registro, mostramos em quais dias você é mais constante."
          }
        />
      ) : null}

      <TaskSummaryCard stats={taskSummary} periodLabel={periodLabel} />

      <section className="space-y-3" aria-labelledby="evolution-heading">
        <h2
          id="evolution-heading"
          className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
        >
          Evolução
        </h2>
        <BarChart
          title="Consistência por semana"
          points={weekly}
          trend={seriesTrend(weekly)}
          period="semana"
        />
        <BarChart
          title="Consistência por mês"
          points={monthly}
          trend={seriesTrend(monthly)}
          period="mês"
        />
      </section>

      <div className="grid gap-2">
        <NavCard
          href="/progress/calendar"
          icon={<CalendarDays className="size-5" />}
          title="Calendário"
          text="Veja o desempenho de cada dia do mês"
        />
        <NavCard
          href="/review"
          icon={<ClipboardList className="size-5" />}
          title="Revisão da semana"
          text="Melhor dia, hábito mais difícil e sugestões"
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {formatNumber(score.completed)} de {formatNumber(score.scheduled)} hábitos concluídos nos{" "}
        {periodLabel}. Esqueceu de marcar algo? Corrija pela{" "}
        <Link href="/week" className="font-medium text-primary underline underline-offset-4">
          semana
        </Link>
        .
      </p>
    </div>
  );
}

function NavCard({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/40"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{text}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
