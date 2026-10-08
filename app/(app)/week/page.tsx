import Link from "next/link";
import { CalendarDays, CalendarRange, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getLogsForRange } from "@/lib/data/logs";
import { todayISO, weekRangeOf, addDaysISO, formatDisplayDate } from "@/lib/dates";
import { isScheduledOn } from "@/lib/scheduling";
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
    getHabitsWithSchedules(supabase),
    getLogsForRange(supabase, start, end),
    getLogsForRange(supabase, previousWeekStart, previousWeekEnd),
  ]);

  const currentScore = weeklyScore(habits, logs, days, today);
  const previousDays = Array.from({ length: 7 }, (_, i) => addDaysISO(previousWeekStart, i));
  const previousScore = weeklyScore(habits, previousLogs, previousDays, today);
  const visibleHabits = habits.filter((h) =>
    days.some((d) => isScheduledOn(h.habit_schedules, d)),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">
          {formatDisplayDate(start)} – {formatDisplayDate(end)}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Sua semana</h1>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-end justify-between">
          <p className="text-sm font-medium text-muted-foreground">Consistência da semana</p>
          <p className="text-3xl font-bold tabular-nums">
            {currentScore.percent !== null ? `${Math.round(currentScore.percent * 100)}%` : "—"}
          </p>
        </div>
        {previousScore.percent !== null ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Semana anterior: {Math.round(previousScore.percent * 100)}%
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/review"
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-input bg-card px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <ClipboardList className="size-4 text-primary" aria-hidden />
          Revisão
        </Link>
        <Link
          href="/progress/calendar"
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-input bg-card px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <CalendarDays className="size-4 text-primary" aria-hidden />
          Calendário
        </Link>
      </div>

      {visibleHabits.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Nenhum hábito cadastrado ainda."
          actionLabel="Criar hábito"
          actionHref="/habits/new"
        />
      ) : (
        <WeekGrid
          habits={visibleHabits}
          days={days}
          logsByHabitAndDate={logs}
          todayISODate={today}
        />
      )}
    </div>
  );
}
