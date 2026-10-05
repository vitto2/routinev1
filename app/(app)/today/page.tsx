import { AlarmClock, ListChecks, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getPillars } from "@/lib/data/pillars";
import { getLogsForRange } from "@/lib/data/logs";
import { getOverdueTasks, getTasksForDate } from "@/lib/data/tasks";
import { todayISO, formatDisplayDate, currentHour, weekRangeOf } from "@/lib/dates";
import { activeScheduleOn, isQuotaOn, isScheduledOn } from "@/lib/scheduling";
import { completionsIn, dailyScore } from "@/lib/scoring";
import { HabitListItem } from "@/components/habits/HabitListItem";
import { TaskListItem } from "@/components/tasks/TaskListItem";
import { EmptyState } from "@/components/layout/EmptyState";
import { ScoreCard } from "@/components/progress/ScoreCard";
import type { HabitLog } from "@/types/domain";

export default async function TodayPage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);
  const week = weekRangeOf(today);

  const [habits, weekLogs, tasks, overdue, pillars] = await Promise.all([
    getHabitsWithSchedules(supabase),
    getLogsForRange(supabase, week.start, week.end),
    getTasksForDate(supabase, today),
    getOverdueTasks(supabase, today),
    getPillars(supabase, { includeArchived: true }),
  ]);
  const pillarById = new Map(pillars.map((p) => [p.id, p]));

  const todayHabits = habits.filter((h) => isScheduledOn(h.habit_schedules, today));

  const logsToday = new Map<string, HabitLog>();
  for (const habit of habits) {
    const log = weekLogs.get(`${habit.id}:${today}`);
    if (log) logsToday.set(habit.id, log);
  }

  const score = dailyScore(habits, logsToday, today);
  const tasksDone = tasks.filter((t) => t.completed).length;

  const greeting = getGreeting(profile.timezone);
  const displayName = profile.display_name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="-mx-4 -mt-6 rounded-b-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent px-4 pb-5 pt-8">
          <p className="text-sm font-medium text-muted-foreground">{formatDisplayDate(today)}</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}
            {displayName ? `, ${displayName}` : ""}.
          </h1>
        </div>

        <ScoreCard
          celebrate
          percent={score.percent}
          label={
            score.scheduled === 0
              ? "Nenhum hábito de dia fixo para hoje"
              : `Você concluiu ${score.completed} de ${score.scheduled} hábitos`
          }
        />
      </header>

      {overdue.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-destructive">
            <AlarmClock className="size-4" />
            Atrasadas ({overdue.length})
          </h2>
          <div className="space-y-2">
            {overdue.map((task, i) => (
              <TaskListItem key={task.id} task={task} today={today} index={i} overdue />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Hábitos de hoje
        </h2>
        {todayHabits.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Você ainda não possui hábitos para hoje."
            actionLabel="Criar hábito"
            actionHref="/habits/new"
          />
        ) : (
          <div className="space-y-2">
            {todayHabits.map((habit, i) => {
              const target = isQuotaOn(habit.habit_schedules, today)
                ? activeScheduleOn(habit.habit_schedules, today)?.frequency_target
                : null;
              const pillar = habit.pillar_id ? pillarById.get(habit.pillar_id) : undefined;
              return (
                <HabitListItem
                  key={habit.id}
                  habit={habit}
                  color={habit.color ?? pillar?.color}
                  iconName={habit.icon ?? pillar?.icon}
                  index={i}
                  log={logsToday.get(habit.id)}
                  dateISO={today}
                  weekProgress={
                    target
                      ? {
                          done: completionsIn(habit.id, weekLogs, week.days),
                          target,
                        }
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
            Tarefas de hoje
          </h2>
          {tasks.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {tasksDone}/{tasks.length}
            </span>
          ) : null}
        </div>
        {tasks.length === 0 ? (
          <EmptyState icon={ListChecks} title="Nenhuma tarefa para hoje." />
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

function getGreeting(timezone: string) {
  const hour = currentHour(timezone);
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
