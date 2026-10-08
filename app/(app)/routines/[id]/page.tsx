import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile, hasSchemaV2 } from "@/lib/data/profile";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getRoutines } from "@/lib/data/routines";
import { sortHabits } from "@/lib/routines/order";
import { PageHeader } from "@/components/layout/PageHeader";
import { RoutineForm } from "@/components/routines/RoutineForm";
import { RoutineHabits } from "@/components/routines/RoutineHabits";

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const profile = await getOrCreateProfile(supabase, user.id);
  if (!hasSchemaV2(profile)) redirect("/routines");

  const [routines, habits] = await Promise.all([
    getRoutines(supabase),
    getHabitsWithSchedules(supabase),
  ]);

  const routine = routines.find((r) => r.id === id);
  if (!routine) notFound();

  const active = habits.filter((h) => h.active);
  const members = sortHabits(active.filter((h) => h.routine_id === routine.id)).map((h) => ({
    id: h.id,
    name: h.name,
  }));
  const available = active
    .filter((h) => h.routine_id === null)
    .map((h) => ({ id: h.id, name: h.name }));

  return (
    <div className="space-y-8">
      <PageHeader title="Editar rotina" backHref="/routines" />
      <RoutineForm routine={routine} />
      <RoutineHabits routineId={routine.id} members={members} available={available} />
    </div>
  );
}
