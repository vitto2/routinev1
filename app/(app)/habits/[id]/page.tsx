import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHabitWithSchedules } from "@/lib/data/habits";
import { getPillars } from "@/lib/data/pillars";
import { PageHeader } from "@/components/layout/PageHeader";
import { HabitForm } from "@/components/habits/HabitForm";
import { ArchiveHabitButton } from "@/components/habits/ArchiveHabitButton";

export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [habit, pillars] = await Promise.all([
    getHabitWithSchedules(supabase, id),
    getPillars(supabase, { includeArchived: true }),
  ]);

  if (!habit) notFound();

  return (
    <div>
      <PageHeader title="Editar hábito" backHref="/habits" />
      <HabitForm habit={habit} pillars={pillars} />
      <div className="mt-6 border-t border-border pt-4">
        <ArchiveHabitButton habitId={habit.id} active={habit.active} />
      </div>
    </div>
  );
}
