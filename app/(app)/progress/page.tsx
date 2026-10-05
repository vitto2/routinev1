import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getLogsForRange } from "@/lib/data/logs";
import { todayISO, weekRangeOf, addDaysISO, compareISO } from "@/lib/dates";
import { dailyScore, scoreForDays } from "@/lib/scoring";
import { ScoreCard } from "@/components/progress/ScoreCard";
import type { HabitLog } from "@/types/domain";

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
  for (let d = monthStart; compareISO(d, today) <= 0; d = addDaysISO(d, 1)) {
    monthDays.push(d);
  }

  // A semana corrente pode começar no mês anterior: busca desde o mais antigo.
  const earliest = compareISO(weekStart, monthStart) < 0 ? weekStart : monthStart;

  const [habits, logs] = await Promise.all([
    getHabitsWithSchedules(supabase),
    getLogsForRange(supabase, earliest, today),
  ]);

  const weekScore = scoreForDays(habits, logs, weekDays, today);
  const monthScore = scoreForDays(habits, logs, monthDays, today);

  const habitsCompletedThisMonth = monthDays.reduce(
    (total, day) =>
      total + habits.filter((h) => logs.get(`${h.id}:${day}`)?.completed).length,
    0,
  );

  const perfectDays = monthDays.filter((day) => {
    const dayLogs = new Map<string, HabitLog>();
    for (const habit of habits) {
      const log = logs.get(`${habit.id}:${day}`);
      if (log) dayLogs.set(habit.id, log);
    }
    const score = dailyScore(habits, dayLogs, day);
    return score.scheduled > 0 && score.percent === 1;
  }).length;

  const perHabit = habits
    .map((habit) => ({
      habit,
      score: scoreForDays([habit], logs, monthDays, today),
    }))
    .filter(({ score }) => score.scheduled > 0)
    .sort((a, b) => (b.score.percent ?? 0) - (a.score.percent ?? 0));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Progresso</h1>
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

      {perHabit.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Desempenho por hábito (mês)
          </h2>
          <div className="space-y-2">
            {perHabit.map(({ habit, score }, i) => (
              <div
                key={habit.id}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="animate-rise"
              >
                <ScoreCard
                  label={habit.name}
                  percent={score.percent}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="animate-rise rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
