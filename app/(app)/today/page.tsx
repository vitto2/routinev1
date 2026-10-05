import { ListChecks, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getActiveHabitsWithSchedules } from "@/lib/data/habits";
import { getLogsForDate } from "@/lib/data/logs";
import { getTasksForDate } from "@/lib/data/tasks";
import { todayISO, formatDisplayDate, currentHour } from "@/lib/dates";
import { scheduledHabitsOn, dailyScore } from "@/lib/scoring";
import { HabitListItem } from "@/components/habits/HabitListItem";
import { TaskListItem } from "@/components/tasks/TaskListItem";
import { EmptyState } from "@/components/layout/EmptyState";
import { Progress } from "@/components/ui/progress";

export default async function TodayPage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const [habits, logsByHabitId, tasks] = await Promise.all([
    getActiveHabitsWithSchedules(supabase),
    getLogsForDate(supabase, today),
    getTasksForDate(supabase, today),
  ]);

  const scheduledToday = scheduledHabitsOn(habits, today);
  const score = dailyScore(habits, logsByHabitId, today);
  const tasksDone = tasks.filter((t) => t.completed).length;

  const greeting = getGreeting(profile.timezone);
  const displayName = profile.display_name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">{formatDisplayDate(today)}</p>
          <h1 className="text-xl font-semibold tracking-tight">
            {greeting}
            {displayName ? `, ${displayName}` : ""}.
          </h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-end justify-between">
            <p className="text-sm text-muted-foreground">
              {score.scheduled === 0
                ? "Nenhum hábito programado para hoje"
                : `Você concluiu ${score.completed} de ${score.scheduled} hábitos`}
            </p>
            {score.percent !== null ? (
              <p className="text-2xl font-semibold tabular-nums">
                {Math.round(score.percent * 100)}%
              </p>
            ) : null}
          </div>
          {score.percent !== null ? (
            <Progress value={score.percent * 100} className="mt-3 h-2" />
          ) : null}
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Hábitos de hoje
        </h2>
        {scheduledToday.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Você ainda não possui hábitos para hoje."
            actionLabel="Criar hábito"
            actionHref="/habits/new"
          />
        ) : (
          <div className="space-y-2">
            {scheduledToday.map((habit) => (
              <HabitListItem
                key={habit.id}
                habit={habit}
                log={logsByHabitId.get(habit.id)}
                dateISO={today}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
            {tasks.map((task) => (
              <TaskListItem key={task.id} task={task} />
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
