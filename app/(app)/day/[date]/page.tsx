import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, History, ListChecks, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getPillars } from "@/lib/data/pillars";
import { getLogsForRange } from "@/lib/data/logs";
import { getTasksForDate } from "@/lib/data/tasks";
import {
  WEEKDAY_NAMES,
  addDaysISO,
  formatDisplayDate,
  todayISO,
  weekRangeOf,
  weekdayOf,
} from "@/lib/dates";
import { validateLogDate } from "@/lib/logging/rules";
import { activeScheduleOn, isQuotaOn, isScheduledOn } from "@/lib/scheduling";
import { completionsIn, dailyScore } from "@/lib/scoring";
import { HabitListItem } from "@/components/habits/HabitListItem";
import { TaskListItem } from "@/components/tasks/TaskListItem";
import { EmptyState } from "@/components/layout/EmptyState";
import { ScoreCard } from "@/components/progress/ScoreCard";
import type { HabitLog } from "@/types/domain";

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  const { user } = await requireUser();
  const supabase = await createClient();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  // Formato inválido, futuro ou fora da janela de edição: página não existe.
  if (validateLogDate(date, today) !== null) notFound();

  const week = weekRangeOf(date);
  const isToday = date === today;

  const [habits, weekLogs, tasks, pillars] = await Promise.all([
    getHabitsWithSchedules(supabase),
    getLogsForRange(supabase, week.start, week.end),
    getTasksForDate(supabase, date),
    getPillars(supabase, { includeArchived: true }),
  ]);
  const pillarById = new Map(pillars.map((p) => [p.id, p]));

  // Hábitos de cota semanal ("X por semana") aparecem em qualquer dia: dá para marcá-los.
  const dayHabits = habits.filter((h) => isScheduledOn(h.habit_schedules, date));

  const logsForDay = new Map<string, HabitLog>();
  for (const habit of habits) {
    const log = weekLogs.get(`${habit.id}:${date}`);
    if (log) logsForDay.set(habit.id, log);
  }

  const score = dailyScore(habits, logsForDay, date);
  const tasksDone = tasks.filter((t) => t.completed).length;

  const previousDay = addDaysISO(date, -1);
  const nextDay = addDaysISO(date, 1);
  const hasPrevious = validateLogDate(previousDay, today) === null;
  const hasNext = !isToday;
  const weekdayName = capitalize(WEEKDAY_NAMES[weekdayOf(date)]);

  const navClass =
    "flex size-10 shrink-0 items-center justify-center rounded-full border border-input bg-card text-foreground transition-colors hover:bg-accent";
  const navDisabledClass =
    "flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground/50";

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          {hasPrevious ? (
            <Link
              href={`/day/${previousDay}`}
              className={navClass}
              aria-label={`Dia anterior, ${formatDisplayDate(previousDay)}`}
            >
              <ChevronLeft className="size-5" />
            </Link>
          ) : (
            <span className={navDisabledClass} aria-hidden>
              <ChevronLeft className="size-5" />
            </span>
          )}
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-xl font-bold tracking-tight">{weekdayName}</h1>
            <p className="text-sm text-muted-foreground">
              {formatDisplayDate(date)}
              {isToday ? " · hoje" : ""}
            </p>
          </div>
          {hasNext ? (
            <Link
              href={`/day/${nextDay}`}
              className={navClass}
              aria-label={`Próximo dia, ${formatDisplayDate(nextDay)}`}
            >
              <ChevronRight className="size-5" />
            </Link>
          ) : (
            <span className={navDisabledClass} aria-hidden>
              <ChevronRight className="size-5" />
            </span>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <Link
            href="/week"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-input bg-card px-3 font-medium hover:bg-accent"
          >
            <CalendarDays className="size-3.5" />
            Semana
          </Link>
          {!isToday ? (
            <Link
              href="/today"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-input bg-card px-3 font-medium hover:bg-accent"
            >
              Voltar para hoje
            </Link>
          ) : null}
        </div>
      </header>

      {!isToday ? (
        <p className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">
          <History className="mt-0.5 size-4 shrink-0" />
          Você está vendo um dia passado. Pode marcar o que esqueceu ou corrigir um registro: seus
          scores e sequências são atualizados.
        </p>
      ) : null}

      <ScoreCard
        percent={score.percent}
        label={
          score.scheduled === 0
            ? "Nenhum hábito de dia fixo neste dia"
            : `${score.completed} de ${score.scheduled} hábitos concluídos`
        }
      />

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Hábitos
        </h2>
        {dayHabits.length === 0 ? (
          <EmptyState icon={Repeat} title="Nenhum hábito programado neste dia." />
        ) : (
          <div className="space-y-2">
            {dayHabits.map((habit, i) => {
              const pillar = habit.pillar_id ? pillarById.get(habit.pillar_id) : undefined;
              const target = isQuotaOn(habit.habit_schedules, date)
                ? activeScheduleOn(habit.habit_schedules, date)?.frequency_target
                : null;
              return (
                <HabitListItem
                  key={`${habit.id}:${date}`}
                  habit={habit}
                  index={i}
                  log={logsForDay.get(habit.id)}
                  dateISO={date}
                  color={habit.color ?? pillar?.color}
                  iconName={habit.icon ?? pillar?.icon}
                  weekProgress={
                    target
                      ? { done: completionsIn(habit.id, weekLogs, week.days), target }
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tarefas
          </h2>
          {tasks.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {tasksDone}/{tasks.length}
            </span>
          ) : null}
        </div>
        {tasks.length === 0 ? (
          <EmptyState icon={ListChecks} title="Nenhuma tarefa neste dia." />
        ) : (
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <TaskListItem key={task.id} task={task} today={today} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
