import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile, hasSchemaV2 } from "@/lib/data/profile";
import { getRoutines } from "@/lib/data/routines";
import { getHabitWithSchedules } from "@/lib/data/habits";
import { getPillars } from "@/lib/data/pillars";
import { todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/layout/PageHeader";
import { HabitForm } from "@/components/habits/HabitForm";
import { ArchiveHabitButton } from "@/components/habits/ArchiveHabitButton";
import { HabitPauseControl } from "@/components/pause/HabitPauseControl";
import { pauseState } from "@/lib/scheduling/pause";

export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const [habit, pillars, profile, routines] = await Promise.all([
    getHabitWithSchedules(supabase, id),
    getPillars(supabase, { includeArchived: true }),
    getOrCreateProfile(supabase, user.id),
    getRoutines(supabase),
  ]);

  if (!habit) notFound();

  const today = todayISO(profile.timezone);
  const pause = pauseState(habit.habit_schedules, today, habit.active);

  return (
    <div>
      <PageHeader title="Editar hábito" backHref="/habits" />
      <HabitForm
        habit={habit}
        pillars={pillars}
        today={today}
        frequencyLocked={pause.paused && pause.resumesOn === null}
        schemaV2={hasSchemaV2(profile)}
        routines={routines}
      />
      {habit.active ? (
        <div className="mt-6">
          <HabitPauseControl
            habitId={habit.id}
            habitName={habit.name}
            today={today}
            paused={pause.paused}
            resumesOn={pause.resumesOn}
          />
        </div>
      ) : null}
      <div className="mt-6 border-t border-border pt-4">
        <ArchiveHabitButton habitId={habit.id} active={habit.active} />
      </div>
    </div>
  );
}
