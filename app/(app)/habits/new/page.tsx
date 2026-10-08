import { requireUser } from "@/lib/auth";
import { getOrCreateProfile, hasSchemaV2 } from "@/lib/data/profile";
import { getRoutines } from "@/lib/data/routines";
import { getPillars } from "@/lib/data/pillars";
import { todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/layout/PageHeader";
import { HabitForm } from "@/components/habits/HabitForm";

export default async function NewHabitPage() {
  const { supabase, user } = await requireUser();
  const [profile, pillars, routines] = await Promise.all([
    getOrCreateProfile(supabase, user.id),
    getPillars(supabase),
    getRoutines(supabase),
  ]);

  return (
    <div>
      <PageHeader title="Novo hábito" backHref="/habits" />
      <HabitForm
        pillars={pillars}
        today={todayISO(profile.timezone)}
        schemaV2={hasSchemaV2(profile)}
        routines={routines}
      />
    </div>
  );
}
