import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getActiveHabitsWithSchedules } from "@/lib/data/habits";
import { getLogsForRange } from "@/lib/data/logs";
import { todayISO, weekRangeOf, addDaysISO } from "@/lib/dates";
import { weeklyScore, dailyScore } from "@/lib/scoring";
import { isScheduledOn } from "@/lib/scheduling";

function monthStartOf(dateISO: string): string {
  return `${dateISO.slice(0, 7)}-01`;
}

export default async function ProgressPage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const { start: weekStart, days: weekDays } = weekRangeOf(today);
  const monthStart = monthStartOf(today);

  const monthDays: string[] = [];
  for (let d = monthStart; d <= today; d = addDaysISO(d, 1)) {
    monthDays.push(d);
    if (monthDays.length > 31) break;
  }

  const [habits, weekLogs, monthLogs] = await Promise.all([
    getActiveHabitsWithSchedules(supabase),
    getLogsForRange(supabase, weekStart, today),
    getLogsForRange(supabase, monthStart, today),
  ]);

  const weekScore = weeklyScore(habits, weekLogs, weekDays);
  const monthScore = weeklyScore(habits, monthLogs, monthDays);

  const habitsCompletedThisMonth = Array.from(monthLogs.values()).filter(
    (log) => log.completed,
  ).length;

  const perfectDays = monthDays.filter((day) => {
    const dayLogs = new Map(
      Array.from(monthLogs.entries())
        .filter(([key]) => key.endsWith(`:${day}`))
        .map(([key, log]) => [key.split(":")[0], log]),
    );
    return dailyScore(habits, dayLogs, day).percent === 1;
  }).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Progresso</h1>
        <p className="text-sm text-muted-foreground">
          Sua consistência ao longo do tempo
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Consistência da semana"
          value={weekScore.percent !== null ? `${Math.round(weekScore.percent * 100)}%` : "—"}
        />
        <StatCard
          label="Consistência do mês"
          value={monthScore.percent !== null ? `${Math.round(monthScore.percent * 100)}%` : "—"}
        />
        <StatCard label="Hábitos concluídos (mês)" value={String(habitsCompletedThisMonth)} />
        <StatCard label="Dias com 100% (mês)" value={String(perfectDays)} />
      </div>

      {habits.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Desempenho por hábito (mês)
          </h2>
          <div className="space-y-2">
            {habits.map((habit) => {
              const scheduledDays = monthDays.filter((day) =>
                isScheduledOn(habit.habit_schedules, day),
              );
              const total = scheduledDays.length;
              if (total === 0) return null;

              const done = scheduledDays.filter(
                (day) => monthLogs.get(`${habit.id}:${day}`)?.completed,
              ).length;
              const percent = Math.round((done / total) * 100);

              return (
                <div
                  key={habit.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <span className="font-medium">{habit.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
