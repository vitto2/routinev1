import { AlarmClock, Flame, ListChecks, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getPillars } from "@/lib/data/pillars";
import { getRoutines } from "@/lib/data/routines";
import { getLogsForRange } from "@/lib/data/logs";
import { QUICK_STREAK_WINDOW_DAYS, streaksFromLogs, windowStart } from "@/lib/data/streaks";
import { getOverdueTasks, getTasksForDate } from "@/lib/data/tasks";
import { todayISO, formatDisplayDate, currentHour, weekRangeOf } from "@/lib/dates";
import { activeScheduleOn, isQuotaOn, isScheduledOn } from "@/lib/scheduling";
import { completionsIn, dailyScore } from "@/lib/scoring";
import { routineStreak } from "@/lib/progress/routine";
import { pausedHabits } from "@/lib/scheduling/pause";
import { challengeOf } from "@/lib/challenges";
import { periodForHour } from "@/lib/constants/routines";
import { groupByRoutine } from "@/lib/routines/group";
import { formatStreak } from "@/lib/gamification";
import { PauseBanner } from "@/components/pause/PauseBanner";
import { RoutineHeader } from "@/components/routines/RoutineHeader";
import { HabitListItem } from "@/components/habits/HabitListItem";
import { TaskListItem } from "@/components/tasks/TaskListItem";
import { EmptyState } from "@/components/layout/EmptyState";
import { ScoreCard } from "@/components/progress/ScoreCard";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

export default async function TodayPage() {
  const { user } = await requireUser();
  const supabase = await createClient();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);
  const week = weekRangeOf(today);
  const hour = currentHour(profile.timezone);

  const [habits, weekLogs, tasks, overdue, pillars, routines] = await Promise.all([
    getHabitsWithSchedules(supabase),
    // Uma leitura de 90 dias serve à semana, ao dia e aos selos de sequência.
    getLogsForRange(supabase, windowStart(today, QUICK_STREAK_WINDOW_DAYS), today),
    getTasksForDate(supabase, today),
    getOverdueTasks(supabase, today),
    getPillars(supabase, { includeArchived: true }),
    getRoutines(supabase),
  ]);
  const pillarById = new Map(pillars.map((p) => [p.id, p]));

  const todayHabits = habits.filter((h) => isScheduledOn(h.habit_schedules, today));
  const streaks = streaksFromLogs(todayHabits, weekLogs, today, QUICK_STREAK_WINDOW_DAYS);

  const logsToday = new Map<string, HabitLog>();
  for (const habit of habits) {
    const log = weekLogs.get(`${habit.id}:${today}`);
    if (log) logsToday.set(habit.id, log);
  }

  const activeHabits = habits.filter((h) => h.active);
  const paused = pausedHabits(activeHabits, today);
  const score = dailyScore(habits, logsToday, today);
  const onTrack = routineStreak(habits, weekLogs, today, QUICK_STREAK_WINDOW_DAYS);
  const tasksDone = tasks.filter((t) => t.completed).length;

  const groups = groupByRoutine(todayHabits, routines);
  const currentPeriod = periodForHour(hour);

  const greeting = getGreeting(hour);
  const displayName = profile.display_name?.split(" ")[0];

  let habitIndex = 0;
  const renderHabit = (habit: HabitWithSchedules) => {
    const target = isQuotaOn(habit.habit_schedules, today)
      ? activeScheduleOn(habit.habit_schedules, today)?.frequency_target
      : null;
    const pillar = habit.pillar_id ? pillarById.get(habit.pillar_id) : undefined;
    const challenge = challengeOf(habit, weekLogs, today);

    return (
      <HabitListItem
        key={habit.id}
        habit={habit}
        color={habit.color ?? pillar?.color}
        iconName={habit.icon ?? pillar?.icon}
        index={habitIndex++}
        log={logsToday.get(habit.id)}
        dateISO={today}
        streak={streaks.get(habit.id)}
        challenge={
          challenge?.status === "active"
            ? { day: challenge.dayNumber, total: challenge.totalDays }
            : undefined
        }
        weekProgress={
          target ? { done: completionsIn(habit.id, weekLogs, week.days), target } : undefined
        }
      />
    );
  };

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

        {onTrack.current >= 2 ? (
          <p className="flex items-center gap-2 px-1 text-sm font-medium">
            <Flame className="size-4 text-warning" aria-hidden />
            Rotina em dia há {formatStreak(onTrack.current, "days")}
            {onTrack.current >= QUICK_STREAK_WINDOW_DAYS ? "+" : ""}
            <span className="font-normal text-muted-foreground">(80% ou mais)</span>
          </p>
        ) : null}
      </header>

      {paused.length > 0 ? <PauseBanner paused={paused} total={activeHabits.length} /> : null}

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
          paused.length > 0 ? (
            <EmptyState
              icon={Repeat}
              title="Seus hábitos estão em pausa."
              description="Aproveite o descanso. Quando quiser voltar, use Retomar acima."
            />
          ) : (
            <EmptyState
              icon={Repeat}
              title="Você ainda não possui hábitos para hoje."
              actionLabel="Criar hábito"
              actionHref="/habits/new"
            />
          )
        ) : groups.length === 1 && groups[0].routine === null ? (
          <div className="space-y-2">{groups[0].habits.map(renderHabit)}</div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => {
              const done = group.habits.filter((h) => logsToday.get(h.id)?.completed).length;
              return (
                <div key={group.routine?.id ?? "sem-rotina"} className="space-y-2">
                  <RoutineHeader
                    name={group.routine?.name ?? "Outros hábitos"}
                    period={group.routine?.period ?? null}
                    done={done}
                    total={group.habits.length}
                    isNow={group.routine?.period === currentPeriod}
                  />
                  <div className="space-y-2">{group.habits.map(renderHabit)}</div>
                </div>
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

function getGreeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
