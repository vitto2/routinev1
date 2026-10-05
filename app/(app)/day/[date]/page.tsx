import { notFound } from "next/navigation";
import { Check, X, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getLogsForDate } from "@/lib/data/logs";
import { getTasksForDate } from "@/lib/data/tasks";
import { todayISO, formatDisplayDate, compareISO } from "@/lib/dates";
import { dailyScore } from "@/lib/scoring";
import { isQuotaOn, isScheduledOn } from "@/lib/scheduling";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { cn } from "@/lib/utils";

export default async function DayDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const { user } = await requireUser();
  const supabase = await createClient();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  if (compareISO(date, today) > 0) notFound();

  const [habits, logsByHabitId, tasks] = await Promise.all([
    getHabitsWithSchedules(supabase),
    getLogsForDate(supabase, date),
    getTasksForDate(supabase, date),
  ]);

  // Hábitos de cota semanal só aparecem no dia em que foram feitos.
  const scheduled = habits.filter(
    (h) =>
      isScheduledOn(h.habit_schedules, date) &&
      (!isQuotaOn(h.habit_schedules, date) || logsByHabitId.get(h.id)?.completed),
  );
  const score = dailyScore(habits, logsByHabitId, date);
  const tasksDone = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6">
      <PageHeader title={formatDisplayDate(date)} backHref="/progress" />

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {score.scheduled === 0
            ? "Nenhum hábito programado"
            : `${score.completed} de ${score.scheduled} hábitos concluídos`}
        </p>
        {score.percent !== null ? (
          <p className="text-2xl font-semibold tabular-nums">
            {Math.round(score.percent * 100)}%
          </p>
        ) : null}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Hábitos
        </h2>
        {scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum hábito programado neste dia.</p>
        ) : (
          scheduled.map((habit) => {
            const log = logsByHabitId.get(habit.id);
            const done = log?.completed ?? false;
            return (
              <div
                key={habit.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <StatusIcon done={done} isPast={date !== today} />
                <span className="flex-1">
                  <span className="block font-medium">{habit.name}</span>
                  {log?.value != null ? (
                    <span className="text-xs text-muted-foreground">
                      {log.value}
                      {habit.target_unit ?? ""}
                      {habit.target_value ? ` / ${habit.target_value}${habit.target_unit}` : ""}
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Tarefas
          </h2>
          {tasks.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {tasksDone}/{tasks.length}
            </span>
          ) : null}
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa neste dia.</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <StatusIcon done={task.completed} isPast={date !== today} />
              <span
                className={cn("flex-1 font-medium", task.completed && "text-muted-foreground line-through")}
              >
                {task.title}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function StatusIcon({ done, isPast }: { done: boolean; isPast: boolean }) {
  if (done) {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-4" />
      </span>
    );
  }
  if (isPast) {
    return (
      <span className="flex size-7 items-center justify-center rounded-full border-2 border-destructive/40 text-destructive">
        <X className="size-4" />
      </span>
    );
  }
  return (
    <span className="flex size-7 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-muted-foreground">
      <Circle className="size-3" />
    </span>
  );
}
