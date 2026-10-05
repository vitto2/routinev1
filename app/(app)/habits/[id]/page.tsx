import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getHabitWithSchedules } from "@/lib/data/habits";
import { getPillars } from "@/lib/data/pillars";
import { todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/layout/PageHeader";
import { HabitForm } from "@/components/habits/HabitForm";
import { ArchiveHabitButton } from "@/components/habits/ArchiveHabitButton";

export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const [habit, pillars, profile] = await Promise.all([
    getHabitWithSchedules(supabase, id),
    getPillars(supabase, { includeArchived: true }),
    getOrCreateProfile(supabase, user.id),
  ]);

  if (!habit) notFound();

  return (
    <div>
      <PageHeader title="Editar hábito" backHref="/habits" />
      <HabitForm habit={habit} pillars={pillars} today={todayISO(profile.timezone)} />
      <div className="mt-6 border-t border-border pt-4">
        <ArchiveHabitButton habitId={habit.id} active={habit.active} />
      </div>
    </div>
  );
}
