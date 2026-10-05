import { CalendarRange } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getActiveHabitsWithSchedules } from "@/lib/data/habits";
import { getLogsForRange } from "@/lib/data/logs";
import { todayISO, weekRangeOf, addDaysISO, formatDisplayDate } from "@/lib/dates";
import { weeklyScore } from "@/lib/scoring";
import { WeekGrid } from "@/components/progress/WeekGrid";
import { EmptyState } from "@/components/layout/EmptyState";

export default async function WeekPage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const { start, end, days } = weekRangeOf(today);
  const previousWeekStart = addDaysISO(start, -7);
  const previousWeekEnd = addDaysISO(end, -7);

  const [habits, logs, previousLogs] = await Promise.all([
    getActiveHabitsWithSchedules(supabase),
    getLogsForRange(supabase, start, end),
    getLogsForRange(supabase, previousWeekStart, previousWeekEnd),
  ]);

  const currentScore = weeklyScore(habits, logs, days);
  const previousDays = Array.from({ length: 7 }, (_, i) => addDaysISO(previousWeekStart, i));
  const previousScore = weeklyScore(habits, previousLogs, previousDays);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">
          {formatDisplayDate(start)} – {formatDisplayDate(end)}
        </p>
        <h1 className="text-xl font-semibold tracking-tight">Sua semana</h1>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-end justify-between">
          <p className="text-sm text-muted-foreground">Consistência da semana</p>
          <p className="text-2xl font-semibold tabular-nums">
            {currentScore.percent !== null ? `${Math.round(currentScore.percent * 100)}%` : "—"}
          </p>
        </div>
        {previousScore.percent !== null ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Semana anterior: {Math.round(previousScore.percent * 100)}%
          </p>
        ) : null}
      </div>

      {habits.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Nenhum hábito cadastrado ainda."
          actionLabel="Criar hábito"
          actionHref="/habits/new"
        />
      ) : (
        <WeekGrid
          habits={habits}
          days={days}
          logsByHabitAndDate={logs}
          todayISODate={today}
        />
      )}
    </div>
  );
}
